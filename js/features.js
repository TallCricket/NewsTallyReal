// NewsTally — Features: TTS, Voice Search, Reading Mode, Swipe, PWA, Dark Mode

// ===== NOTIFICATIONS =====
window.openNotificationsPage = () => openPage('notifications-page');

// ===== USER SEARCH =====
window.handleUserSearch = async (val) => {
  const res = document.getElementById('search-results');
  if (!val.replace('@','').trim()) { res.classList.remove('open'); return; }
  res.classList.add('open');
  res.innerHTML = `<div style="padding:12px 16px;color:var(--muted);font-size:13px">Searching...</div>`;
  
  try {
    const q = query(collection(db, 'users'), where('username', '>=', val.replace('@','')), where('username', '<=', val.replace('@','') + '\uf8ff'), limit(5));
    const snap = await getDocs(q);
    if (snap.empty) { res.innerHTML = `<div style="padding:12px 16px;color:var(--muted);font-size:13px">No users found</div>`; return; }
    res.innerHTML = snap.docs.map(d => {
      const u = d.data();
      return `<div class="search-result-item" onclick="openPublicProfile('${d.id}');document.getElementById('user-search-input').value='';document.getElementById('search-results').classList.remove('open')">
        <img src="${u.photoURL||'https://ui-avatars.com/api/?name=U&background=efefef'}" style="width:36px;height:36px;border-radius:50%;object-fit:cover">
        <div><div style="font-weight:700;font-size:14px">${u.displayName||'User'}</div><div style="font-size:12px;color:var(--muted)">@${u.username||'user'}</div></div>
      </div>`;
    }).join('');
  } catch(e) { res.innerHTML = `<div style="padding:12px 16px;color:var(--muted);font-size:13px">Error searching</div>`; }
};

// ===== STORY (placeholder) =====
window.openAddStoryOptions = () => {
  if (!currentUser) return openAuthModal();
  showToast('Story feature coming soon!');
};

// ===== SHARE =====
window.sharePost = (user, id) => {
  if (navigator.share) {
    navigator.share({ title: `Post by @${user}`, url: location.href });
  } else {
    navigator.clipboard?.writeText(location.href);
    showToast('Link copied!');
  }
};

// ===== NAVIGATION =====
// ===== ROUTER =====
// Maps view names to URL paths
const ROUTES = {
  'home':        '/',
  'socialgati':  '/socialgati',
  'about':       '/about',
};

// Called when user clicks nav or back — updates URL
window.switchView = (view, pushState = true) => {
  const home = document.getElementById('view-home');
  const comm = document.getElementById('view-socialgati');
  home.style.display  = view === 'home' ? '' : 'none';
  comm.style.display  = view === 'socialgati' ? '' : 'none';

  // Sync header nav
  document.querySelectorAll('[data-view]').forEach(b => {
    b.classList.toggle('active-nav', b.dataset.view === view);
  });
  // Sync bottom nav
  const navBtns = document.querySelectorAll('.bottom-nav-btn');
  navBtns.forEach(b => b.classList.remove('active'));
  const idx = view === 'home' ? 0 : view === 'socialgati' ? 1 : 0;
  if (navBtns[idx]) navBtns[idx].classList.add('active');

  // ---- UPDATE URL ----
  if (pushState) {
    const path = ROUTES[view] || '/';
    const url  = path + window.location.search;
    window.history.pushState({ view }, '', url);
    // Update page title & canonical
    updatePageMeta(view);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (view === 'socialgati') {
    const sgCBtn = document.getElementById('sg-create-btn');
    if (sgCBtn) sgCBtn.style.display = currentUser ? 'flex' : 'none';
    const feed = document.getElementById('sg-feed');
    if (!feed || feed.children.length <= 1) loadSocialgati(true);
    const gb = document.getElementById('guest-banner');
    if (gb) gb.style.display = currentUser ? 'none' : 'flex';
  }
};

function updatePageMeta(view, title, desc) {
  const metas = {
    'home':        { title: 'NewsTally — Latest News & Headlines', desc: 'Stay updated with breaking news and top headlines.' },
    'socialgati':  { title: 'Socialgati — Community Feed', desc: 'Connect, post, and engage with the NewsTally community.' },
    'about':       { title: 'About — NewsTally', desc: 'Learn more about NewsTally and connect with us.' },
  };
  const m = metas[view] || metas['home'];
  document.title = title || m.title;
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = 'https://newstally.online' + (ROUTES[view] || '/');
}

// ===== NAVIGATION WITH BACK BUTTON SUPPORT =====
const _pageStack = [];

// Page ID → URL path mapping
const PAGE_URLS = {
  'profile-page':    '/profile',
  'about-page':      '/about',
  'settings-page':   '/settings',
  'saved-news-page': '/saved',
  'notifications-page': '/notifications',
};

window.openPage = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');

  // Use friendly URL if available, else keep current path
  const friendlyPath = PAGE_URLS[id];
  const urlToUse = friendlyPath
    ? friendlyPath
    : window.location.pathname + window.location.search;
  window.history.pushState({ page: id }, '', urlToUse);
  _pageStack.push(id);

  // Update page title
  const titles = {
    'profile-page':    'Profile — NewsTally',
    'about-page':      'About — NewsTally',
    'settings-page':   'Settings — NewsTally',
    'saved-news-page': 'Saved Articles — NewsTally',
    'notifications-page': 'Notifications — NewsTally',
  };
  if (titles[id]) document.title = titles[id];
};

