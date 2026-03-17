// NewsTally — Share Card (Inshorts-style)

// ===== INSHORTS-STYLE SHARE CARD =====
let shareCardItem = null;

// ===== OPEN SHARE CARD (Inshorts style) =====
window.openShareCard = (item) => {
  if (typeof item === 'string') item = JSON.parse(item);
  shareCardItem = item;

  // Image
  const img = document.getElementById('share-card-img');
  const placeholder = document.getElementById('share-card-img-placeholder');
  if (item.image) {
    img.src = item.image;
    img.style.display = 'block';
    placeholder.style.display = 'none';
    img.onerror = () => { img.style.display='none'; placeholder.style.display='flex'; };
  } else {
    img.style.display = 'none';
    placeholder.style.display = 'flex';
  }

  // Overlays
  const badge = document.getElementById('share-card-img-badge');
  const source = document.getElementById('share-card-img-source');
  if (badge) badge.textContent = item.category || 'News';
  if (source) source.textContent = item.source || 'NewsTally';

  // Body
  document.getElementById('share-card-title').textContent = item.title || '';
  const desc = item.description || '';
  const shortDesc = desc.length > 120 ? desc.substring(0, 120) + '…' : desc;
  document.getElementById('share-card-desc').textContent = shortDesc;
  document.getElementById('share-card-desc').style.display = shortDesc ? '' : 'none';

  // Footer
  document.getElementById('share-card-meta').textContent = formatDate(item.date) || 'Today';
  const urlEl = document.getElementById('share-card-url');
  if (urlEl) urlEl.textContent = 'newstally.online';

  // Store share URL
  const shareUrl = buildShareUrl(item);
  document.getElementById('share-card-overlay').dataset.shareUrl = shareUrl;

  document.getElementById('share-card-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeShareCard = () => {
  document.getElementById('share-card-overlay').classList.remove('open');
  document.body.style.overflow = '';
  shareCardItem = null;
};

function buildShareUrl(item) {
  // Build a URL that will auto-open this news when someone clicks it
  const base = window.location.origin + window.location.pathname;
  // Use news ID + title for best matching
  const params = new URLSearchParams({
    nid: item.id || '',
    q: item.title || '',
    cat: item.category || '',
    src: item.source || ''
  });
  return `${base}?${params.toString()}`;
}

function getShareText(item) {
  const short = (item.description || '').substring(0, 150);
  const url = buildShareUrl(item);
  return `📰 *${item.title}*\n\n${short}${short.length>=150?'…':''}\n\n🔗 ${url}\n\n📲 *NewsTally* — Read. Repost. Connect.`;
}

// ===== DOWNLOAD / SAVE CARD =====
window.downloadShareCard = async () => {
  const card = document.getElementById('share-card');
  if (!card) return;

  showToast('Generating image…');
  try {
    if (typeof html2canvas !== 'undefined') {
      // Render card to canvas at 3x resolution (sharp on mobile)
      const canvas = await html2canvas(card, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 8000,
        onclone: (doc) => {
          // Ensure fonts are loaded in clone
          doc.getElementById('share-card').style.fontFamily = "'Roboto', sans-serif";
        }
      });

      const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 1.0));
      const blobUrl = URL.createObjectURL(blob);

      // Try Web Share API with image (mobile native share sheet)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [] })) {
        try {
          const file = new File([blob], 'newstally-news.png', { type: 'image/png' });
          await navigator.share({
            title: shareCardItem?.title || 'NewsTally',
            text: getShareText(shareCardItem),
            files: [file]
          });
          showToast('Shared!');
          URL.revokeObjectURL(blobUrl);
          return;
        } catch(e) {
          // Fall through to download
        }
      }

      // Fallback: direct download
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `NewsTally-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
      showToast('✅ Card saved to gallery!');
    } else {
      // html2canvas not loaded — share via text
      shareViaNative();
    }
  } catch(e) {
    console.error('Share card error:', e);
    copyShareLink();
  }
};

// ===== SHARE VIA APPS =====
window.shareViaWhatsApp = () => {
  if (!shareCardItem) return;
  // getShareText already includes the URL
  const text = encodeURIComponent(getShareText(shareCardItem));
  window.open(`https://wa.me/?text=${text}`, '_blank');
};

window.shareViaTwitter = () => {
  if (!shareCardItem) return;
  const url = document.getElementById('share-card-overlay').dataset.shareUrl;
  const tweetText = encodeURIComponent(`📰 ${shareCardItem.title}\n\nvia @newstallyofficial`);
  window.open(`https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(url)}`, '_blank');
};

