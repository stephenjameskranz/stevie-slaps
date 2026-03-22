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
    ? '<img class="lightbox-image" src="' + data.image + '" alt="' + data.title + '" onerror="this.outerHTML=\'<div class=lightbox-no-image>No image</div>\'">'
    : '<div class="lightbox-no-image">No image</div>';

  lightboxTitle.innerHTML = '<span class="label-light">SLAP</span> <span class="num-bold">' + (data.slapNum || '?') + '</span> <span class="label-light" style="font-size:0.6em">' + data.subtitle + '</span>';

  var html = '';
  for (var label in data.display) {
    var val = data.display[label];
    var cls = 'lightbox-field';
    if (label === 'Notes') cls += ' lightbox-notes';
    var valCls = 'field-value';
    if (label === 'Rarity Index') valCls += ' field-value-accent';
    html += '<div class="' + cls + '"><div class="field-label">' + label + '</div><div class="' + valCls + '">' + val + '</div></div>';
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
