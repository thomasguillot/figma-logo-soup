# Logo Soup

A Figma plugin that solves the "logo soup" problem: take a pile of logos with wildly different shapes and sizes and arrange them so they look **visually balanced** together — no single logo dominating, none looking tiny.

It ports the sizing math from [sanity-labs/logo-soup](https://github.com/sanity-labs/logo-soup) into Figma, measuring each logo's actual artwork (not its bounding box) and rescaling the real nodes in place.

## What it does

Select two or more logos on the canvas, run the plugin, tune the controls, and hit **Apply**. The plugin rescales each selected node and arranges the group, leaving your original artwork intact (it only changes size and position).

### Controls

- **Base size** — the overall target size everything is normalized around.
- **Balance** — the core knob (Dan Paquette's technique). `0` = uniform widths, `1` = uniform heights, `0.5` = equal visual area. Lower it to pull very wide logos and chunky logos closer in size.
- **Gap** — spacing between logos.
- **Density compensation** — scales dense/bold logos down and light/thin logos up so they feel evenly weighted. Also corrects for the irradiation illusion on dark backgrounds.
- **Keep canvas order** — arranges logos in the order they appear on your canvas (reading order: top-to-bottom rows, left-to-right within a row) instead of Figma's layer/z-order. On by default.
- **Wrap into rows** — off by default (everything on one line). Enable it to reveal a **Wrap width** slider and wrap the soup into multiple rows.

Each slider has an editable number field — drag or type an exact value. The panel matches your Figma light/dark theme.

> **Note on balance:** logos with extreme aspect-ratio spread (e.g. a 2.6:1 mark next to a 13:1 wordmark) can still look uneven at any single Balance value — equal *area* isn't the same as equal *perceived size*. That's inherent to the algorithm, not a bug. Lowering Balance toward ~0.3 tightens the spread.

## Install (development)

This plugin isn't published to the Figma Community yet. To run it locally:

1. `npm install`
2. `npm run build` (or `npm run dev` to rebuild on change)
3. In Figma desktop: **Plugins → Development → Import plugin from manifest…** and pick this repo's `manifest.json`.
4. Select some logos and run **Plugins → Development → Logo Soup**.

## Development

```bash
npm run dev        # build dist/ and watch for changes
npm run build      # one-shot build → dist/code.js + dist/ui.html
npm run typecheck  # tsc (main + ui projects)
npm test           # vitest
```

The build is a small esbuild script (`esbuild.config.mjs`) that bundles the plugin's two entry points and inlines the UI bundle into `dist/ui.html`. `dist/` is git-ignored — build before importing into Figma.

## Project layout

| Path | Role |
|------|------|
| `src/main/` | Plugin main thread — reads the selection, exports PNGs for measurement, and rescales/repositions nodes on Apply. |
| `src/ui/` | The iframe UI — controls panel, layout, live preview, and the normalize→layout→transform pipeline. |
| `src/core/` | Sizing & measurement math, vendored from logo-soup (normalize, content-box measurement, density, visual-center). |
| `src/shared/` | Message types shared between the main thread and the UI. |

## License

[MIT](./LICENSE).

This project vendors MIT-licensed source from [sanity-labs/logo-soup](https://github.com/sanity-labs/logo-soup); see [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md) for the upstream copyright and license.
