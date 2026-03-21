const fs = require('fs');

// Your SLAP spreadsheet
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1uFnL7PCsyQNYdPjWsYxMRKCf41ELH67EIc7Zvfb7ElM/export?format=csv&gid=906223522';

async function build() {
  console.log('Fetching spreadsheet data...');
  const response = await fetch(SHEET_URL);
  const csvText = await response.text();

  // Parse CSV (handles quoted fields with commas)
  function parseCSV(text) {
    const rows = [];
    let current = '';
    let inQuotes = false;
    let row = [];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (current || row.length > 0) {
          row.push(current.trim());
          if (row.some(cell => cell)) rows.push(row);
          row = [];
          current = '';
        }
      } else {
        current += char;
      }
    }
    if (current || row.length > 0) {
      row.push(current.trim());
      if (row.some(cell => cell)) rows.push(row);
    }
    return rows;
  }

  const rows = parseCSV(csvText);
  const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, '_'));

  const slaps = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] || '';
    });
    return obj;
  }).filter(slap => slap['width_(in)'] || slap['height_(in)']);

  console.log(`Found ${slaps.length} SLAPs`);

  // Extract unique values for filter dropdowns
  function uniqueValues(key) {
    return [...new Set(slaps.map(s => s[key]).filter(Boolean))].sort();
  }

  const filterFields = [
    { key: '#_of_slaps', label: '# of Slaps' },
    { key: '2d_point_group_(entire_piece)', label: '2D Point Group' },
    { key: 'substrate', label: 'Substrate' },
    { key: 'substrate_color', label: 'Color' },
    { key: 'pattern', label: 'Pattern' },
    { key: 'shape', label: 'Shape' },
  ];

  const filterOptions = {};
  filterFields.forEach(f => {
    filterOptions[f.key] = uniqueValues(f.key);
  });

  // Build the HTML gallery
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SLAP Collection</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a1a;
      color: #fff;
      margin: 0;
      padding: 20px;
    }
    h1 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 10px;
    }
    .subtitle {
      text-align: center;
      color: #888;
      margin-bottom: 10px;
    }
    .controls {
      max-width: 1400px;
      margin: 0 auto 20px;
      background: #2a2a2a;
      border-radius: 12px;
      padding: 16px;
    }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin-bottom: 12px;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .filter-group label {
      font-size: 0.75rem;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .filter-group select, .search-input {
      background: #3a3a3a;
      color: #fff;
      border: 1px solid #555;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 0.9rem;
      min-width: 140px;
    }
    .filter-group select:focus, .search-input:focus {
      outline: none;
      border-color: #888;
    }
    .sort-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    .search-group {
      flex: 1;
      min-width: 200px;
    }
    .search-input {
      width: 100%;
    }
    .result-count {
      color: #888;
      font-size: 0.85rem;
      margin-left: auto;
    }
    .reset-btn {
      background: #555;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .reset-btn:hover {
      background: #666;
    }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .slap-card {
      background: #2a2a2a;
      border-radius: 12px;
      overflow: hidden;
      transition: transform 0.2s;
    }
    .slap-card:hover {
      transform: translateY(-4px);
    }
    .slap-card.hidden {
      display: none;
    }
    .slap-image {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      background: #333;
    }
    .slap-info {
      padding: 15px;
    }
    .slap-title {
      font-weight: 600;
      margin-bottom: 8px;
    }
    .slap-meta {
      font-size: 0.85rem;
      color: #aaa;
    }
    .slap-meta span {
      display: inline-block;
      background: #3a3a3a;
      padding: 2px 8px;
      border-radius: 4px;
      margin: 2px;
    }
    .rarity {
      color: #ffd700;
      font-weight: 600;
    }
    .no-image {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #333;
      color: #666;
      aspect-ratio: 1;
    }
    @media (max-width: 600px) {
      .filters { flex-direction: column; }
      .filter-group select { min-width: 100%; }
      h1 { font-size: 1.8rem; }
    }
  </style>
</head>
<body>
  <h1>SLAP Collection</h1>
  <p class="subtitle">${slaps.length} hand-stamped art pieces</p>

  <div class="controls">
    <div class="filters">
      ${filterFields.map(f => `
      <div class="filter-group">
        <label>${f.label}</label>
        <select data-filter="${f.key}">
          <option value="">All</option>
          ${filterOptions[f.key].map(v => `<option value="${v}">${v}</option>`).join('')}
        </select>
      </div>
      `).join('')}
    </div>
    <div class="sort-row">
      <div class="filter-group">
        <label>Sort by</label>
        <select id="sort-select">
          <option value="slap_#">SLAP #</option>
          <option value="rarity_index">Rarity</option>
          <option value="date">Date</option>
          <option value="size">Size</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Order</label>
        <select id="sort-order">
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>
      <div class="filter-group search-group">
        <label>Search</label>
        <input type="text" class="search-input" id="search-input" placeholder="Search SLAP #, notes...">
      </div>
      <button class="reset-btn" id="reset-btn">Reset</button>
      <span class="result-count" id="result-count"></span>
    </div>
  </div>

  <div class="gallery" id="gallery">
    ${slaps.map(slap => `
    <div class="slap-card"
      data-slap_num="${slap['slap_#'] || ''}"
      data-#_of_slaps="${slap['#_of_slaps'] || ''}"
      data-2d_point_group="${slap['2d_point_group_(entire_piece)'] || ''}"
      data-substrate="${slap.substrate || ''}"
      data-substrate_color="${slap.substrate_color || ''}"
      data-pattern="${slap.pattern || ''}"
      data-shape="${slap.shape || ''}"
      data-rarity="${slap.rarity_index || ''}"
      data-date="${slap['date_(mdy)'] || slap.date || ''}"
      data-width="${slap['width_(in)'] || ''}"
      data-height="${slap['height_(in)'] || ''}"
      data-search="${[slap['slap_#'], slap.notes, slap.pattern, slap.substrate, slap.substrate_color, slap.shape, slap['2d_point_group_(entire_piece)']].join(' ').toLowerCase()}"
    >
      ${slap.image_link
        ? `<img class="slap-image" src="${slap.image_link}" alt="SLAP ${slap['slap_#'] || ''}" loading="lazy" onerror="this.outerHTML='<div class=no-image>No image</div>'">`
        : '<div class="no-image">No image</div>'
      }
      <div class="slap-info">
        <div class="slap-title">${slap['slap_#'] ? `#${slap['slap_#']} - ` : ''}${slap['width_(in)']}" x ${slap['height_(in)']}" ${slap.substrate || ''}</div>
        <div class="slap-meta">
          ${slap['#_of_slaps'] ? `<span>${slap['#_of_slaps']} slap${slap['#_of_slaps'] !== '1' ? 's' : ''}</span>` : ''}
          ${slap['2d_point_group_(entire_piece)'] ? `<span>${slap['2d_point_group_(entire_piece)']}</span>` : ''}
          ${slap.pattern ? `<span>${slap.pattern}</span>` : ''}
          ${slap.substrate_color ? `<span>${slap.substrate_color}</span>` : ''}
          ${slap.shape ? `<span>${slap.shape}</span>` : ''}
        </div>
        ${slap.rarity_index ? `<div class="rarity">Rarity: ${slap.rarity_index}</div>` : ''}
        ${slap.date ? `<div class="slap-meta">${slap.date}</div>` : ''}
      </div>
    </div>
    `).join('')}
  </div>

  <script>
    const gallery = document.getElementById('gallery');
    const cards = Array.from(gallery.querySelectorAll('.slap-card'));
    const filterSelects = document.querySelectorAll('[data-filter]');
    const sortSelect = document.getElementById('sort-select');
    const sortOrder = document.getElementById('sort-order');
    const searchInput = document.getElementById('search-input');
    const resetBtn = document.getElementById('reset-btn');
    const resultCount = document.getElementById('result-count');

    const filterMap = {
      '#_of_slaps': 'data-#_of_slaps',
      '2d_point_group_(entire_piece)': 'data-2d_point_group',
      'substrate': 'data-substrate',
      'substrate_color': 'data-substrate_color',
      'pattern': 'data-pattern',
      'shape': 'data-shape',
    };

    function applyFilters() {
      const activeFilters = {};
      filterSelects.forEach(sel => {
        if (sel.value) activeFilters[sel.dataset.filter] = sel.value;
      });
      const query = searchInput.value.toLowerCase().trim();

      let visible = 0;
      cards.forEach(card => {
        let show = true;
        for (const [key, val] of Object.entries(activeFilters)) {
          const attr = filterMap[key];
          if (card.getAttribute(attr) !== val) { show = false; break; }
        }
        if (show && query) {
          show = card.getAttribute('data-search').includes(query);
        }
        card.classList.toggle('hidden', !show);
        if (show) visible++;
      });
      resultCount.textContent = visible + ' of ' + cards.length;
    }

    function applySort() {
      const key = sortSelect.value;
      const asc = sortOrder.value === 'asc';

      const sorted = [...cards].sort((a, b) => {
        let aVal, bVal;
        if (key === 'slap_#') {
          aVal = parseInt(a.getAttribute('data-slap_num')) || 0;
          bVal = parseInt(b.getAttribute('data-slap_num')) || 0;
        } else if (key === 'rarity_index') {
          aVal = parseFloat(a.getAttribute('data-rarity')) || 0;
          bVal = parseFloat(b.getAttribute('data-rarity')) || 0;
        } else if (key === 'date') {
          aVal = new Date(a.getAttribute('data-date') || '1970-01-01').getTime();
          bVal = new Date(b.getAttribute('data-date') || '1970-01-01').getTime();
        } else if (key === 'size') {
          aVal = (parseFloat(a.getAttribute('data-width')) || 0) * (parseFloat(a.getAttribute('data-height')) || 0);
          bVal = (parseFloat(b.getAttribute('data-width')) || 0) * (parseFloat(b.getAttribute('data-height')) || 0);
        }
        return asc ? aVal - bVal : bVal - aVal;
      });

      sorted.forEach(card => gallery.appendChild(card));
    }

    function update() { applyFilters(); applySort(); }

    filterSelects.forEach(sel => sel.addEventListener('change', update));
    sortSelect.addEventListener('change', update);
    sortOrder.addEventListener('change', update);
    searchInput.addEventListener('input', update);
    resetBtn.addEventListener('click', () => {
      filterSelects.forEach(sel => sel.value = '');
      searchInput.value = '';
      sortSelect.value = 'slap_#';
      sortOrder.value = 'asc';
      update();
    });

    update();
  </script>
</body>
</html>`;

  fs.writeFileSync('index.html', html);
  console.log('Built index.html');
}

build().catch(console.error);