window.closePage = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  el.scrollTop = 0;
  const idx = _pageStack.lastIndexOf(id);
  if (idx > -1) _pageStack.splice(idx, 1);

  // Restore URL to parent page
  if (_pageStack.length > 0) {
    const parent = _pageStack[_pageStack.length - 1];
    const parentUrl = PAGE_URLS[parent] || window.location.pathname;
    window.history.replaceState({ page: parent }, '', parentUrl);
  } else {
    // Back to main view — check which view is visible
    const view = document.getElementById('view-socialgati')?.style.display !== 'none'
      ? 'socialgati' : 'home';
    const path = ROUTES[view] || '/';
    window.history.replaceState({ view }, '', path);
    document.title = view === 'socialgati'
      ? 'Socialgati — NewsTally'
      : 'NewsTally — Latest News & Headlines';
  }
};

window.closeOverlay = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  document.body.style.overflow = '';
};

// Handle browser/Android back button + URL navigation
window.addEventListener('popstate', (e) => {
  const state = e.state || {};

  // Close share card if open
  const shareOverlay = document.getElementById('share-card-overlay');
  if (shareOverlay?.classList.contains('open')) { closeShareCard(); return; }
  // Close swipe mode
  const swipeMode = document.getElementById('swipe-mode-overlay');
  if (swipeMode?.classList.contains('open')) { closeSwipeMode(); return; }
  // Close reading mode
  const readingMode = document.getElementById('reading-mode-overlay');
  if (readingMode?.classList.contains('open')) { closeReadingMode(); return; }

  // If state has a view, switch to it (back from socialgati → home)
  if (state.view && ROUTES[state.view]) {
    switchView(state.view, false); // false = don't pushState again
    return;
  }

  // Close topmost open page layer
  if (_pageStack.length > 0) {
    const topPage = _pageStack[_pageStack.length - 1];
    // Remove from stack first, then close without pushing new history
    _pageStack.splice(_pageStack.lastIndexOf(topPage), 1);
    const el = document.getElementById(topPage);
    if (el) { el.classList.remove('open'); el.scrollTop = 0; }
    return;
  }
  // Close any open overlay modals
  const openOverlay = document.querySelector('.overlay-bg.open');
  if (openOverlay) {
    openOverlay.classList.remove('open');
    document.body.style.overflow = '';
    return;
  }
  // Close any open modal layer
  const openModal = document.querySelector('.modal-layer.open');
  if (openModal) {
    openModal.classList.remove('open');
    return;
  }
});

// Push initial state so first back press doesn't leave the app
window.history.replaceState({ page: 'home' }, '', window.location.pathname + window.location.search);

// ===== DARK MODE =====
window.toggleDarkMode = (val) => {
  let isDark;
  if (typeof val === 'boolean') isDark = val;
  else if (val === undefined || val === null) isDark = !document.documentElement.classList.contains('dark');
  else isDark = Boolean(val); // handles this.checked from onchange
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  document.getElementById('theme-icon').className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  const toggle = document.getElementById('dark-mode-toggle-switch');
  if (toggle) toggle.checked = isDark;
  const meta = document.getElementById('theme-color-meta');
  if (meta) meta.content = isDark ? '#111118' : '#ffffff';
};

