'use strict';
// The astronaut detail page is built by a teammate. Change this one line if
// their file has a different name. Each card opens:
//   <page>?astronaut=<name>&id=<Wikidata id>
const ASTRONAUT_DETAIL_PAGE = 'astronaut-detail.html';
const detailUrl = p => `${ASTRONAUT_DETAIL_PAGE}?astronaut=${encodeURIComponent(p.name)}&id=${encodeURIComponent(p.id)}`;

const $ = id => document.getElementById(id);
const state = { people: [], filtered: [], shown: 0, pageSize: 48, loading: false };
const grid = $('grid');
const fallbackImage = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420"><rect width="640" height="420" fill="#111"/><circle cx="320" cy="180" r="72" fill="#222" stroke="#666" stroke-width="3"/><path d="M235 360 Q240 260 320 260 Q400 260 405 360" fill="#222" stroke="#666" stroke-width="3"/><text x="320" y="395" fill="#aaa" text-anchor="middle" font-family="sans-serif" font-size="18">Portrait unavailable</text></svg>');
const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const val = value => value && String(value).trim() ? String(value) : 'Not listed';
const parts = value => String(value || '').split(' | ').map(v => v.trim()).filter(Boolean);
const thumb = (url, width = 500) => { if (!url) return ''; let u = String(url).replace(/^http:\/\//, 'https://'); if (u.includes('Special:FilePath') && !/[?&]width=/.test(u)) u += (u.includes('?') ? '&' : '?') + 'width=' + width; return u; };
const yearOf = date => { const match = String(date || '').match(/^[-+]?\d{4}/); return match ? match[0] : ''; };
if ($('year')) $('year').textContent = new Date().getFullYear();

// ===== Header (same behaviour as the team's pages) =====
(function setupHeader() {
  const exploreButton = document.getElementById('exploreButton');
  const accountButton = document.getElementById('accountButton');
  if (!exploreButton || !accountButton) return;
  const exploreDropdown = exploreButton.closest('.dropdown');
  const accountDropdown = accountButton.closest('.dropdown');

  exploreButton.addEventListener('click', event => {
    event.stopPropagation();
    exploreDropdown.classList.toggle('active');
    accountDropdown.classList.remove('active');
  });
  accountButton.addEventListener('click', event => {
    event.stopPropagation();
    accountDropdown.classList.toggle('active');
    exploreDropdown.classList.remove('active');
  });
  document.addEventListener('click', () => {
    exploreDropdown.classList.remove('active');
    accountDropdown.classList.remove('active');
  });

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        const value = searchInput.value.trim();
        if (value) window.location.href = 'index.html?search=' + encodeURIComponent(value);
      }
    });
  }
})();

// ===== Large astronaut hero image =====
// The first image that loads is used. To use your own picture, save it as
// public/assets/astronaut-hero.jpg (it is tried first).
(function setupHeroImage() {
  const hero = document.querySelector('.entity-hero');
  if (!hero) return;
  const candidates = [
    'assets/astronaut-hero.jpg',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Bruce_McCandless_II_during_EVA_in_1984.jpg?width=2400',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Aldrin_Apollo_11_original.jpg?width=2000'
  ];
  (function tryNext(i) {
    if (i >= candidates.length) return;
    const probe = new Image();
    probe.onload = () => hero.style.setProperty('--hero-image', `url("${candidates[i]}")`);
    probe.onerror = () => tryNext(i + 1);
    probe.src = candidates[i];
  })(0);
})();