window.shareViaTelegram = () => {
  if (!shareCardItem) return;
  const url = document.getElementById('share-card-overlay').dataset.shareUrl;
  const short = (shareCardItem.description || '').substring(0, 100);
  const text = encodeURIComponent(`📰 ${shareCardItem.title}\n\n${short}${short.length>=100?'…':''}\n\nNewsTally`);
  window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`, '_blank');
};

window.shareViaNative = () => {
  if (!shareCardItem) return;
  const url = document.getElementById('share-card-overlay').dataset.shareUrl;
  if (navigator.share) {
    navigator.share({
      title: shareCardItem.title,
      text: `📰 ${shareCardItem.title}\n\n${(shareCardItem.description||'').substring(0,100)}…`,
      url
    }).catch(()=>{});
  } else {
    copyShareLink();
  }
};

window.copyShareLink = () => {
  const url = document.getElementById('share-card-overlay').dataset.shareUrl;
  const copy = (text) => {
    try {
      navigator.clipboard?.writeText(text).then(() => showToast('🔗 Link copied!')).catch(fallback);
    } catch(e) { fallback(); }
    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('🔗 Link copied!');
    }
  };
  copy(url);
};

// ============================================================
// URL ROUTER — handles direct URL visits and shared links
// newstally.online/socialgati     → open Socialgati
// newstally.online/about          → open About
// newstally.online/news/slug?id=  → open news article
// newstally.online/profile        → open profile
// newstally.online/?q=...         → search
// ============================================================
(function initRouter() {
  // Handle GitHub Pages 404 redirect — restore original path
  const rawParams = new URLSearchParams(window.location.search);
  if (rawParams.get('_route')) {
    const originalPath = decodeURIComponent(rawParams.get('_route'));
    // Replace URL with the original path (without _route param)
    window.history.replaceState(null, '', originalPath);
  }

  const path   = window.location.pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(window.location.search);

  // Set initial history state (only if not already set)
  if (!window.history.state) {
    const initView = path.startsWith('/socialgati') ? 'socialgati' : 'home';
    window.history.replaceState({ view: initView }, '', window.location.href);
  }

  // ---- /socialgati ----
  if (path === '/socialgati' || path.startsWith('/socialgati')) {
    // Will switch after DOM ready
    setTimeout(() => switchView('socialgati', false), 100);
    return;
  }

  // ---- /about ----
  if (path === '/about') {
    setTimeout(() => {
      const aboutPage = document.getElementById('about-page');
      if (aboutPage) {
        aboutPage.classList.add('open');
        _pageStack.push('about-page');
      }
    }, 300);
    return;
  }

  // ---- /profile ----
  if (path === '/profile' || path.startsWith('/profile/')) {
    const username = path.split('/profile/')[1];
    setTimeout(() => {
      if (currentUser) openProfile();
    }, 800);
    return;
  }

  // ---- /settings ----
  if (path === '/settings') {
    setTimeout(() => openPage('settings-page'), 500);
    return;
  }

  // ---- /saved ----
  if (path === '/saved') {
    setTimeout(() => openSavedNews(), 800);
    return;
  }

  // ---- /news/slug?id=xxx ---- (shared news link)
  if (path.startsWith('/news/')) {
    const nid = params.get('id');
    const q   = params.get('q');
    const cat = params.get('cat');

    function tryOpenNews(attempt) {
      if (attempt > 15) return;
      if (!allNewsData.length) { setTimeout(() => tryOpenNews(attempt + 1), 400); return; }
      let match = null;
      if (nid) match = allNewsData.find(n => String(n.id) === String(nid));
      if (!match && q) {
        const qLow = decodeURIComponent(q).toLowerCase().substring(0, 40);
        match = allNewsData.find(n => (n.title||'').toLowerCase().includes(qLow));
      }
      if (!match && cat) {
        match = allNewsData.find(n => (n.category||'').toLowerCase() === decodeURIComponent(cat).toLowerCase());
      }
      if (match) {
        updateOGTags(match.title, match.category);
        setTimeout(() => openNewsDetail(match), 200);
      }
    }
    setTimeout(() => tryOpenNews(0), 800);
    return;
  }

  // ---- / (home) with ?q= search param ----
  if (params.get('q')) {
    const q = params.get('q');
    const cat = params.get('cat');
    function trySearch(attempt) {
      if (attempt > 10) return;
      if (!allNewsData.length) { setTimeout(() => trySearch(attempt+1), 500); return; }
      const inp = document.getElementById('news-search-input');
      if (inp) { inp.value = decodeURIComponent(q); triggerNewsSearch(); }
    }
    setTimeout(() => trySearch(0), 1000);
  }
})();

// Dynamic OG tag updater for shared links
function updateOGTags(title, category) {
  const setMeta = (prop, val, isName) => {
    const sel = isName ? `meta[name="${prop}"]` : `meta[property="${prop}"]`;
    let el = document.querySelector(sel);
    if (!el) { el = document.createElement('meta'); isName ? el.setAttribute('name',prop) : el.setAttribute('property',prop); document.head.appendChild(el); }
    el.setAttribute('content', val);
  };
  const desc = `${category ? category + ' news: ' : ''}${title} — Read on NewsTally`;
  setMeta('og:title', title + ' — NewsTally', false);
  setMeta('og:description', desc, false);
  setMeta('twitter:title', title + ' — NewsTally', true);
  setMeta('twitter:description', desc, true);
  document.title = title + ' — NewsTally';
}

// Update JSON-LD dynamically when news detail opens
function updateStructuredData(item) {
  const existing = document.getElementById('news-jsonld');
  if (existing) existing.remove();
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.id = 'news-jsonld';
  s.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": item.title,
    "description": item.description || item.title,
    "image": item.image ? [item.image] : ["https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png"],
    "datePublished": item.date || new Date().toISOString(),
    "dateModified": item.date || new Date().toISOString(),
    "author": { "@type": "Organization", "name": item.source || "NewsTally" },
    "publisher": {
      "@type": "Organization", "name": "NewsTally",
      "logo": { "@type": "ImageObject", "url": "https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": window.location.href },
    "articleSection": item.category || "News",
    "keywords": [item.category, item.source, "NewsTally", "news"].filter(Boolean).join(", ")
  });
  document.head.appendChild(s);
  // Also update meta tags
  if (item.title) updateOGTags(item.title, item.category);
}


// ============================================================
// NEW FEATURES JAVASCRIPT
// ============================================================

// ===== 1. BREAKING NEWS TICKER =====
function initTicker() {
  if (!allNewsData.length) return;
  const top5 = allNewsData.slice(0, 8);
  const track = document.getElementById('ticker-track');
  if (!track) return;
  // Duplicate for seamless loop
  const html = [...top5, ...top5].map(n =>
    `<span class="ticker-item" onclick="openNewsDetail(${JSON.stringify(n).replace(/"/g,'&quot;')})">${n.title}</span>`
  ).join('');
  track.innerHTML = html;
  document.getElementById('breaking-ticker').classList.add('show');
}

