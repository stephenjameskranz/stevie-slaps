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
      background: #f0f0f0;
      color: #222;
      margin: 0;
      padding: 20px;
    }
    h1 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 10px;
      color: #222;
    }
    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 10px;
    }
    .controls {
      max-width: 1400px;
      margin: 0 auto 20px;
      background: #fff;
      border: 1px solid #ddd;
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
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .filter-group select, .search-input {
      background: #fff;
      color: #222;
      border: 1px solid #ccc;
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
      color: #666;
      font-size: 0.85rem;
      margin-left: auto;
    }
    .reset-btn {
      background: #ddd;
      color: #333;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .reset-btn:hover {
      background: #ccc;
    }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .slap-card {
      background: #fafafa;
      border-radius: 12px;
      overflow: hidden;
      transition: transform 0.2s;
      padding-top: 32px;
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
      object-fit: contain;
      object-position: center;
      background: #fafafa;
      padding: 32px 12px 12px;
    }
    .slap-info {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .slap-title {
      font-weight: 600;
      color: #222;
    }
    .slap-meta {
      font-size: 0.85rem;
      color: #666;
    }
    .slap-meta span {
      display: inline-block;
      background: #eee;
      color: #444;
      padding: 2px 8px;
      border-radius: 4px;
      margin: 2px;
    }
    .rarity {
      color: #b8860b;
      font-weight: 600;
    }
    .no-image {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #eee;
      color: #999;
      aspect-ratio: 1;
    }
    .slap-card { cursor: pointer; }

    /* Lightbox */
    .lightbox-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(255,255,255,0.95);
      z-index: 1000;
      overflow-y: auto;
      padding: 20px;
    }
    .lightbox-overlay.active { display: flex; justify-content: center; align-items: flex-start; }
    .lightbox {
      background: #fafafa;
      border-radius: 16px;
      max-width: 95vw;
      width: 100%;
      margin: 20px auto;
      overflow: hidden;
      position: relative;
      display: flex;
    }
    .lightbox-image-side {
      flex: 1;
      min-width: 0;
    }
    .lightbox-details-side {
      width: 360px;
      flex-shrink: 0;
      overflow-y: auto;
      max-height: 90vh;
    }
    .lightbox-close {
      position: absolute;
      top: 12px;
      right: 16px;
      background: rgba(0,0,0,0.5);
      color: #fff;
      border: none;
      font-size: 1.5rem;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lightbox-close:hover { background: rgba(0,0,0,0.7); }
    .lightbox-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0,0,0,0.5);
      color: #fff;
      border: none;
      font-size: 1.5rem;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      cursor: pointer;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lightbox-nav:hover { background: rgba(0,0,0,0.7); }
    .lightbox-prev { left: 12px; }
    .lightbox-next { right: 12px; }
    .lightbox-image-wrap {
      position: relative;
      background: #eee;
      padding: 32px 0;
    }
    .lightbox-image {
      width: 100%;
      max-height: 90vh;
      object-fit: contain;
      display: block;
    }
    .lightbox-no-image {
      width: 100%;
      height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #eee;
      color: #999;
      font-size: 1.2rem;
    }
    .lightbox-details {
      padding: 24px;
    }
    .lightbox-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 16px;
      color: #222;
    }
    .lightbox-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }
    .lightbox-field {
      background: #eee;
      border-radius: 8px;
      padding: 10px 14px;
    }
    .lightbox-field-label {
      font-size: 0.7rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .lightbox-field-value {
      font-size: 0.95rem;
      color: #222;
    }
    .lightbox-rarity {
      color: #b8860b;
      font-weight: 600;
    }
    .lightbox-notes {
      grid-column: 1 / -1;
    }

    @media (max-width: 768px) {
      .filters { flex-direction: column; }
      .filter-group select { min-width: 100%; }
      h1 { font-size: 1.8rem; }
      .lightbox { flex-direction: column; margin: 10px; }
      .lightbox-details-side { width: 100%; max-height: none; }
      .lightbox-title { font-size: 1.2rem; }
      .lightbox-grid { grid-template-columns: 1fr 1fr; }
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
      <button type="button" class="reset-btn" id="reset-btn">Reset</button>
      <span class="result-count" id="result-count"></span>
    </div>
  </div>

  <div class="gallery" id="gallery">
    ${slaps.map((slap, i) => `
    <div class="slap-card"
      data-index="${i}"
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

  <!-- Lightbox -->
  <div class="lightbox-overlay" id="lightbox">
    <div class="lightbox">
      <button type="button" class="lightbox-close" id="lightbox-close">&times;</button>
      <div class="lightbox-image-side">
        <div class="lightbox-image-wrap">
          <button type="button" class="lightbox-nav lightbox-prev" id="lightbox-prev">&lsaquo;</button>
          <button type="button" class="lightbox-nav lightbox-next" id="lightbox-next">&rsaquo;</button>
          <div id="lightbox-img-container"></div>
        </div>
      </div>
      <div class="lightbox-details-side">
        <div class="lightbox-details">
          <div class="lightbox-title" id="lightbox-title"></div>
          <div class="lightbox-grid" id="lightbox-grid"></div>
        </div>
      </div>
    </div>
  </div>

  <script>
    var slapData = ${JSON.stringify(slaps.map(s => {
      const display = {};
      const fieldLabels = {
        'slap_#': 'SLAP #',
        'width_(in)': 'Width (in)',
        'height_(in)': 'Height (in)',
        'substrate_orientation': 'Substrate Orientation',
        'substrate': 'Substrate',
        'substrate_color': 'Substrate Color',
        'border_color': 'Border Color',
        'laminate': 'Laminate',
        '#_of_slaps': '# of Slaps',
        'pattern': 'Pattern',
        'pattern_orientation': 'Pattern Orientation',
        'flag_orientation': 'Flag Orientation',
        'spin': 'Spin',
        'flag_version': 'Flag Version',
        'pattern_mirror': 'Pattern Mirror',
        'piece_mirror': 'Piece Mirror',
        'point_symmetry': 'Point Symmetry',
        '2d_point_group_(entire_piece)': '2D Point Group',
        'shape': 'Shape',
        'signature': 'Signature',
        'date': 'Date',
        'notes': 'Notes',
        'rarity_index': 'Rarity Index',
        'rank': 'Rank',
        'percentile': 'Percentile',
        'recipient': 'Recipient',
        'transfer_date': 'Transfer Date',
        'transfer_price': 'Transfer Price',
        'transfer_note': 'Transfer Note',
        'location': 'Location',
      };
      for (const [key, label] of Object.entries(fieldLabels)) {
        if (s[key]) display[label] = s[key];
      }
      return { display, image: s.image_link || '', title: `SLAP #${s['slap_#'] || '?'} - ${s['width_(in)']}″ x ${s['height_(in)']}″ ${s.substrate || ''}` };
    }))};
  </script>

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

    // Lightbox
    const lightbox = document.getElementById('lightbox');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxGrid = document.getElementById('lightbox-grid');
    const lightboxImgContainer = document.getElementById('lightbox-img-container');
    let currentIndex = -1;

    function getVisibleCards() {
      return cards.filter(c => !c.classList.contains('hidden'));
    }

    function openLightbox(index) {
      const data = slapData[index];
      if (!data) return;
      currentIndex = index;

      lightboxImgContainer.innerHTML = data.image
        ? '<img class="lightbox-image" src="' + data.image + '" alt="' + data.title + '" onerror="this.outerHTML=\\'<div class=lightbox-no-image>No image</div>\\'">'
        : '<div class="lightbox-no-image">No image</div>';

      lightboxTitle.textContent = data.title;

      var html = '';
      for (var label in data.display) {
        var val = data.display[label];
        var cls = 'lightbox-field';
        if (label === 'Notes') cls += ' lightbox-notes';
        var valCls = 'lightbox-field-value';
        if (label === 'Rarity Index') valCls += ' lightbox-rarity';
        html += '<div class="' + cls + '"><div class="lightbox-field-label">' + label + '</div><div class="' + valCls + '">' + val + '</div></div>';
      }
      lightboxGrid.innerHTML = html;

      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
      currentIndex = -1;
    }

    function navigateLightbox(dir) {
      var visible = getVisibleCards();
      if (visible.length === 0) return;
      var curPos = visible.findIndex(c => parseInt(c.dataset.index) === currentIndex);
      var nextPos = curPos + dir;
      if (nextPos < 0) nextPos = visible.length - 1;
      if (nextPos >= visible.length) nextPos = 0;
      openLightbox(parseInt(visible[nextPos].dataset.index));
    }

    gallery.addEventListener('click', function(e) {
      var card = e.target.closest('.slap-card');
      if (card) openLightbox(parseInt(card.dataset.index));
    });

    document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
    document.getElementById('lightbox-prev').addEventListener('click', function() { navigateLightbox(-1); });
    document.getElementById('lightbox-next').addEventListener('click', function() { navigateLightbox(1); });

    lightbox.addEventListener('click', function(e) {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', function(e) {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
      if (e.key === 'ArrowRight') navigateLightbox(1);
    });
  </script>
</body>
</html>`;

  fs.writeFileSync('index.html', html);
  console.log('Built index.html');
}

build().catch(console.error);
