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
      margin-bottom: 30px;
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
  </style>
</head>
<body>
  <h1>SLAP Collection</h1>
  <p class="subtitle">${slaps.length} hand-stamped art pieces</p>

  <div class="gallery">
    ${slaps.map(slap => `
    <div class="slap-card">
      ${slap.image_link
        ? `<img class="slap-image" src="${slap.image_link}" alt="SLAP" loading="lazy" onerror="this.outerHTML='<div class=no-image>No image</div>'">`
        : '<div class="no-image">No image</div>'
      }
      <div class="slap-info">
        <div class="slap-title">${slap['width_(in)']}" x ${slap['height_(in)']}" ${slap.substrate || ''}</div>
        <div class="slap-meta">
          ${slap.pattern ? `<span>${slap.pattern}</span>` : ''}
          ${slap.substrate_color ? `<span>${slap.substrate_color}</span>` : ''}
          ${slap.point_symmetry ? `<span>${slap.point_symmetry}</span>` : ''}
          ${slap['2d_point_group_(entire_piece)'] ? `<span>${slap['2d_point_group_(entire_piece)']}</span>` : ''}
        </div>
        ${slap.rarity_index ? `<div class="rarity">Rarity: ${slap.rarity_index}</div>` : ''}
        ${slap.date ? `<div class="slap-meta">${slap.date}</div>` : ''}
      </div>
    </div>
    `).join('')}
  </div>
</body>
</html>`;

  fs.writeFileSync('index.html', html);
  console.log('Built index.html');
}

build().catch(console.error);