function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved ? saved === 'dark' : prefersDark;
  if (isDark) {
    document.documentElement.classList.add('dark');
    document.getElementById('theme-icon').className = 'fas fa-sun';
    const toggle = document.getElementById('dark-mode-toggle-switch');
    if (toggle) toggle.checked = true;
  }
}

// ===== HELPERS =====
function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  const now = new Date();
  const diff = now - d;
  if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  if (diff < 604800000) return Math.floor(diff/86400000) + 'd ago';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatTimestamp(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return formatDate(d.toISOString());
}

window.processText = (t) => {
  if (!t) return '';
  return t
    .replace(/#(\w+)/g, '<span class="hashtag">#$1</span>')
    .replace(/@(\w+)/g, '<span class="mention">@$1</span>');
};

window.showToast = (msg) => {
  const t = document.getElementById('toast');
  t.querySelector('span').textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.style.opacity = '0', 2800);
};

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay || overlay.style.display === 'none') return;
  overlay.classList.add('done');
  setTimeout(() => { overlay.style.display = 'none'; }, 600);
}


// ===== SAVED NEWS (Bookmark) =====
let savedNewsIds = new Set(JSON.parse(localStorage.getItem('nt_saved_news') || '[]'));

window.toggleSaveNews = (id, btn) => {
  if (savedNewsIds.has(id)) {
    savedNewsIds.delete(id);
    btn.classList.remove('saved');
    btn.innerHTML = '<i class="far fa-bookmark"></i> Save';
    showToast('Removed from saved');
  } else {
    savedNewsIds.add(id);
    btn.classList.add('saved');
    btn.innerHTML = '<i class="fas fa-bookmark"></i> Saved';
    showToast('Article saved!');
  }
  localStorage.setItem('nt_saved_news', JSON.stringify([...savedNewsIds]));
};

window.openSavedNews = () => {
  openPage('saved-news-page');
  const list = document.getElementById('saved-news-list');
  const saved = allNewsData.filter(n => savedNewsIds.has(n.id));
  if (saved.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:40px 0;color:#9aa0a6"><i class="far fa-bookmark" style="font-size:36px;display:block;margin-bottom:12px;opacity:0.4"></i><p style="font-weight:500">No saved articles yet</p><p style="font-size:13px;margin-top:4px">Tap bookmark on any news card</p></div>`;
    return;
  }
  list.innerHTML = saved.map(item => `
    <div style="background:#fff;border:1px solid #e8eaed;border-radius:14px;overflow:hidden;cursor:pointer" onclick="openNewsDetail(${JSON.stringify(item).replace(/"/g,'&quot;')})">
      <div style="display:flex;gap:12px;padding:14px">
        <img src="${item.image||'https://placehold.co/80x80/e8f0fe/1a73e8?text=N'}" style="width:72px;height:72px;border-radius:10px;object-fit:cover;flex-shrink:0">
        <div style="flex:1;min-width:0">
          <span style="font-size:10px;font-weight:700;color:#1a73e8;text-transform:uppercase;letter-spacing:0.05em">${item.category}</span>
          <p style="font-size:14px;font-weight:500;line-height:1.45;margin:4px 0 6px;color:#202124;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${item.title}</p>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:11px;color:#9aa0a6">${item.source} · ${formatDate(item.date)}</span>
            <button onclick="event.stopPropagation();toggleSaveNews('${item.id}',this)" class="nc-action-btn saved" style="padding:3px 8px;font-size:11px"><i class="fas fa-bookmark"></i></button>
          </div>
        </div>
      </div>
    </div>`).join('');
};

// ===== SHARE NEWS =====
window.shareNewsItem = (title, url) => {
  if (navigator.share) {
    navigator.share({ title, url: url !== '#' ? url : location.href }).catch(()=>{});
  } else {
    const shareUrl = url !== '#' ? url : location.href;
    navigator.clipboard?.writeText(shareUrl).then(() => showToast('Link copied!')).catch(() => showToast('Share: ' + shareUrl));
  }
};

// ===== NEWS SEARCH =====
window.triggerNewsSearch = () => {
  const inp = document.getElementById('news-search-input');
  if (inp) handleNewsSearch(inp.value);
};

