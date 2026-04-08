const gallery = document.getElementById('gallery');
const cards = Array.from(gallery.querySelectorAll('.slap-card'));
const filterSelects = document.querySelectorAll('[data-filter]');
const sortSelect = document.getElementById('sort-select');
const sortOrder = document.getElementById('sort-order');
const searchInput = document.getElementById('search-input');
const resetBtn = document.getElementById('reset-btn');
const resultCount = document.getElementById('result-count');

const filterMap = {
  '_size': 'data-size_display',
  '#_of_slaps': 'data-#_of_slaps',
  '2d_point_group_(entire_piece)': 'data-2d_point_group',
  'substrate_orientation': 'data-substrate_orientation',
  'substrate': 'data-substrate',
  'substrate_color': 'data-substrate_color',
  'border_color': 'data-border_color',
  'laminate': 'data-laminate',
  'pattern': 'data-pattern',
  'pattern_orientation': 'data-pattern_orientation',
  'flag_orientation': 'data-flag_orientation',
  'spin': 'data-spin',
  'shape': 'data-shape',
  'flag_version': 'data-flag_version',
  'recipient': 'data-recipient',
};

function cardMatches(card, filters, query) {
  for (const [key, val] of Object.entries(filters)) {
    const attr = filterMap[key];
    if (key === 'recipient') {
      const hasRecipient = !!card.getAttribute('data-recipient');
      if (val === 'has' && !hasRecipient) return false;
      if (val === 'no' && hasRecipient) return false;
    } else {
      if (card.getAttribute(attr) !== val) return false;
    }
  }
  if (query && !card.getAttribute('data-search').includes(query)) return false;
  return true;
}

var currentPage = 1;
var PAGE_SIZE = 60;

function renderPagination(total, totalPages) {
  var html = '';
  if (totalPages > 1) {
    html += '<button class="page-btn"' + (currentPage === 1 ? ' disabled' : '') + ' onclick="goPage(' + (currentPage - 1) + ')">\u2039</button>';
    for (var p = 1; p <= totalPages; p++) {
      var near = Math.abs(p - currentPage) <= 2;
      var edge = p === 1 || p === totalPages;
      if (near || edge) {
        html += '<button class="page-btn' + (p === currentPage ? ' page-active' : '') + '" onclick="goPage(' + p + ')">' + p + '</button>';
      } else if (Math.abs(p - currentPage) === 3) {
        html += '<span class="page-ellipsis">\u2026</span>';
      }
    }
    html += '<button class="page-btn"' + (currentPage === totalPages ? ' disabled' : '') + ' onclick="goPage(' + (currentPage + 1) + ')">\u203a</button>';
  }
  ['pagination-top', 'pagination-bottom'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  });
}