function uniqueSorted(values) { return [...new Set(values.map(v => String(v || '').trim()).filter(v => v && v !== 'Not listed'))].sort((a,b) => a.localeCompare(b)); }
function populateFilters() {
  const agencies = uniqueSorted(state.people.flatMap(p => parts(p.agency)));
  const roles = uniqueSorted(state.people.flatMap(p => parts(p.role)));
  $('agency').innerHTML = '<option value="all">All agencies / affiliations</option>' + agencies.map(v => `<option value="${safe(v)}">${safe(v)}</option>`).join('');
  $('role').innerHTML = '<option value="all">All occupations</option>' + roles.map(v => `<option value="${safe(v)}">${safe(v)}</option>`).join('');
}
function searchHaystack(p) { return [p.name,p.agency,p.role,p.nationality,p.mission,p.year,p.achievement,p.description,p.bio,p.birthDate,p.deathDate,p.wikidataId].join(' ').toLowerCase(); }
function applyFilters() {
  const q = $('search').value.trim().toLowerCase();
  const agency = $('agency').value, role = $('role').value, sort = $('sort').value;
  let list = state.people.filter(p => (!q || searchHaystack(p).includes(q)) && (agency === 'all' || parts(p.agency).includes(agency)) && (role === 'all' || parts(p.role).includes(role)));
  list.sort((a,b) => {
    if (sort === 'birth') return (a.birthDate || '9999').localeCompare(b.birthDate || '9999') || a.name.localeCompare(b.name);
    if (sort === 'recent') return (b.birthDate || '').localeCompare(a.birthDate || '') || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });
  state.filtered = list; state.shown = 0; grid.innerHTML = ''; renderMore();
}
function card(p) {
  const img = thumb(p.image) || fallbackImage;
  const country = val(p.nationality), role = val(p.role), birth = yearOf(p.birthDate);
  return `<a class="card" href="${safe(detailUrl(p))}" aria-label="Open the page of ${safe(p.name)}">
    <div class="photo"><img loading="lazy" src="${safe(img)}"${p.image ? '' : ` data-fill="${safe(p.id)}"`} alt="Portrait of ${safe(p.name)}" onerror="this.onerror=null;this.src='${fallbackImage}'"></div>
    <div class="card-content"><span class="tag">${safe(parts(p.agency)[0] || 'Spaceflight')}</span><h3>${safe(p.name)}</h3><p class="role">${safe(role)}</p>
      <div class="meta"><span>⚑ ${safe(country)}</span>${birth ? `<span>◷ Born ${safe(birth)}</span>` : ''}<span>↗ ${safe(p.wikidataId || p.id)}</span>${p.missionCount ? `<span>✈ ${safe(p.missionCount)} mission${p.missionCount > 1 ? 's' : ''}</span>` : ''}</div>
      <p class="achievement">${safe(p.description || 'Open the astronaut page for more details.')}</p>
      <span class="explore-link">Explore astronaut →</span></div>
  </a>`;
}
const imageQueue = [];
let imageWorkers = 0;
function fillMissingImages() {
  grid.querySelectorAll('img[data-fill]').forEach(img => {
    imageQueue.push({ id: img.dataset.fill, img });
    img.removeAttribute('data-fill');
  });
  while (imageWorkers < 4 && imageQueue.length) {
    imageWorkers++;
    (async () => {
      while (imageQueue.length) {
        const { id, img } = imageQueue.shift();
        try {
          const response = await fetch(`/api/astronauts/${encodeURIComponent(id)}/image`);
          const data = await response.json();
          if (data.image) {
            img.src = thumb(data.image);
            const person = state.people.find(p => p.id === id);
            if (person) person.image = data.image;
          }
        } catch {}
      }
      imageWorkers--;
    })();
  }
}
function renderMore() {
  const batch = state.filtered.slice(state.shown, state.shown + state.pageSize);
  grid.insertAdjacentHTML('beforeend', batch.map(card).join(''));
  state.shown += batch.length;
  $('results').textContent = state.filtered.length ? `Showing ${Math.min(state.shown, state.filtered.length)} of ${state.filtered.length} matching records · ${state.people.length} loaded` : `0 matches · ${state.people.length} records loaded`;
  $('empty').hidden = state.filtered.length !== 0;
  $('loadMore').hidden = state.shown >= state.filtered.length;
  fillMissingImages();
}
async function loadDirectory(force = false) {
  if (state.loading) return;
  state.loading = true;
  $('refresh').disabled = true;
  $('status').className = 'status'; $('status').textContent = force ? 'Refreshing astronaut records…' : 'Loading astronaut records from Wikidata…';
  try {
    const response = await fetch('/api/astronauts' + (force ? '?refresh=1' : ''));
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Directory request failed.');
    const refreshBlocked = force && payload.refreshed === false;
    state.people = payload.people || [];
    $('total').textContent = Number(payload.count || state.people.length).toLocaleString();
    $('sourceStatus').textContent = payload.cppValidated ? 'C++ + API' : 'API live';
    $('status').className = 'status success';
    $('status').textContent = refreshBlocked
      ? 'Data was refreshed less than a minute ago, so the latest saved copy is shown. Try again shortly.'
      : `${force ? 'Refreshed. ' : ''}Loaded ${state.people.length.toLocaleString()} source records. Use search to find a person.`;
    $('updatedAt').textContent = `Last source fetch: ${payload.fetchedAt ? new Date(payload.fetchedAt).toLocaleString() : 'just now'}. Records are cached on the server for six hours.`;
    if (!state.people.length) throw new Error('The source returned no records.');
    populateFilters(); applyFilters();
  } catch (error) {
    $('status').className = 'status error';
    if (force && state.people.length) {
      $('status').textContent = 'Refresh failed, so the previous data is still shown. Please try again in a minute.';
    } else {
      $('status').textContent = `${error.message} Make sure the Node server is running and your internet connection is available.`;
      $('results').textContent = 'Directory unavailable';
    }
  } finally { state.loading = false; $('refresh').disabled = false; }
}
$('search').addEventListener('input', applyFilters);
$('agency').addEventListener('change', applyFilters);
$('role').addEventListener('change', applyFilters);
$('sort').addEventListener('change', applyFilters);
$('clear').addEventListener('click', () => { $('search').value = ''; $('agency').value = 'all'; $('role').value = 'all'; $('sort').value = 'name'; applyFilters(); });
$('refresh').addEventListener('click', () => loadDirectory(true));
$('loadMore').addEventListener('click', renderMore);
loadDirectory();