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
  var isNav = currentIndex !== -1;
  currentIndex = index;
  history.replaceState(null, '', '#slap-' + index);

  if (isNav) {
    lightboxImgContainer.style.opacity = '0';
    lightboxGrid.style.opacity = '0';
  }

  var imgHtml = data.image
    ? '<img class="lightbox-image" src="' + data.image + '" alt="SLAP ' + data.slapNum + '" onerror="this.outerHTML=\'<div class=lightbox-no-image>No image</div>\'">'
    : '<div class="lightbox-no-image">No image</div>';

  if (data.image && isNav) {
    var preload = new Image();
    preload.onload = function() {
      lightboxImgContainer.innerHTML = imgHtml;
      requestAnimationFrame(function() { lightboxImgContainer.style.opacity = '1'; });
    };
    preload.onerror = function() {
      lightboxImgContainer.innerHTML = imgHtml;
      requestAnimationFrame(function() { lightboxImgContainer.style.opacity = '1'; });
    };
    preload.src = data.image;
  } else {
    lightboxImgContainer.innerHTML = imgHtml;
    if (isNav) requestAnimationFrame(function() { lightboxImgContainer.style.opacity = '1'; });
  }

  lightboxTitle.innerHTML = '<span class="label-light">SLAP</span> <span class="num-bold">' + (data.slapNum || '?') + '</span>';

  var sections = [
    { title: null, fields: ['Date', 'Signature'] },
    { title: 'Substrate', fields: ['Size', 'Orientation', 'Material', 'Color', 'Border', 'Laminate'] },
    { title: 'Design', fields: ['Stickers', 'Pattern', 'Pattern Orientation', 'Flag Orientation', 'Spin', '2D Point Group', 'Shape', 'Flag Version'] },
    { title: 'Rarity', fields: ['Rank', 'Rarity Percentile', 'Rarity Index'] },
    { title: null, fields: ['Notes'] },
  ];

  var html = '';
  for (var s = 0; s < sections.length; s++) {
    var section = sections[s];
    var sectionHtml = '';
    for (var f = 0; f < section.fields.length; f++) {
      var label = section.fields[f];
      var val = data.display[label];
      if (!val) continue;
      var cls = 'meta-tag';
      if (label === 'Notes') cls += ' lightbox-notes';
      var valCls = 'meta-val';
      if (label === '2D Point Group' || label === 'Notes') valCls += ' no-capitalize';
      sectionHtml += '<div class="' + cls + '"><span class="meta-key">' + label + ' </span><span class="' + valCls + '">' + val + '</span></div>';
    }
    if (!sectionHtml) continue;
    if (s > 0) html += '<div class="chip-divider"></div>';
    if (section.title) html += '<div class="chip-section-title">' + section.title + '</div>';
    html += sectionHtml;
  }
  lightboxGrid.innerHTML = html;
  if (isNav) requestAnimationFrame(function() { lightboxGrid.style.opacity = '1'; });

  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
  history.replaceState(null, '', window.location.pathname);
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

// Restore lightbox from URL hash on page load
(function() {
  var hash = window.location.hash;
  if (hash && hash.startsWith('#slap-')) {
    var index = parseInt(hash.replace('#slap-', ''));
    if (!isNaN(index) && slapData[index]) openLightbox(index);
  }
})();
