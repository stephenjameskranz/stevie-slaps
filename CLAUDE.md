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
- Responsive breakpoints: 1024px (column layout, opaque bg) and 768px (full-page lightbox)

### JS
- `slapData` is inlined in HTML by `build.js` and declared as a global in ESLint config
- Cards use `800px_image_link` for thumbnails; lightbox uses `image_link` for full-size
- Lightbox state persists via URL hash (`#slap-N`)
- Magnifier caches DOM refs on mouseenter, clears on mouseleave — no per-mousemove queries

### Deploy
- GitHub Actions CI builds then deploys to GitHub Pages
- Deploy copies `index.html`, `styles.css`, and `app.js` to `_site/`

## Updating the Spreadsheet

The site pulls data from [this Google Sheet](https://docs.google.com/spreadsheets/d/1uFnL7PCsyQNYdPjWsYxMRKCf41ELH67EIc7Zvfb7ElM/edit#gid=906223522). To update content:

1. **Edit the spreadsheet** — add/edit rows, update images, notes, etc.
2. **Trigger a rebuild** — pick one:
   - **Automatic**: the site rebuilds every 6 hours via cron
   - **Manual**: go to [Actions → Build SLAP Gallery](https://github.com/stephenjameskranz/stevie-slaps/actions/workflows/build.yml), click **Run workflow**
   - **Local**: run `npm run build` to regenerate `index.html` from the latest spreadsheet data
3. **Verify the build** — check that the GitHub Actions run passes (green check):
   - CI runs: lint → build → HTML validate → smoke tests
   - Smoke tests confirm: cards rendered, correct count, gallery/lightbox/filters present, images found, slapData embedded
4. **Check the live site** — after deploy completes (~30s), hard-refresh the site to see updated data

### Testing spreadsheet changes locally

```sh
npm run build          # fetches latest CSV, generates index.html
open index.html        # preview in browser
npm run smoke          # verify structure (638+ cards, images, slapData)
npm test               # full CI: lint + build + validate + smoke
```

### Common spreadsheet issues
- **New SLAP not showing?** — it needs a `width_(in)` or `height_(in)` value; rows without both are filtered out
- **Image not loading?** — check the `image_link` and `800px_image_link` columns have valid URLs
- **Filter option missing?** — filter dropdowns are auto-generated from unique values in the spreadsheet; add the value to the relevant column and rebuild
