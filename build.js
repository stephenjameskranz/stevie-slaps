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
  <title>SLAP Art Collection</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Ysabeau:wght@1..1000&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <script>if(window.location.hash.startsWith('#slap-')){document.body.style.visibility='hidden';setTimeout(function(){document.body.style.visibility='';},2000);}</script>
  <h1>SLAP Art Collection</h1>
  <p class="subtitle">${slaps.length} hand-made art pieces featuring the Magical Flag of Peace</p>

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
      <div class="slap-image-wrap">
      ${slap['800px_image_link'] || slap.image_link
        ? `<img class="slap-image" src="${slap['800px_image_link'] || slap.image_link}" alt="SLAP ${slap['slap_#'] || ''}" loading="lazy" decoding="async" onerror="this.outerHTML='<div class=no-image>No image</div>'">`
        : '<div class="no-image">No image</div>'
      }
      </div>
      <div class="slap-info">
        <div class="slap-title title-display">${slap['slap_#'] ? `<span class="label-light">SLAP</span> <span class="num-bold">${slap['slap_#']}</span>` : '<span class="label-light">SLAP</span>'}</div>
        <div class="slap-meta">
          ${slap['width_(in)'] && slap['height_(in)'] ? `<span class="meta-tag"><span class="meta-key">size </span><span class="meta-val">${slap['width_(in)']}" x ${slap['height_(in)']}"</span></span>` : ''}
          ${slap['#_of_slaps'] ? `<span class="meta-tag"><span class="meta-key">stickers </span><span class="meta-val">${slap['#_of_slaps']}</span></span>` : ''}
          ${slap.percentile ? `<span class="meta-tag"><span class="meta-key">rarity percentile </span><span class="meta-val">${slap.percentile}</span></span>` : ''}
        </div>
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
          <div class="lightbox-title title-display" id="lightbox-title"></div>
          <div class="lightbox-grid" id="lightbox-grid"></div>
        </div>
      </div>
    </div>
  </div>

  <script>
    var slapData = ${JSON.stringify(slaps.map(s => {
      const display = {};
      if (s['width_(in)'] && s['height_(in)']) {
        s._size = s['width_(in)'] + '" x ' + s['height_(in)'] + '"';
      }
      const fieldLabels = {
        'date': 'Date',
        'signature': 'Signature',
        '_size': 'Size',
        'substrate_orientation': 'Orientation',
        'substrate': 'Material',
        'substrate_color': 'Color',
        'border_color': 'Border',
        'laminate': 'Laminate',
        '#_of_slaps': 'Stickers',
        'pattern': 'Pattern',
        'pattern_orientation': 'Pattern Orientation',
        'flag_orientation': 'Flag Orientation',
        'spin': 'Spin',
        '2d_point_group_(entire_piece)': '2D Point Group',
        'shape': 'Shape',
        'flag_version': 'Flag Version',
        'rank': 'Rank',
        'percentile': 'Rarity Percentile',
        'rarity_index': 'Rarity Index',
        'notes': 'Notes',
      };
      for (const [key, label] of Object.entries(fieldLabels)) {
        if (s[key]) display[label] = s[key];
      }
      return { display, image: s.image_link || '', slapNum: s['slap_#'] || '?' };
    }))};
  </script>

  <script src="app.js"></script>
</body>
</html>`;

  fs.writeFileSync('index.html', html);
  console.log('Built index.html');
}

build().catch(console.error);