// ===== 2. SCROLL TO TOP =====
window.addEventListener('scroll', () => {
  const btn = document.getElementById('scroll-top-btn');
  if (btn) btn.classList.toggle('show', window.scrollY > 400);
}, { passive: true });

// ===== 3. FONT SIZE CONTROL =====
const FONT_SIZES = [14, 16, 18, 20, 22];
const FONT_LABELS = ['Small', 'Medium', 'Large', 'X-Large', 'XX-Large'];
let fontSizeIdx = parseInt(localStorage.getItem('nt_font_size') || '1');

function applyFontSize() {
  const sz = FONT_SIZES[fontSizeIdx];
  document.documentElement.style.setProperty('--reading-font-size', sz + 'px');
  // Apply to news cards
  document.querySelectorAll('.news-card-title').forEach(el => {
    el.style.fontSize = (sz - 1) + 'px';
  });
  document.querySelectorAll('.news-card-desc, .news-card p').forEach(el => {
    el.style.fontSize = (sz - 3) + 'px';
  });
  const lbl = document.getElementById('font-size-label');
  if (lbl) lbl.textContent = FONT_LABELS[fontSizeIdx];
}

window.changeFontSize = (dir) => {
  fontSizeIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, fontSizeIdx + dir));
  localStorage.setItem('nt_font_size', fontSizeIdx);
  applyFontSize();
  showToast(`Font: ${FONT_LABELS[fontSizeIdx]}`);
};

// ===== 4. THEME COLOR =====
window.setThemeColor = (primary, dark, el) => {
  document.documentElement.style.setProperty('--accent', primary);
  document.documentElement.style.setProperty('--accent-2', dark);
  // Update all hardcoded blue references via CSS variable
  const style = document.getElementById('theme-color-style') || (() => {
    const s = document.createElement('style');
    s.id = 'theme-color-style'; document.head.appendChild(s); return s;
  })();
  style.textContent = `
    .btn-signin, .auth-submit, .fab, #comment-submit-btn,
    .cat-btn.active, .btn-follow:not(.following) { background: ${primary} !important; }
    .header-nav button.active-nav, .news-card-category,
    .comm-tab.active, .profile-tab.active { color: ${primary} !important; }
    .section-accent-bar, #news-reading-progress-fill,
    .reading-progress-fill { background: ${primary} !important; }
    .auth-input:focus { border-color: ${primary} !important; box-shadow: 0 0 0 2px ${primary}22 !important; }
    #tts-player { background: ${primary} !important; }
    #scroll-top-btn { background: ${primary} !important; }
  `;
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  if (el) el.classList.add('active');
  localStorage.setItem('nt_accent', JSON.stringify({ primary, dark }));
  showToast('Theme updated!');
};

// Restore saved theme
const savedAccent = JSON.parse(localStorage.getItem('nt_accent') || 'null');
if (savedAccent) {
  setTimeout(() => {
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(s => {
      if (s.style.background === savedAccent.primary ||
          s.getAttribute('onclick')?.includes(savedAccent.primary)) {
        setThemeColor(savedAccent.primary, savedAccent.dark, s);
      }
    });
  }, 500);
}

