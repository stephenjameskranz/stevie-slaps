const fs = require('fs');

// Your SLAP spreadsheet
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1uFnL7PCsyQNYdPjWsYxMRKCf41ELH67EIc7Zvfb7ElM/export?format=csv&gid=906223522';

// Cloudflare R2 image hosting
const R2_BASE = 'https://pub-245baa57632c4b8ab5ef3d7765e564f6.r2.dev';
function r2img(slapNum, size) {
  return slapNum ? `${R2_BASE}/${size}/SLAP_${slapNum}.jpg` : null;
}

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
  function uniqueValues(key, numeric = false) {
    const vals = [...new Set(slaps.map(s => s[key]).filter(Boolean))];
    return numeric ? vals.sort((a, b) => Number(a) - Number(b)) : vals.sort();
  }

  const symmetryMap = { 'm': '1 Mirror', 'A2-2m': '2 Mirrors', 'A1': '360°', 'A2': '180°' };
  function mapSymmetry(val) { return symmetryMap[val] || val; }
  function mapSpin(val) { return val === 'und' ? 'Undefined' : val; }
  function fmtDate(val) {
    const p = (val || '').trim().split(/\s+/);
    return (p.length === 3 && p[2].length === 4) ? p[2] + ' ' + p[1] + ' ' + p[0] : val;
  }
  function sortSpin(vals) {
    return vals.sort((a, b) => {
      if (a === 'Undefined') return 1;
      if (b === 'Undefined') return -1;
      return Number(b) - Number(a);
    });
  }
  function esc(val) { return String(val).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  const filterSections = [
    {
      title: 'Surface',
      fields: [
        { key: '_size', label: 'Size' },
        { key: 'substrate_orientation', label: 'Orientation' },
        { key: 'substrate', label: 'Material' },
        { key: 'substrate_color', label: 'Color' },
        { key: 'border_color', label: 'Border' },
        { key: 'laminate', label: 'Laminate' },
      ]
    },
    {
      title: 'Design',
      fields: [
        { key: '#_of_slaps', label: 'Stickers', numeric: true },
        { key: '2d_point_group_(entire_piece)', label: 'Symmetry' },
        { key: 'pattern', label: 'Pattern' },
        { key: 'pattern_orientation', label: 'Pattern Orientation' },
        { key: 'flag_orientation', label: 'Flag Orientation' },
        { key: 'spin', label: 'Spin' },
        { key: 'shape', label: 'Shape' },
        { key: 'flag_version', label: 'Flag Version' },
      ]
    },
    {
      title: 'Recipient',
      fields: [
        { key: 'recipient', label: 'Recipient', special: 'recipient' },
      ]
    },
  ];
  const filterFields = filterSections.flatMap(s => s.fields);

  const stickerCounts = {};
  slaps.forEach(s => { if (s['#_of_slaps']) stickerCounts[s['#_of_slaps']] = (stickerCounts[s['#_of_slaps']] || 0) + 1; });

  const designKeyToLabel = {
    '#_of_slaps': 'Stickers',
    '2d_point_group_(entire_piece)': 'Symmetry',
    'pattern': 'Pattern',
    'pattern_orientation': 'Pattern Orientation',
    'flag_orientation': 'Flag Orientation',
    'spin': 'Spin',
    'shape': 'Shape',
    'flag_version': 'Flag Version',
  };
  const rawCounts = {};
  Object.keys(designKeyToLabel).forEach(k => { rawCounts[k] = {}; });
  slaps.forEach(s => {
    Object.keys(designKeyToLabel).forEach(k => {
      let v = s[k]; if (!v) return;
      if (k === '2d_point_group_(entire_piece)') v = mapSymmetry(v);
      rawCounts[k][v] = (rawCounts[k][v] || 0) + 1;
    });
  });
  const fieldStats = {};
  Object.entries(designKeyToLabel).forEach(([k, label]) => {
    fieldStats[label] = {};
    Object.entries(rawCounts[k]).forEach(([v, n]) => { fieldStats[label][v] = n; });
  });

  const filterOptions = {};
  filterFields.forEach(f => {
    if (f.special || f.key === '_size') return;
    const vals = uniqueValues(f.key, f.numeric);
    filterOptions[f.key] = f.key === '2d_point_group_(entire_piece)' ? vals.map(mapSymmetry)
      : f.key === 'spin' ? sortSpin(vals.map(mapSpin))
      : vals;
  });
  filterOptions['_size'] = [...new Set(slaps
    .filter(s => s['width_(in)'] && s['height_(in)'])
    .map(s => s['width_(in)'] + '" x ' + s['height_(in)'] + '"')
  )].sort((a, b) => {
    const [aw, ah] = a.match(/[\d.]+/g).map(Number);
    const [bw, bh] = b.match(/[\d.]+/g).map(Number);
    return aw !== bw ? aw - bw : ah - bh;
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
      ${filterSections.map(section => `
      <div class="filter-section">
        <div class="filter-section-title">${section.title}</div>
        <div class="filter-section-fields">
          ${section.fields.map(f => `
          <div class="filter-group">
            <label>${f.label}</label>
            ${f.special === 'recipient' ? `
            <select data-filter="recipient">
              <option value="">All</option>
              <option value="has">Has recipient</option>
              <option value="no">No recipient</option>
            </select>` : `
            <select data-filter="${f.key}">
              <option value="">All</option>
              ${filterOptions[f.key].map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}
            </select>`}
          </div>`).join('')}
        </div>
      </div>`).join('')}
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
    <div class="slap-card${slap.recipient ? ' has-recipient' : ''}"
      data-index="${i}"
      data-slap_num="${slap['slap_#'] || ''}"
      data-#_of_slaps="${slap['#_of_slaps'] || ''}"
      data-2d_point_group="${mapSymmetry(slap['2d_point_group_(entire_piece)'] || '')}"
      data-size_display="${esc((slap['width_(in)'] && slap['height_(in)']) ? slap['width_(in)'] + '" x ' + slap['height_(in)'] + '"' : '')}"
      data-substrate_orientation="${slap.substrate_orientation || ''}"
      data-substrate="${slap.substrate || ''}"
      data-substrate_color="${slap.substrate_color || ''}"
      data-border_color="${slap.border_color || ''}"
      data-laminate="${slap.laminate || ''}"
      data-pattern="${slap.pattern || ''}"
      data-pattern_orientation="${slap.pattern_orientation || ''}"
      data-flag_orientation="${slap.flag_orientation || ''}"
      data-spin="${mapSpin(slap.spin || '')}"
      data-shape="${slap.shape || ''}"
      data-flag_version="${slap.flag_version || ''}"
      data-recipient="${slap.recipient || ''}"
      data-rarity="${slap.rarity_index || ''}"
      data-date="${slap['date_(mdy)'] || slap.date || ''}"
      data-width="${slap['width_(in)'] || ''}"
      data-height="${slap['height_(in)'] || ''}"
      data-search="${[slap['slap_#'], slap.notes, slap.pattern, slap.substrate, slap.substrate_color, slap.shape, slap['2d_point_group_(entire_piece)'], slap.recipient].join(' ').toLowerCase()}"
    >
      <div class="slap-image-wrap">
      ${r2img(slap['slap_#'], 'small') || slap['800px_image_link'] || slap.image_link
        ? `<img class="slap-image" src="${r2img(slap['slap_#'], 'small') || slap['800px_image_link'] || slap.image_link}" alt="SLAP ${slap['slap_#'] || ''}" loading="lazy" decoding="async" onerror="this.outerHTML='<div class=no-image>No image</div>'">`
        : '<div class="no-image">No image</div>'
      }
      </div>
      <div class="slap-info">
        <div class="slap-title title-display">${slap['slap_#'] ? `<span class="label-light">SLAP</span> <span class="num-bold">${slap['slap_#']}</span>` : '<span class="label-light">SLAP</span>'}</div>
        <div class="slap-meta">
          ${slap.recipient ? `<span class="meta-tag meta-tag--recipient"><span class="meta-key">recipient </span><span class="meta-val">${slap.recipient}</span></span>` : ''}
          ${slap.recipient
            ? `${slap.transfer_date ? `<span class="meta-tag meta-tag--recipient"><span class="meta-key">date </span><span class="meta-val">${fmtDate(slap.transfer_date)}</span></span>` : ''}
               ${slap.transfer_note ? `<span class="meta-tag meta-tag--recipient"><span class="meta-key">note </span><span class="meta-val">${slap.transfer_note}</span></span>` : ''}`
            : `${slap['width_(in)'] && slap['height_(in)'] ? `<span class="meta-tag"><span class="meta-key">size </span><span class="meta-val">${slap['width_(in)']}" x ${slap['height_(in)']}"</span></span>` : ''}
               ${slap['#_of_slaps'] ? `<span class="meta-tag"><span class="meta-key">stickers </span><span class="meta-val">${slap['#_of_slaps']}</span></span>` : ''}
               ${slap.percentile ? `<span class="meta-tag"><span class="meta-key">rarity percentile </span><span class="meta-val">${slap.percentile}</span></span>` : ''}`
          }
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
        '2d_point_group_(entire_piece)': 'Symmetry',
        'shape': 'Shape',
        'flag_version': 'Flag Version',
        'rank': 'Rank',
        'percentile': 'Percentile',
        'rarity_index': 'Rarity Index',
        'notes': 'Notes',
        'recipient': 'Recipient',
        'transfer_date': 'Transfer Date',
        'transfer_price': 'Transfer Price',
        'transfer_note': 'Note',
      };
      const dateKeys = new Set(['date', 'transfer_date']);
      for (const [key, label] of Object.entries(fieldLabels)) {
        if (s[key]) display[label] = dateKeys.has(key) ? fmtDate(s[key]) : key === '2d_point_group_(entire_piece)' ? mapSymmetry(s[key]) : key === 'spin' ? mapSpin(s[key]) : s[key];
      }
      return { display, image: r2img(s['slap_#'], 'large') || s.image_link || '', slapNum: s['slap_#'] || '?' };
    }))};
    var fieldStats = ${JSON.stringify(fieldStats)};
  </script>

  <script src="app.js"></script>
</body>
</html>`;

  fs.writeFileSync('index.html', html);
  console.log('Built index.html');
}

build().catch(console.error);