window.goPage = function(p) {
  currentPage = p;
  applyFilters();
  updateOptionAvailability();
  document.getElementById('pagination-top').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

function applyFilters() {
  const activeFilters = {};
  filterSelects.forEach(sel => {
    if (sel.value) activeFilters[sel.dataset.filter] = sel.value;
  });
  const query = searchInput.value.toLowerCase().trim();

  const orderedCards = Array.from(gallery.querySelectorAll('.slap-card'));
  const matching = orderedCards.filter(card => cardMatches(card, activeFilters, query));
  const totalPages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;

  orderedCards.forEach(card => card.classList.add('hidden'));
  matching.forEach((card, i) => card.classList.toggle('hidden', i < start || i >= end));

  const visible = matching.length;
  var pct = cards.length ? parseFloat((visible / cards.length * 100).toPrecision(2)) : 0;
  resultCount.innerHTML = '<span class="count-num">' + visible + '</span><span class="count-label"> of ' + cards.length + ' (</span><span class="count-num">' + pct + '%</span><span class="count-label">)</span>';
  renderPagination(visible, totalPages);
}

function updateOptionAvailability() {
  const activeFilters = {};
  filterSelects.forEach(sel => {
    if (sel.value) activeFilters[sel.dataset.filter] = sel.value;
  });
  const query = searchInput.value.toLowerCase().trim();
  filterSelects.forEach(sel => {
    const key = sel.dataset.filter;
    Array.from(sel.options).forEach(opt => {
      if (!opt.value) return;
      const testFilters = Object.assign({}, activeFilters, { [key]: opt.value });
      const count = cards.filter(c => cardMatches(c, testFilters, query)).length;
      opt.disabled = count === 0;
    });
  });
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

function update() { applySort(); applyFilters(); updateOptionAvailability(); }

function updateSelectStyles() {
  const anyActive = Array.from(filterSelects).some(sel => sel.value !== '');
  filterSelects.forEach(sel => sel.classList.toggle('filter-active', sel.value !== ''));
  resetBtn.classList.toggle('filter-active', anyActive || searchInput.value.trim() !== '');
}
filterSelects.forEach(sel => sel.addEventListener('change', () => { currentPage = 1; updateSelectStyles(); update(); }));
sortSelect.addEventListener('change', () => { currentPage = 1; update(); });
sortOrder.addEventListener('change', () => { currentPage = 1; update(); });
searchInput.addEventListener('input', () => { currentPage = 1; updateSelectStyles(); update(); });
resetBtn.addEventListener('click', () => {
  currentPage = 1;
  filterSelects.forEach(sel => { sel.value = ''; sel.classList.remove('filter-active'); });
  resetBtn.classList.remove('filter-active');
  searchInput.value = '';
  sortSelect.value = 'slap_#';
  sortOrder.value = 'asc';
  update();
});

update();

// Compact toggle
const compactToggle = document.getElementById('compact-toggle');
compactToggle.addEventListener('change', () => {
  gallery.classList.toggle('compact', compactToggle.checked);
});

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
  window.location.hash = 'slap-' + (data.slapNum || index);
  var notes = (data.display['Notes'] || '').toLowerCase();
  lightboxImgContainer.classList.toggle('has-cat', /hubert|cat/.test(notes));

  if (isNav) {
    lightboxImgContainer.classList.add('lightbox-fade');
    lightboxGrid.classList.add('lightbox-fade');
  }

  var imgHtml = data.image
    ? '<img class="lightbox-image" src="' + data.image + '" alt="SLAP ' + data.slapNum + '" onerror="this.outerHTML=\'<div class=lightbox-no-image>No image</div>\'">'
    : '<div class="lightbox-no-image">No image</div>';

  if (data.image && isNav) {
    var preload = new Image();
    var onImageReady = function() {
      lightboxImgContainer.innerHTML = imgHtml;
      requestAnimationFrame(function() { lightboxImgContainer.classList.remove('lightbox-fade'); });
    };
    preload.onload = onImageReady;
    preload.onerror = onImageReady;
    preload.src = data.image;
  } else {
    lightboxImgContainer.innerHTML = imgHtml;
    if (isNav) requestAnimationFrame(function() { lightboxImgContainer.classList.remove('lightbox-fade'); });
  }

  lightboxTitle.innerHTML = '<span class="label-light">SLAP</span> <span class="num-bold">' + (data.slapNum || '?') + '</span>';

  var sections = [
    { title: 'Owner', fields: ['Owner', 'Date', 'Price', 'Note'], condition: function(d) { return !!d.display['Owner']; }, dark: true },
    { title: null, fields: ['Date', 'Signature'] },
    { title: 'Surface', fields: ['Size', 'Orientation', 'Material', 'Color', 'Border', 'Laminate'] },
    { title: 'Design', fields: ['Stickers', 'Symmetry', 'Pattern', 'Pattern Orientation', 'Flag Orientation', 'Spin', 'Shape', 'Flag Version'] },
    { title: 'Rarity', fields: ['Rank', 'Percentile'] },
    { title: null, fields: ['Notes'] },
  ];

  var html = '';
  for (var s = 0; s < sections.length; s++) {
    var section = sections[s];
    if (section.condition && !section.condition(data)) continue;
    var sectionHtml = '';
    for (var f = 0; f < section.fields.length; f++) {
      var label = section.fields[f];
      var val = data.display[label];
      if (!val) continue;
      var cls = 'meta-tag';
      if (section.dark) cls += ' meta-tag--recipient';
      if (label === 'Notes') cls += ' lightbox-notes';
      var valCls = 'meta-val';
      if (label === 'Symmetry' || label === 'Notes' || label === 'Signature') valCls += ' no-capitalize';
      var pctHtml = '';
      if (false && section.title === 'Design' && fieldStats[label] && fieldStats[label][val] != null) {
        var count = fieldStats[label][val];
        var total = slapData.length;
        var p = count / total * 100;
        var pStr = p.toPrecision(2);
        if (pStr.indexOf('e') >= 0) pStr = Math.round(p).toString();
        pctHtml = '<span class="meta-pct">count: ' + count + '  ' + pStr + '%</span>';
        cls += ' meta-tag--stats';
      }
      var inner = pctHtml
        ? '<div><span class="meta-key">' + label + ' </span><span class="' + valCls + '">' + val + '</span></div>' + pctHtml
        : '<span class="meta-key">' + label + ' </span><span class="' + valCls + '">' + val + '</span>';
      sectionHtml += '<div class="' + cls + '">' + inner + '</div>';
    }
    if (!sectionHtml) continue;
    if (s > 0) html += '<div class="chip-divider"></div>';
    if (section.title) html += '<div class="chip-section-title">' + section.title + '</div>';
    html += sectionHtml;
  }
  lightboxGrid.innerHTML = html;
  if (isNav) requestAnimationFrame(function() { lightboxGrid.classList.remove('lightbox-fade'); });

  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
  window.location.hash = '';
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

// Magnifier (desktop only)
(function() {
  var lens = document.createElement('div');
  lens.className = 'magnifier-lens';
  var cat = document.createElement('span');
  cat.className = 'loupe-cat';
  cat.textContent = '\uD83D\uDC08\u200D\u2B1B';
  lens.appendChild(cat);
  var ZOOM = 2.5;
  var SIZE = 260;
  var cachedImg = null;

  function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  lightboxImgContainer.addEventListener('mouseenter', function() {
    if (isTouchDevice()) return;
    cachedImg = lightboxImgContainer.querySelector('.lightbox-image');
    if (!cachedImg) return;
    lens.style.width = SIZE + 'px';
    lens.style.height = SIZE + 'px';
    lens.style.backgroundImage = 'url(' + cachedImg.src + ')';
    lightboxImgContainer.appendChild(lens);
  });

  lightboxImgContainer.addEventListener('mousemove', function(e) {
    if (!cachedImg || !lens.parentNode) return;
    var rect = cachedImg.getBoundingClientRect();
    var containerRect = lightboxImgContainer.getBoundingClientRect();
    var x = (e.clientX - rect.left) / rect.width;
    var y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      lens.style.display = 'none';
      return;
    }
    lens.style.display = 'block';
    lens.style.left = e.clientX - containerRect.left - SIZE / 2 + 'px';
    lens.style.top = e.clientY - containerRect.top - SIZE / 2 + 'px';
    lens.style.backgroundSize = (rect.width * ZOOM) + 'px ' + (rect.height * ZOOM) + 'px';
    lens.style.backgroundPosition = -(x * rect.width * ZOOM - SIZE / 2) + 'px ' + -(y * rect.height * ZOOM - SIZE / 2) + 'px';
  });

  lightboxImgContainer.addEventListener('mouseleave', function() {
    if (lens.parentNode) lens.parentNode.removeChild(lens);
    cachedImg = null;
  });
})();

// Restore lightbox from URL hash on page load
(function() {
  var hash = window.location.hash;
  if (hash && hash.startsWith('#slap-')) {
    var num = hash.replace('#slap-', '');
    var index = slapData.findIndex(function(s) { return s.slapNum === num; });
    if (index === -1) index = parseInt(num);
    if (index >= 0 && slapData[index]) openLightbox(index);
  }
  document.body.style.visibility = '';
})();