// ===== 5. VOICE SEARCH =====
let voiceRecognition = null;
window.startVoiceSearch = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { showToast('Voice search not supported on this browser'); return; }
  const btn = document.getElementById('voice-search-btn');
  if (voiceRecognition) { voiceRecognition.stop(); voiceRecognition = null; btn.classList.remove('listening'); return; }
  voiceRecognition = new SpeechRecognition();
  voiceRecognition.lang = 'en-IN';
  voiceRecognition.continuous = false;
  voiceRecognition.interimResults = false;
  btn.classList.add('listening');
  showToast('🎤 Listening...');
  voiceRecognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    const inp = document.getElementById('news-search-input');
    if (inp) { inp.value = text; handleNewsSearch(text); }
    btn.classList.remove('listening');
    voiceRecognition = null;
  };
  voiceRecognition.onerror = () => { btn.classList.remove('listening'); voiceRecognition = null; showToast('Voice search failed'); };
  voiceRecognition.onend = () => { btn.classList.remove('listening'); voiceRecognition = null; };
  voiceRecognition.start();
};

// ===== 6. TEXT-TO-SPEECH =====
let ttsUtterance = null;
let ttsPaused = false;

window.speakNews = (item) => {
  if (!item) return;
  const text = `${item.title}. ${item.description || ''}`;
  speakText(text, item.title);
};

window.speakCurrentReading = () => {
  const el = document.getElementById('reading-mode-content');
  if (!el) return;
  const text = el.innerText;
  const title = document.querySelector('#reading-mode-content h1')?.textContent || 'Article';
  speakText(text, title);
};

function speakText(text, title) {
  window.speechSynthesis?.cancel();
  ttsPaused = false;
  const player = document.getElementById('tts-player');
  const titleEl = document.getElementById('tts-title');
  const playBtn = document.getElementById('tts-play-btn');
  ttsUtterance = new SpeechSynthesisUtterance(text);
  ttsUtterance.lang = 'en-IN';
  ttsUtterance.rate = 0.95;
  ttsUtterance.onend = () => {
    player?.classList.remove('show');
    ttsUtterance = null;
  };
  if (titleEl) titleEl.textContent = title || 'Reading...';
  if (playBtn) playBtn.innerHTML = '<i class="fas fa-pause"></i>';
  player?.classList.add('show');
  window.speechSynthesis?.speak(ttsUtterance);
}

