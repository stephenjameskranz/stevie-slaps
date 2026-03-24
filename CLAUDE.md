# Stevie Slaps

Gallery site for 638+ hand-stamped art pieces (SLAPs). Static HTML generated from Google Sheets data.

## Commands

- `npm test` — full CI: build + lint + validate + smoke
- `npm run build` — fetch spreadsheet CSV, generate `index.html`
- `npm run lint` — ESLint on `build.js`, `ci-test.js`, `app.js`
- `npm run validate` — HTML validation on `index.html`
- `npm run smoke` — structural smoke tests on generated HTML

## Architecture

- **`build.js`** — Node script that fetches CSV from Google Sheets, generates `index.html` with inline `slapData` JSON
- **`app.js`** — Client-side JS: filters, sort, search, lightbox, magnifier, URL hash persistence
- **`styles.css`** — All styles; shared typography classes used by both card and lightbox views
- **`index.html`** — Generated file (do not edit directly)

## Key Conventions

### CSS
- All colors, radii, spacing, and fonts go through `:root` CSS variables
- Shared typography classes (`.meta-tag`, `.meta-key`, `.meta-val`, `.title-display`) are global — used identically in gallery cards and lightbox. Do not duplicate or add view-specific overrides.
- `.lightbox-close` and `.lightbox-nav` share a consolidated base rule — only size/position differ
- Responsive breakpoints: 1024px (column layout) and 768px (full-page lightbox)

### JS
- `slapData` is inlined in HTML by `build.js` and declared as a global in ESLint config
- Cards use `800px_image_link` for thumbnails; lightbox uses `image_link` for full-size
- Lightbox state persists via URL hash (`#slap-N`)
- Magnifier caches DOM refs on mouseenter, clears on mouseleave — no per-mousemove queries

### Deploy
- GitHub Actions CI builds then deploys to GitHub Pages
- Deploy copies `index.html`, `styles.css`, and `app.js` to `_site/`
