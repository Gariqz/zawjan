# Figma import guide

The design export is generated from the production React components, so Figma frames always match what the code renders. Do not redraw screens by hand and do not edit the exported files. Change the component, then regenerate.

## 1. Generate the export

```bash
npm install
npm run playwright:install   # first time only
npm run export:figma         # builds dist-export/ and writes figma-export/
npm run export:validate      # optional: checks coverage and HTML-vs-PNG fidelity
```

If the release ZIP already contains `figma-export/`, you can skip this step.

What you get in `figma-export/`:

| Path | Contents |
| --- | --- |
| `index.html` | Gallery of every frame, grouped by team. Open it in a browser to browse. |
| `screens/<Team>/viewport/<SCREEN>__<state>__<viewport>.html` | **Device-sized frame**: exactly one screen (for example 390 × 844), as a user sees it before scrolling. Fixed chrome (bottom navigation, chat composer, development banner) sits where it does on a device; content below the fold is clipped. |
| `screens/<Team>/full/<SCREEN>__<state>__<viewport>.html` | **Full-page frame**: the same state with the frame height grown to the whole content. |
| `*.png` next to each HTML file | Pixel reference of the same frame (1x). |

Every HTML file is self-contained: inlined CSS, fonts (Plus Jakarta Sans, Playfair Display) and images, no JavaScript, no network requests.
| `manifest.json` | One entry per frame with the design.md §14.4 fields (`screenId`, `actor`, `sourceRoute`, `scenarioId`, `viewportWidth`, `viewportHeight`, `htmlPath`, `pngPath`, `snapshotTimestamp`, `notes`), plus `frameType` (`viewport` or `fullPage`), `deviceViewportHeight`, team, Inertia page name and a suggested Figma frame name (`figmaFrame`). Top-level `figmaImportStatus` is `IMPORT_NOT_VALIDATED`; `expectedFrames` is captures × 2. |
| `IMPORT_NOT_VALIDATED.md` | Reminder that no Figma import has been done yet (see below). |
| `tokens.json` | Colours, radii, shadows, typography and viewports from `tokens.css`, each marked `design.md` (source) or `implementation proposal`. |

Viewports: **mobile 390 × 844** and **desktop 1440 × 900** (the §14 reference widths), plus spot checks at **360** (small phone) and **768** (tablet) for the catalogue, the chat and the approval tracker. Each capture is exported twice, as a device-sized frame and as a full-page frame. Moderator and admin screens are desktop-primary, with 390 px fallback frames for the overview, verification queue, case review, report case, admin overview and user management.

Current size: see the summary at the top of `figma-export/index.html` and `expectedFrames` in `manifest.json`.

## 2. Import editable layers (recommended)

Use an HTML-to-Figma plugin. These steps use **html.to.design** (by divRIOTS), which turns HTML/CSS into editable Figma frames, text and auto-layout. Plugin features change, so check its current documentation if a menu differs.

Because the plugin's URL import fetches pages from its own servers, it cannot reach `localhost`. Pick one of these routes:

**A. Browser extension (works with local files)**
1. Install the html.to.design browser extension for Chrome.
2. Open a frame's HTML file directly from disk, for example `figma-export/screens/Khaslana/viewport/PAR-06__active__mobile.html`.
3. Set the browser window, or the device toolbar in DevTools, to the frame size (390 × 844 or 1440 × 900). For a `full/` file, set only the width.
4. Click the extension to capture the page, then open the html.to.design plugin in Figma and import the capture.

**B. URL import from a temporary host**
1. Upload the `figma-export/` folder to any static host you control (an internal preview bucket or a private Netlify/Vercel deploy). The files are fictional and self-contained, so no server code is needed.
2. In Figma, run html.to.design, paste the URL of a frame's `.html` file, choose the viewport width that matches the file name, and import.

After importing:
- Rename each frame with the `figmaFrame` value from `manifest.json`, for example `Khaslana / PAR-06 Ruang percakapan / Aktif — mobile screen` (device-sized) or `… — mobile full page`.
- Use `viewport/` frames for prototypes and presentations (they look like a phone or desktop screen). Use `full/` frames for design review and hand-off, where every section of a long page must be visible.
- Organise pages by team (Marinasi, BrandyKeun, Khaslana, EAAA, Shared) to mirror `resources/js/modules/`.
- Keep the PNG next to each imported frame while reviewing. If the import looks different, the PNG is the reference.

## 3. Reference-only import (fastest)

Drag the PNG files from `figma-export/screens/<Team>/viewport/` (device-sized) or `…/full/` (whole page) onto a Figma page. Each image is exactly one frame at 1x. Use this for reviews and comments when you do not need editable layers.

## 4. Tokens

`tokens.json` lists the same values that drive Tailwind. To create Figma variables, use a variables or tokens import plugin (for example Tokens Studio, or any "import variables from JSON" plugin). Keep the names as they are (`brand-primary`, `ink-muted`, `radius-card`…) so designers and developers use the same terms. Values marked `implementation proposal` still need design-team sign-off.

## 5. Updating designs

1. Change the component (or its copy in `resources/js/content/id/`).
2. If you add a screen or a state, add it to `resources/js/app/screenRegistry.ts` (`captures`: scenario, optional persona, path, and a button to click for dialogs).
3. Run `npm run export:figma && npm run export:validate`.
4. Re-import only the frames that changed. `manifest.json` keeps stable file names (`<frameType dir>/<SCREEN>__<state>__<viewport>`), so you can match them.

Faster iteration on a few screens: `node scripts/export-figma.mjs --only=PAR-06,GUA-03`. This rewrites `manifest.json` with only those frames, so run the full export before validating or sharing.

## Import status: IMPORT_NOT_VALIDATED

**No Figma import has been tested yet.** The environment that generated this export had no Figma account or HTML-to-Figma plugin, so the steps in section 2 have not been run. What *has* been checked automatically (`npm run export:validate`):

- Every screen in the registry and every §14.2 / §14.3 screen and state has both a device-sized and a full-page frame, and every device-sized frame has exactly the device height.
- Each HTML file opens from disk with JavaScript disabled and makes no network requests (fonts and images are inlined).
- Each HTML file was rendered again in Chromium and compared pixel-by-pixel with its PNG. The validator reports the largest difference on each run; see the summary printed by `npm run export:validate`. This covers the representative frames §14.6 asks for: mobile catalogue (`PAR-02__results__mobile`), mobile chat and approval (`PAR-06__active__mobile`, `PAR-05__one__mobile`) and desktop moderator review (`MOD-05__default__desktop`), in both frame types.

This shows the HTML is self-contained and faithful **in a browser**. It does not show how a plugin converts it to layers. On the first real import, try those four frames first and record here: the plugin and version, whether fonts mapped to Plus Jakarta Sans / Playfair Display, whether auto-layout and text stayed editable, and what needed manual cleanup. Expect some cleanup. Fixed elements (the bottom navigation, dialogs) and native form controls are the usual problem areas for HTML importers.

## Notes

- All content is fictional. Portraits and identity documents are labelled illustrations.
- Exported chat frames show the development notice ("Pesan tidak dienkripsi"). They do not show an end-to-end encryption claim, because none is implemented.
- The yellow "Mode pengembangan" banner appears in every frame on purpose, to show that the data is simulated. Hide that layer in Figma for presentation copies if your team agrees, but do not remove it from the code.