window.ttsToggle = () => {
  const playBtn = document.getElementById('tts-play-btn');
  if (!window.speechSynthesis) return;
  if (ttsPaused) {
    window.speechSynthesis.resume();
    ttsPaused = false;
    if (playBtn) playBtn.innerHTML = '<i class="fas fa-pause"></i>';
  } else {
    window.speechSynthesis.pause();
    ttsPaused = true;
    if (playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i>';
  }
};

window.ttsStop = () => {
  window.speechSynthesis?.cancel();
  document.getElementById('tts-player')?.classList.remove('show');
  ttsUtterance = null; ttsPaused = false;
};

// ===== 7. READING MODE =====
let readingFontSize = parseInt(localStorage.getItem('nt_rm_font') || '17');

window.openReadingMode = (item) => {
  if (!item) return;
  const overlay = document.getElementById('reading-mode-overlay');
  const contentEl = document.getElementById('reading-mode-content');
  if (!overlay || !contentEl) return;

  // Paragraphs from description
  const paras = (item.description || 'No full content available in this feed.').split('. ').filter(s => s.trim());

  contentEl.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px">${item.category} · ${item.source} · ${formatDate(item.date)}</div>
    <h1>${item.title}</h1>
    <hr style="border:none;border-top:2px solid #e8e0d0;margin:20px 0">
    ${paras.map(p => `<p>${p.trim()}${p.trim().endsWith('.') ? '' : '.'}</p>`).join('')}
    <div style="margin-top:32px;padding:16px;background:#f1ebe0;border-radius:12px;font-size:13px;color:#5f6368;text-align:center">
      <i class="fas fa-info-circle" style="margin-right:6px"></i>
      This is the summary from our news feed.
    </div>`;

  contentEl.style.fontSize = readingFontSize + 'px';
  overlay.classList.add('open');

  // Reading progress on scroll
  overlay.onscroll = () => {
    const progress = document.getElementById('rm-progress');
    if (!progress) return;
    const total = overlay.scrollHeight - overlay.clientHeight;
    const pct = total > 0 ? (overlay.scrollTop / total) * 100 : 0;
    progress.style.width = pct + '%';
  };
};

window.closeReadingMode = () => {
  document.getElementById('reading-mode-overlay')?.classList.remove('open');
  window.speechSynthesis?.cancel();
};

window.changeFontSize = (dir) => {
  fontSizeIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, fontSizeIdx + dir));
  localStorage.setItem('nt_font_size', fontSizeIdx);
  readingFontSize = FONT_SIZES[fontSizeIdx];
  localStorage.setItem('nt_rm_font', readingFontSize);
  applyFontSize();
  // Apply to reading mode if open
  const rmContent = document.getElementById('reading-mode-content');
  if (rmContent) rmContent.style.fontSize = readingFontSize + 'px';
  showToast(`Font: ${FONT_LABELS[fontSizeIdx]}`);
};

// ===== 8. READING PROGRESS on news detail =====
document.getElementById('news-detail-page')?.addEventListener('scroll', function() {
  const fill = document.getElementById('news-reading-progress-fill');
  if (!fill) return;
  const total = this.scrollHeight - this.clientHeight;
  fill.style.width = total > 0 ? (this.scrollTop / total * 100) + '%' : '0%';
}, { passive: true });

// ===== 9. EMOJI REACTIONS (localStorage) =====
const reactionsStore = JSON.parse(localStorage.getItem('nt_reactions') || '{}');

window.addReaction = (postId, emoji, btn) => {
  if (!currentUser) return openAuthModal();
  const key = `${postId}_${emoji}`;
  const already = reactionsStore[key];
  const countEl = btn.querySelector('span');
  const cur = parseInt(countEl.textContent) || 0;
  if (already) {
    delete reactionsStore[key];
    btn.classList.remove('reacted');
    countEl.textContent = cur > 1 ? cur - 1 : '';
  } else {
    reactionsStore[key] = true;
    btn.classList.add('reacted');
    countEl.textContent = cur + 1;
    btn.style.transform = 'scale(1.3)';
    setTimeout(() => btn.style.transform = '', 300);
  }
  localStorage.setItem('nt_reactions', JSON.stringify(reactionsStore));
};

// Restore reacted state on render
function restoreReactions() {
  Object.keys(reactionsStore).forEach(key => {
    const [postId, emoji] = key.split('_');
    const bar = document.getElementById(`reactions-${postId}`);
    if (!bar) return;
    bar.querySelectorAll('.reaction-btn').forEach(btn => {
      if (btn.textContent.startsWith(emoji)) btn.classList.add('reacted');
    });
  });
}

// ===== 10. PWA INSTALL =====
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  // Show banner after 5 seconds if not dismissed
  const dismissed = localStorage.getItem('nt_pwa_dismissed');
  if (!dismissed) {
    setTimeout(() => {
      document.getElementById('pwa-install-banner')?.classList.add('show');
    }, 5000);
  }
});

window.installPWA = async () => {
  if (!deferredInstallPrompt) return;
  document.getElementById('pwa-install-banner')?.classList.remove('show');
  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  if (result.outcome === 'accepted') showToast('NewsTally installed! 🎉');
  deferredInstallPrompt = null;
};

window.dismissPWA = () => {
  document.getElementById('pwa-install-banner')?.classList.remove('show');
  localStorage.setItem('nt_pwa_dismissed', '1');
};

// ===== INIT ALL NEW FEATURES =====
setTimeout(() => {
  applyFontSize();
  // Ticker loads after news data
}, 800);

// Ticker init called after news loads
const _origProcessNews = processNewsData;


// ============================================================
// 8 NEW FEATURES JS
// ============================================================

// ===== HELPER: CATEGORY COLOR CLASS =====
function getCatColorClass(cat) {
  if (!cat) return '';
  const c = cat.toLowerCase().replace(/\s+/g,'');
  const map = { politics:'cat-color-politics', sports:'cat-color-sports',
    technology:'cat-color-technology', tech:'cat-color-tech',
    entertainment:'cat-color-entertainment', business:'cat-color-business',
    health:'cat-color-health', science:'cat-color-science',
    environment:'cat-color-environment', world:'cat-color-world' };
  return map[c] ? ` ${map[c]}` : '';
}

// ===== VERIFIED SOURCES =====
const VERIFIED_SOURCES = ['ndtv','times of india','toi','hindustan times','the hindu',
  'bbc','cnn','reuters','ap','pti','ani','zee news','aaj tak','india today',
  'economic times','mint','livemint','bloomberg','wsj','guardian','assam tribune'];
function isVerifiedSource(src) {
  return VERIFIED_SOURCES.some(v => (src||'').toLowerCase().includes(v));
}

// ===== STAR RATING (localStorage) =====
const ratingsStore = JSON.parse(localStorage.getItem('nt_ratings') || '{}');
function renderStars(id) {
  const r = ratingsStore[id] || 0;
  return [1,2,3,4,5].map(n =>
    `<button class="star-btn ${n<=r?'active':''}" onclick="rateNews('${id}',${n})"
      onmouseover="hoverStars('${id}',${n})" onmouseout="resetStarHover('${id}')"
    >★</button>`
  ).join('');
}
function getRatingLabel(id) {
  const r = ratingsStore[id];
  return r ? ['','Poor','Fair','Good','Great','Excellent'][r] : '';
}
window.rateNews = (id, stars) => {
  ratingsStore[id] = stars;
  localStorage.setItem('nt_ratings', JSON.stringify(ratingsStore));
  const container = document.getElementById(`stars-${id}`);
  if (container) container.innerHTML = renderStars(id);
  const lbl = document.getElementById(`rating-label-${id}`);
  if (lbl) lbl.textContent = getRatingLabel(id);
  showToast(['','Poor','Fair','Good','Great','Excellent'][stars] + ' ★');
};
window.hoverStars = (id, n) => {
  const container = document.getElementById(`stars-${id}`);
  if (!container) return;
  container.querySelectorAll('.star-btn').forEach((b,i) => {
    b.classList.toggle('active', i < n);
  });
};
window.resetStarHover = (id) => {
  const container = document.getElementById(`stars-${id}`);
  if (!container) return;
  const r = ratingsStore[id] || 0;
  container.querySelectorAll('.star-btn').forEach((b,i) => {
    b.classList.toggle('active', i < r);
  });
};

// ===== READING HISTORY =====
let readingHistory = JSON.parse(localStorage.getItem('nt_history') || '[]');

function addToHistory(item) {
  readingHistory = readingHistory.filter(h => h.id !== item.id);
  readingHistory.unshift({ id: item.id, title: item.title, image: item.image, category: item.category, ts: Date.now() });
  if (readingHistory.length > 20) readingHistory.pop();
  localStorage.setItem('nt_history', JSON.stringify(readingHistory));
  renderReadingHistory();
}

function renderReadingHistory() {
  const section = document.getElementById('reading-history-section');
  const list = document.getElementById('reading-history-list');
  if (!section || !list) return;
  if (readingHistory.length === 0) { section.style.display = 'none'; return; }
  section.style.display = '';
  list.innerHTML = readingHistory.slice(0, 8).map(h => {
    const item = allNewsData.find(n => n.id === h.id) || h;
    return `<div class="history-chip" onclick="openNewsDetail(${JSON.stringify(item).replace(/"/g,'&quot;')})">
      <img src="${h.image || 'https://placehold.co/36x36/e8f0fe/1a73e8?text=N'}" onerror="this.src='https://placehold.co/36x36/e8f0fe/1a73e8?text=N'">
      <span class="history-chip-title">${h.title}</span>
    </div>`;
  }).join('');
}

window.clearReadingHistory = () => {
  readingHistory = [];
  localStorage.removeItem('nt_history');
  document.getElementById('reading-history-section').style.display = 'none';
};

// Hook into openNewsDetail to track history
const _origOpenNewsDetail = window.openNewsDetail;
window.openNewsDetail = (item) => {
  if (typeof item === 'string') item = JSON.parse(item);
  addToHistory(item);
  updateReadingStats(item);
  _origOpenNewsDetail(item);
};

// Override openPage for news-detail-page to also update URL
const _baseOpenPage = window.openPage;
window.openPage = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  window.history.pushState({ page: id }, '', window.location.pathname + window.location.search);
  if (!_pageStack.includes(id)) _pageStack.push(id);
};

// ===== READING STATS =====
let readingStats = JSON.parse(localStorage.getItem('nt_stats') || '{"today":0,"week":0,"total":0,"lastDate":"","categories":{}}');

function updateReadingStats(item) {
  const today = new Date().toDateString();
  if (readingStats.lastDate !== today) {
    readingStats.today = 0;
    readingStats.lastDate = today;
  }
  readingStats.today++;
  readingStats.week = (readingStats.week || 0) + 1;
  readingStats.total = (readingStats.total || 0) + 1;
  if (item.category) readingStats.categories[item.category] = (readingStats.categories[item.category]||0)+1;
  localStorage.setItem('nt_stats', JSON.stringify(readingStats));
  updateStreakBadge();
}

// ===== READING STREAK =====
let streakData = JSON.parse(localStorage.getItem('nt_streak') || '{"count":0,"lastDate":""}');

function updateStreakBadge() {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now()-86400000).toDateString();
  if (streakData.lastDate === today) { /* already counted */ }
  else if (streakData.lastDate === yesterday) { streakData.count++; streakData.lastDate = today; }
  else { streakData.count = 1; streakData.lastDate = today; }
  localStorage.setItem('nt_streak', JSON.stringify(streakData));
  // Show streak in swipe mode
  const badge = document.getElementById('swipe-streak-badge');
  const num = document.getElementById('swipe-streak-num');
  if (badge && streakData.count >= 2) { badge.style.display='inline-flex'; if(num) num.textContent = streakData.count; }
}

// ===== PERSONALIZED FEED (For You) =====
let preferredTopics = JSON.parse(localStorage.getItem('nt_topics') || '[]');

function checkShowForYouBtn() {
  const btn = document.getElementById('for-you-btn');
  if (!btn) return;
  // Show if user has stats or saved topics
  const topCat = getTopCategory();
  if (topCat || preferredTopics.length > 0) btn.style.display = 'inline-flex';
}

function getTopCategory() {
  const cats = readingStats.categories || {};
  if (!Object.keys(cats).length) return null;
  return Object.entries(cats).sort((a,b)=>b[1]-a[1])[0]?.[0];
}

window.showForYouFeed = () => {
  if (preferredTopics.length === 0 && !getTopCategory()) {
    // Show onboarding
    showTopicOnboarding();
    return;
  }
  const topics = preferredTopics.length ? preferredTopics : [getTopCategory()];
  filteredNews = allNewsData.filter(n => topics.some(t => (n.category||'').toLowerCase().includes(t.toLowerCase())));
  if (filteredNews.length === 0) filteredNews = [...allNewsData];
  displayedCount = 0;
  renderNewsGrid(true);
  document.getElementById('headlines-title').textContent = '⭐ For You';
  showToast('Showing personalized news!');
};

function showTopicOnboarding() {
  const cats = ['All', ...new Set(allNewsData.map(n=>n.category).filter(Boolean))].slice(0,12);
  const existing = document.getElementById('for-you-setup');
  if (existing) { existing.remove(); }
  const div = document.createElement('div');
  div.id = 'for-you-setup';
  div.innerHTML = `
    <i class="fas fa-star" style="font-size:28px;color:#fbbc04;margin-bottom:10px;display:block"></i>
    <p style="font-size:15px;font-weight:600;color:#202124;margin-bottom:6px">Personalize your feed</p>
    <p style="font-size:13px;color:#5f6368;margin-bottom:16px">Select topics you care about</p>
    <div style="margin-bottom:16px">${cats.filter(c=>c!=='All').map(c=>
      `<span class="topic-pill" onclick="toggleTopic('${c}',this)">${c}</span>`
    ).join('')}</div>
    <button onclick="saveTopicsAndShow()" style="background:#1a73e8;color:#fff;border:none;padding:10px 28px;border-radius:99px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--font-body)">Save & Show</button>
  `;
  const grid = document.getElementById('news-grid');
  grid?.parentNode.insertBefore(div, grid);
}

window.toggleTopic = (topic, el) => {
  const idx = preferredTopics.indexOf(topic);
  if (idx > -1) { preferredTopics.splice(idx,1); el.classList.remove('selected'); }
  else { preferredTopics.push(topic); el.classList.add('selected'); }
};

window.saveTopicsAndShow = () => {
  localStorage.setItem('nt_topics', JSON.stringify(preferredTopics));
  document.getElementById('for-you-setup')?.remove();
  showForYouFeed();
};

// ===== PULL TO REFRESH =====
let ptrStartY = 0, ptrCurrentY = 0, ptrActive = false;
const PTR_THRESHOLD = 80;

function initPullToRefresh() {
  const mainEl = document.documentElement;
  mainEl.addEventListener('touchstart', (e) => {
    if (window.scrollY > 10) return;
    ptrStartY = e.touches[0].clientY;
    ptrActive = true;
  }, { passive: true });

  mainEl.addEventListener('touchmove', (e) => {
    if (!ptrActive) return;
    ptrCurrentY = e.touches[0].clientY;
    const dist = Math.max(0, ptrCurrentY - ptrStartY);
    if (dist > 10) {
      const indicator = document.getElementById('pull-refresh-indicator');
      const icon = document.getElementById('ptr-icon');
      const text = document.getElementById('ptr-text');
      if (dist > PTR_THRESHOLD) {
        if (text) text.textContent = 'Release to refresh';
        if (icon) icon.style.transform = 'rotate(180deg)';
      } else {
        if (text) text.textContent = 'Pull to refresh';
        if (icon) icon.style.transform = `rotate(${dist*2}deg)`;
      }
      indicator?.classList.add('visible');
    }
  }, { passive: true });

  mainEl.addEventListener('touchend', async () => {
    if (!ptrActive) return;
    ptrActive = false;
    const dist = ptrCurrentY - ptrStartY;
    const indicator = document.getElementById('pull-refresh-indicator');
    if (dist > PTR_THRESHOLD) {
      indicator?.classList.add('loading');
      const icon = document.getElementById('ptr-icon');
      const text = document.getElementById('ptr-text');
      if (text) text.textContent = 'Refreshing...';
      newsCache = null; // clear cache
      await fetchNews();
      showToast('✅ News refreshed!');
    }
    setTimeout(() => indicator?.classList.remove('visible', 'loading'), 400);
    ptrCurrentY = 0; ptrStartY = 0;
  }, { passive: true });
}

// ===== SWIPE CARDS MODE =====
let swipeIdx = 0;
let swipeNews = [];
let isDragging = false, dragStartX = 0, dragStartY = 0, dragCard = null;

window.openSwipeMode = () => {
  swipeNews = [...filteredNews].slice(0, 30);
  swipeIdx = 0;
  document.getElementById('swipe-mode-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderSwipeCards();
  updateStreakBadge();
};

window.closeSwipeMode = () => {
  document.getElementById('swipe-mode-overlay').classList.remove('open');
  document.body.style.overflow = '';
};

function renderSwipeCards() {
  const stack = document.getElementById('swipe-card-stack');
  const progress = document.getElementById('swipe-progress-text');
  if (!stack) return;
  if (swipeIdx >= swipeNews.length) {
    stack.innerHTML = `<div style="text-align:center;padding:40px 20px"><i class="fas fa-check-circle" style="font-size:48px;color:#34a853;margin-bottom:16px;display:block"></i><p style="font-size:16px;font-weight:600;color:#202124">All caught up!</p><p style="font-size:13px;color:#9aa0a6;margin-top:6px">You've seen all ${swipeNews.length} articles</p><button onclick="closeSwipeMode()" style="margin-top:20px;background:#1a73e8;color:#fff;border:none;padding:12px 28px;border-radius:99px;font-size:14px;font-weight:700;cursor:pointer">Back to Feed</button></div>`;
    if (progress) progress.textContent = 'Done!';
    return;
  }
  if (progress) progress.textContent = `${swipeIdx + 1} / ${swipeNews.length}`;
  // Render top 2 cards
  const cards = swipeNews.slice(swipeIdx, swipeIdx + 2).map((item, i) => {
    const zIndex = 10 - i;
    const scale = 1 - i * 0.04;
    const yOff = i * 8;
    return `<div class="swipe-card" id="swipe-card-${i}" 
      style="z-index:${zIndex};transform:scale(${scale}) translateY(${yOff}px);transition:${i>0?'transform 0.3s':'none'}"
      ${i===0 ? `onmousedown="startSwipeDrag(event,this)" ontouchstart="startSwipeDrag(event,this)"` : ''}>
      <div class="swipe-hint-left" id="hint-skip-${i}">SKIP</div>
      <div class="swipe-hint-right" id="hint-read-${i}">READ</div>
      ${item.image ? `<img src="${item.image}" onerror="this.style.display='none'" loading="lazy">` : `<div style="height:50%;background:linear-gradient(135deg,#1a73e8,#4285f4);display:flex;align-items:center;justify-content:center"><img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" style="width:60px;height:60px;border-radius:50%;opacity:0.8"></div>`}
      <div class="swipe-card-body">
        <div class="swipe-card-cat">${item.category}</div>
        <div class="swipe-card-title">${item.title}</div>
        <div class="swipe-card-source">${item.source} · ${formatDate(item.date)}</div>
      </div>
    </div>`;
  }).join('');
  stack.innerHTML = cards;
  // Attach touch/mouse drag to top card
  const topCard = document.getElementById('swipe-card-0');
  if (topCard) attachSwipeDrag(topCard);
}

function attachSwipeDrag(card) {
  let startX = 0, startY = 0, curX = 0;
  const onStart = (e) => {
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    card.style.transition = 'none';
    card.classList.add('dragging');
  };
  const onMove = (e) => {
    curX = (e.touches ? e.touches[0].clientX : e.clientX) - startX;
    const curY = (e.touches ? e.touches[0].clientY : e.clientY) - startY;
    const rot = curX * 0.08;
    card.style.transform = `translateX(${curX}px) translateY(${curY*0.3}px) rotate(${rot}deg)`;
    const absX = Math.abs(curX);
    const skipHint = document.getElementById('hint-skip-0');
    const readHint = document.getElementById('hint-read-0');
    if (skipHint) skipHint.style.opacity = curX < -30 ? Math.min(1, absX/100) : 0;
    if (readHint) readHint.style.opacity = curX > 30 ? Math.min(1, absX/100) : 0;
    if (e.cancelable) e.preventDefault();
  };
  const onEnd = () => {
    card.classList.remove('dragging');
    if (curX > 100) { animateSwipe(card, 'right'); swipeCard('read'); }
    else if (curX < -100) { animateSwipe(card, 'left'); swipeCard('skip'); }
    else { card.style.transition = 'transform 0.4s cubic-bezier(.25,1,.5,1)'; card.style.transform = 'scale(1) translateY(0) rotate(0)'; }
    curX = 0;
  };
  card.addEventListener('touchstart', onStart, { passive: true });
  card.addEventListener('touchmove', onMove, { passive: false });
  card.addEventListener('touchend', onEnd);
  card.addEventListener('mousedown', onStart);
  document.addEventListener('mousemove', (e) => { if (!card.classList.contains('dragging')) return; onMove(e); });
  document.addEventListener('mouseup', onEnd, { once: true });
}

function animateSwipe(card, dir) {
  const x = dir === 'right' ? window.innerWidth + 100 : -(window.innerWidth + 100);
  card.style.transition = 'transform 0.35s ease-in';
  card.style.transform = `translateX(${x}px) rotate(${dir==='right'?20:-20}deg)`;
}

window.swipeCard = (action) => {
  const item = swipeNews[swipeIdx];
  if (!item) return;
  if (action === 'read') {
    openNewsDetail(item);
    addToHistory(item);
  } else if (action === 'save') {
    if (!savedNewsIds.has(item.id)) { savedNewsIds.add(item.id); localStorage.setItem('nt_saved_news', JSON.stringify([...savedNewsIds])); showToast('Saved!'); }
  }
  swipeIdx++;
  setTimeout(renderSwipeCards, action === 'read' ? 50 : 350);
};

// ===== LIVE TIMESTAMPS - update every 60s =====
function updateLiveTimestamps() {
  document.querySelectorAll('.live-time[data-ts]').forEach(el => {
    const ts = el.dataset.ts;
    if (ts) el.textContent = formatDate(ts);
  });
}
setInterval(updateLiveTimestamps, 60000);

// ===== INIT ALL =====
setTimeout(() => {
  renderReadingHistory();
  checkShowForYouBtn();
  updateStreakBadge();
}, 1000);

setTimeout(initPullToRefresh, 500);

// ===== INIT =====
initTheme();

// Safety: hide loading screen after max 8 seconds no matter what
setTimeout(() => hideLoading(), 8000);

fetchNews();