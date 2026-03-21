const fs = require('fs');

let failures = 0;

function assert(condition, msg) {
  if (!condition) {
    console.error('FAIL:', msg);
    failures++;
  } else {
    console.log('PASS:', msg);
  }
}

// Check index.html exists
assert(fs.existsSync('index.html'), 'index.html exists');

const html = fs.readFileSync('index.html', 'utf-8');

// Check it's valid-ish HTML
assert(html.includes('<!DOCTYPE html>'), 'has DOCTYPE');
assert(html.includes('</html>'), 'has closing html tag');

// Check gallery rendered with cards
const cardCount = (html.match(/class="slap-card"/g) || []).length;
assert(cardCount > 0, `has slap cards (found ${cardCount})`);
assert(cardCount > 100, `has reasonable number of cards (found ${cardCount}, expected 100+)`);

// Check key UI elements
assert(html.includes('id="gallery"'), 'has gallery container');
assert(html.includes('id="lightbox"'), 'has lightbox');
assert(html.includes('data-filter='), 'has filter controls');
assert(html.includes('id="sort-select"'), 'has sort control');
assert(html.includes('id="search-input"'), 'has search input');

// Check images are referenced
const imgCount = (html.match(/class="slap-image"/g) || []).length;
assert(imgCount > 0, `has images (found ${imgCount})`);

// Check slapData is embedded for lightbox
assert(html.includes('var slapData ='), 'has embedded slap data for lightbox');

if (failures > 0) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
} else {
  console.log(`\nAll tests passed`);
}
