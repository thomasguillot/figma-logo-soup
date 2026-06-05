import { readSelection } from "./selection";
import type { AppliedLogo, UiToMain } from "../shared/messages";

figma.showUI(__html__, { width: 360, height: 640, title: "Logo Soup", themeColors: true });

const SOUP_NAME = "Logo Soup";
let debounce: ReturnType<typeof setTimeout> | null = null;

/** The logo nodes to operate on. A selected "Logo Soup" group means: edit its children. */
function logoNodesFromSelection(): SceneNode[] {
  const sel = figma.currentPage.selection;
  if (sel.length === 1 && sel[0].type === "GROUP" && sel[0].name === SOUP_NAME) {
    return [...(sel[0] as GroupNode).children];
  }
  return [...sel];
}

async function sendSelection(): Promise<void> {
  const nodes = logoNodesFromSelection();
  if (nodes.length === 0) {
    figma.ui.postMessage({ type: "NO_SELECTION" });
    return;
  }
  const { logos, defaultWrapWidth } = await readSelection(nodes);
  figma.ui.postMessage({ type: "LOGOS_LOADED", logos, defaultWrapWidth });
}

function scheduleSelection(): void {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => void sendSelection(), 150);
}

type Rescalable = SceneNode & { rescale: (s: number) => void };

async function resolveNodes(
  results: AppliedLogo[],
): Promise<{ node: Rescalable; r: AppliedLogo }[]> {
  const out: { node: Rescalable; r: AppliedLogo }[] = [];
  for (const r of results) {
    const node = await figma.getNodeByIdAsync(r.id);
    if (node && !node.removed && "rescale" in node) {
      out.push({ node: node as Rescalable, r });
    }
  }
  return out;
}

async function applySoup(results: AppliedLogo[]): Promise<void> {
  const resolved = await resolveNodes(results);
  if (resolved.length === 0) return;
  const nodes = resolved.map((x) => x.node);

  // Group FIRST so the logos leave any parent Auto Layout's control; then transform.
  const parent0 = nodes[0].parent;
  const reuse =
    !!parent0 &&
    parent0.type === "GROUP" &&
    parent0.name === SOUP_NAME &&
    nodes.every((n) => n.parent === parent0);

  const group: GroupNode = reuse
    ? (parent0 as GroupNode)
    : figma.group(nodes, parent0 ?? figma.currentPage);
  group.name = SOUP_NAME;

  for (const { node, r } of resolved) {
    if (r.scale > 0 && Math.abs(r.scale - 1) > 1e-4) node.rescale(r.scale);
  }

  // Capture base AFTER rescale; all children share one base so relative offsets
  // exactly match the computed layout (any parent Auto Layout repositions the whole group).
  const baseX = group.x;
  const baseY = group.y;
  for (const { node, r } of resolved) {
    node.x = baseX + r.x;
    node.y = baseY + r.y;
  }

  figma.currentPage.selection = [group];
}

figma.ui.onmessage = async (msg: UiToMain) => {
  if (msg.type === "READY") {
    await sendSelection();
    return;
  }
  if (msg.type === "APPLY") {
    await applySoup(msg.results);
    figma.ui.postMessage({ type: "APPLY_DONE" });
    figma.notify(`Logo soup applied to ${msg.results.length} logo(s).`);
  }
};

figma.on("selectionchange", scheduleSelection);