window.handleNewsSearch = (val) => {
  const clearBtn = document.getElementById('news-search-clear');
  if (clearBtn) clearBtn.classList.toggle('show', val.length > 0);
  if (!val.trim()) {
    filteredNews = currentFilter === 'All' ? [...allNewsData] : allNewsData.filter(n => n.category === currentFilter);
    displayedCount = 0;
    renderNewsGrid(true);
    return;
  }
  const q = val.toLowerCase();
  filteredNews = allNewsData.filter(n =>
    (n.title||'').toLowerCase().includes(q) ||
    (n.description||'').toLowerCase().includes(q) ||
    (n.category||'').toLowerCase().includes(q) ||
    (n.source||'').toLowerCase().includes(q)
  );
  displayedCount = 0;
  renderNewsGrid(true);
  document.getElementById('category-label').textContent = `"${val}" (${filteredNews.length})`;
};

window.clearNewsSearch = () => {
  const inp = document.getElementById('news-search-input');
  const clearBtn = document.getElementById('news-search-clear');
  if (inp) { inp.value = ''; inp.focus(); }
  if (clearBtn) clearBtn.classList.remove('show');
  handleNewsSearch('');
};

// ===== LANGUAGE TOGGLE =====
let currentLang = localStorage.getItem('nt_lang') || 'en';

window.setLang = (lang, btn) => {
  currentLang = lang;
  localStorage.setItem('nt_lang', lang);
  // Sync both toggle buttons (header + settings)
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll(`[id^="lang-${lang}"], [id^="settings-lang-${lang}"]`).forEach(b => b.classList.add('active'));
  // Update section title
  const title = document.getElementById('headlines-title');
  if (title) title.textContent = lang === 'hi' ? 'ताज़ा खबरें' : 'Latest Headlines';
  // Filter news
  if (lang === 'hi') {
    filteredNews = allNewsData.filter(n => /[ऀ-ॿ]/.test(n.title) || n.category === 'Hindi' || n.source?.toLowerCase().includes('hindi') || n.source?.toLowerCase().includes('bharat') || n.source?.toLowerCase().includes('dainik'));
    if (filteredNews.length === 0) filteredNews = [...allNewsData]; // fallback
  } else {
    filteredNews = currentFilter === 'All' ? [...allNewsData] : allNewsData.filter(n => n.category === currentFilter);
  }
  displayedCount = 0;
  renderNewsGrid(true);
  showToast(lang === 'hi' ? 'हिंदी में दिखा रहे हैं' : 'Showing English news');
};

// Apply saved lang on load
setTimeout(() => {
  if (currentLang === 'hi') {
    document.querySelectorAll('[id^="lang-hi"],[id^="settings-lang-hi"]').forEach(b => b.classList.add('active'));
    document.querySelectorAll('[id^="lang-en"],[id^="settings-lang-en"]').forEach(b => b.classList.remove('active'));
  }
}, 500);

// ===== NIGHT MODE AUTO-SCHEDULE =====
let nightScheduleActive = localStorage.getItem('nt_night_schedule') === 'true';
let nightStart = localStorage.getItem('nt_night_start') || '22:00';
let nightEnd = localStorage.getItem('nt_night_end') || '06:00';

window.toggleNightSchedule = (enabled) => {
  nightScheduleActive = enabled;
  localStorage.setItem('nt_night_schedule', enabled);
  const pickers = document.getElementById('night-time-pickers');
  if (pickers) { pickers.style.opacity = enabled ? '1' : '0.5'; pickers.style.pointerEvents = enabled ? 'auto' : 'none'; }
  showToast(enabled ? 'Auto dark schedule enabled' : 'Schedule disabled');
  if (enabled) checkNightSchedule();
};

window.saveNightSchedule = () => {
  nightStart = document.getElementById('night-start')?.value || '22:00';
  nightEnd = document.getElementById('night-end')?.value || '06:00';
  localStorage.setItem('nt_night_start', nightStart);
  localStorage.setItem('nt_night_end', nightEnd);
  showToast('Schedule saved!');
};

function checkNightSchedule() {
  if (!nightScheduleActive) return;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = nightStart.split(':').map(Number);
  const [eh, em] = nightEnd.split(':').map(Number);
  const start = sh * 60 + sm, end = eh * 60 + em;
  const isNight = start > end ? (cur >= start || cur < end) : (cur >= start && cur < end);
  const isDark = document.documentElement.classList.contains('dark');
  if (isNight && !isDark) toggleDarkMode(true);
  if (!isNight && isDark) toggleDarkMode(false);
}
setInterval(checkNightSchedule, 60000);

// Init night schedule settings UI
setTimeout(() => {
  const row = document.getElementById('night-schedule-row');
  if (row) row.style.display = '';
  const toggle = document.getElementById('night-schedule-toggle');
  if (toggle) toggle.checked = nightScheduleActive;
  const pickers = document.getElementById('night-time-pickers');
  if (pickers) { pickers.style.opacity = nightScheduleActive ? '1' : '0.5'; pickers.style.pointerEvents = nightScheduleActive ? 'auto' : 'none'; }
  const ns = document.getElementById('night-start'), ne = document.getElementById('night-end');
  if (ns) ns.value = nightStart;
  if (ne) ne.value = nightEnd;
  checkNightSchedule();
}, 600);

// ===== OFFLINE MODE =====
window.addEventListener('online', () => {
  document.getElementById('offline-banner')?.classList.remove('show');
  showToast('Back online! Refreshing news...');
  fetchNews();
});
window.addEventListener('offline', () => {
  document.getElementById('offline-banner')?.classList.add('show');
  showToast('You are offline — cached news shown');
});
// Check on load
if (!navigator.onLine) document.getElementById('offline-banner')?.classList.add('show');

// ===== TRENDING HASHTAGS =====
async function loadTrendingHashtags() {
  try {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'), orderBy('timestamp','desc'), limit(50));
    const snap = await getDocs(q);
    const tagCount = {};
    snap.docs.forEach(d => {
      const text = (d.data().headline || '') + ' ' + (d.data().text || '');
      const tags = text.match(/#\w+/g) || [];
      tags.forEach(t => { tagCount[t] = (tagCount[t]||0)+1; });
    });
    // Also add from news categories
    allNewsData.slice(0,30).forEach(n => {
      if (n.category) { const t = '#'+n.category.replace(/\s+/g,''); tagCount[t] = (tagCount[t]||0)+1; }
    });
    const sorted = Object.entries(tagCount).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const chips = document.getElementById('trending-chips');
    if (!chips) return;
    if (sorted.length === 0) {
      chips.innerHTML = '<span style="font-size:12px;color:#9aa0a6">No trending tags yet</span>';
      return;
    }
    chips.innerHTML = sorted.map(([tag]) =>
      `<span class="hashtag-chip" onclick="filterByHashtag('${tag}')">${tag}</span>`
    ).join('');
  } catch(e) {
    const chips = document.getElementById('trending-chips');
    if (chips) chips.innerHTML = '';
  }
}

window.filterByHashtag = (tag) => {
  switchView('home');
  const q = tag.replace('#','');
  document.getElementById('news-search-input').value = q;
  handleNewsSearch(q);
  window.scrollTo({top:0,behavior:'smooth'});
};

// Load trending when community view opens
const origSwitchView = window.switchView;
window.switchView = (view) => {
  origSwitchView(view);
  if (view === 'socialgati') loadTrendingHashtags();
};

// ===== TEXT POST =====
let selectedTextTag = '';
window.selectTextTag = (el, tag) => {
  document.querySelectorAll('#text-post-tags .hashtag-chip').forEach(c => c.style.background = '');
  el.style.background = '#1a73e8';
  el.style.color = '#fff';
  selectedTextTag = tag;
};

window.openTextPostModal = () => {
  if (!currentUser) return openAuthModal();
  const av = document.getElementById('header-avatar')?.src || '';
  const tp = document.getElementById('text-post-avatar');
  if (tp) tp.src = av;
  document.getElementById('text-post-content').value = '';
  selectedTextTag = '';
  document.querySelectorAll('#text-post-tags .hashtag-chip').forEach(c => { c.style.background=''; c.style.color=''; });
  document.getElementById('text-post-modal').classList.add('open');
};

window.submitTextPost = async () => {
  if (!currentUser) return openAuthModal();
  const text = document.getElementById('text-post-content').value.trim();
  if (!text) return showToast('Write something first!');
  const uSnap = await getDoc(doc(db, 'users', currentUser.uid)).catch(()=>null);
  const uData = uSnap?.data() || {};
  await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'), {
    userId: currentUser.uid,
    username: uData.username || currentUser.displayName || 'User',
    userAvatar: currentUser.photoURL || '',
    headline: text + (selectedTextTag ? ' ' + selectedTextTag : ''),
    likes: [], commentsCount: 0,
    timestamp: serverTimestamp(),
    type: 'text'
  });
  document.getElementById('text-post-modal').classList.remove('open');
  showToast('Posted!');
  if (document.getElementById('view-socialgati').style.display !== 'none') loadSocialgati(true);
};

// ===== REPOST NEWS TO COMMUNITY =====
window.openRepostNewsModal = () => {
  if (!currentUser) return openAuthModal();
  document.getElementById('repost-news-modal').classList.add('open');
  const list = document.getElementById('repost-news-list');
  if (!allNewsData.length) { list.innerHTML = '<p style="color:#9aa0a6;text-align:center;padding:20px">Load news first from News tab</p>'; return; }
  list.innerHTML = allNewsData.slice(0,20).map((item,i) => `
    <div style="display:flex;gap:12px;padding:14px;background:#fff;border:1px solid #e8eaed;border-radius:14px;cursor:pointer;transition:background 0.18s" 
         onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='#fff'"
         onclick="confirmRepostNews(${i})">
      <img src="${item.image||'https://placehold.co/60x60/e8f0fe/1a73e8?text=N'}" style="width:56px;height:56px;border-radius:10px;object-fit:cover;flex-shrink:0">
      <div style="flex:1;min-width:0">
        <span style="font-size:10px;font-weight:700;color:#1a73e8;text-transform:uppercase">${item.category}</span>
        <p style="font-size:13px;font-weight:500;color:#202124;margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4">${item.title}</p>
        <span style="font-size:11px;color:#9aa0a6">${item.source}</span>
      </div>
      <i class="fas fa-retweet" style="color:#1a73e8;font-size:18px;flex-shrink:0;margin-top:4px"></i>
    </div>`).join('');
};

window.confirmRepostNews = async (idx) => {
  if (!currentUser) return openAuthModal();
  const item = allNewsData[idx];
  if (!item) return;
  const uSnap = await getDoc(doc(db, 'users', currentUser.uid)).catch(()=>null);
  const uData = uSnap?.data() || {};
  await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'), {
    userId: currentUser.uid,
    username: uData.username || currentUser.displayName || 'User',
    userAvatar: currentUser.photoURL || '',
    image: item.image || '',
    headline: item.title,
    newsUrl: item.url || '',
    newsSource: item.source || '',
    likes: [], commentsCount: 0,
    timestamp: serverTimestamp(),
    type: 'repost'
  });
  document.getElementById('repost-news-modal').classList.remove('open');
  showToast('Reposted to Community!');
  switchView('socialgati');
  loadSocialgati(true);
};



// ===== QUICK REPOST FROM NEWS CARD (One-tap) =====
window.quickRepostNews = async (item, btn) => {
  if (typeof item === 'string') item = JSON.parse(item);
  if (!currentUser) return openAuthModal();

  // Prevent double repost - disable btn
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    const uSnap = await getDoc(doc(db, 'users', currentUser.uid)).catch(()=>null);
    const uData = uSnap?.data() || {};

    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'), {
      userId: currentUser.uid,
      username: uData.username || currentUser.displayName || 'User',
      userAvatar: currentUser.photoURL || '',
      image: item.image || '',
      headline: item.title,
      newsUrl: item.url || '',
      newsSource: item.source || '',
      newsCategory: item.category || '',
      likes: [], commentsCount: 0,
      timestamp: serverTimestamp(),
      type: 'repost'
    });

    // Mark btn as reposted
    btn.innerHTML = '<i class="fas fa-check"></i> Reposted';
    btn.classList.add('saved');
    btn.disabled = false;

    // Toast with action to view
    showToast('✅ Reposted to Community!');

    // Reload community feed in background
    if (document.getElementById('view-socialgati').style.display !== 'none') {
      loadSocialgati(true);
    }
  } catch(e) {
    console.error(e);
    btn.innerHTML = '<i class="fas fa-retweet"></i> Repost';
    btn.disabled = false;
    showToast('Repost failed. Try again.');
  }
};