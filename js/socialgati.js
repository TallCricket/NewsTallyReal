// NewsTally — Socialgati: Community Feed, Posts, Reactions, Polls

// ===== COMMUNITY FEED =====

// ====================================================
// SOCIALGATI REAL-TIME ACTIONS
// ====================================================

// ---- REAL-TIME LIKE ----
window.sgToggleLike = async (id, dbl = false) => {
  if (!currentUser) return openAuthModal();
  const btn = document.getElementById(`sg-like-${id}`);
  const icon = btn?.querySelector('i');
  const cnt = document.getElementById(`sg-lc-${id}`);
  if (!icon) return;

  const isLiked = icon.classList.contains('fas');
  if (isLiked && dbl) return; // already liked, no double-like

  // Optimistic UI
  icon.classList.toggle('fas', !isLiked);
  icon.classList.toggle('far', isLiked);
  btn?.classList.toggle('liked', !isLiked);
  if (!isLiked && btn) {
    btn.style.transform = 'scale(1.3)';
    setTimeout(()=>btn.style.transform='', 300);
  }
  const c = parseInt(cnt?.textContent) || 0;
  if (cnt) cnt.textContent = isLiked ? (c > 1 ? c-1 : '') : c+1;

  // Firebase update
  await updateDoc(
    doc(db, 'artifacts', APP_ID, 'public', 'data', 'reposts', id),
    { likes: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) }
  ).catch(e => console.warn('like err:', e));
};

// ---- REAL-TIME EMOJI REACTIONS ----
window.sgReact = async (postId, emoji, btn) => {
  if (!currentUser) return openAuthModal();

  // Field key safe for Firestore (remove variation selector)
  const emojiKey = emoji.replace(/️/g, '');
  const reactorKey = `${emojiKey}_${currentUser.uid}`;
  const postRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reposts', postId);

  const snap = await getDoc(postRef).catch(() => null);
  if (!snap?.exists()) return;

  const d = snap.data();
  const reactions = d.reactions || {};
  const reactors = d.reactors || {};
  const alreadyReacted = !!reactors[reactorKey];

  let newCount;
  if (alreadyReacted) {
    newCount = Math.max(0, (reactions[emojiKey] || 1) - 1);
    await updateDoc(postRef, {
      [`reactions.${emojiKey}`]: newCount,
      [`reactors.${reactorKey}`]: deleteField()
    }).catch(() => {});
    btn.classList.remove('reacted');
  } else {
    newCount = (reactions[emojiKey] || 0) + 1;
    await updateDoc(postRef, {
      [`reactions.${emojiKey}`]: newCount,
      [`reactors.${reactorKey}`]: true
    }).catch(() => {});
    btn.classList.add('reacted');
    btn.style.transform = 'scale(1.35)';
    setTimeout(() => btn.style.transform = '', 350);
  }

  // Update count in UI
  const countEl = btn.querySelector('.sg-r-count');
  if (countEl) countEl.textContent = newCount || '';
};

// ---- REAL-TIME POLL VOTE ----
window.sgVotePoll = async (postId, optionIdx) => {
  if (!currentUser) return openAuthModal();
  const postRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reposts', postId);
  const snap = await getDoc(postRef).catch(() => null);
  if (!snap?.exists()) return;

  const opts = snap.data().pollOptions || [];
  // Check if already voted
  if (opts.some(o => (o.voters || []).includes(currentUser.uid))) {
    showToast('You already voted!'); return;
  }
  opts[optionIdx].votes = (opts[optionIdx].votes || 0) + 1;
  opts[optionIdx].voters = [...(opts[optionIdx].voters || []), currentUser.uid];
  await updateDoc(postRef, { pollOptions: opts }).catch(() => {});
};

// ---- REAL-TIME BOOKMARK ----
window.sgToggleBookmark = async (id) => {
  if (!currentUser) return openAuthModal();
  const btn = document.getElementById(`sg-bm-${id}`);
  const icon = btn?.querySelector('i');
  const isSaved = userSavedPosts.includes(id);

  if (isSaved) userSavedPosts = userSavedPosts.filter(x => x !== id);
  else userSavedPosts.push(id);

  icon?.classList.toggle('fas', !isSaved);
  icon?.classList.toggle('far', isSaved);
  btn?.classList.toggle('bookmarked', !isSaved);

  await updateDoc(
    doc(db, 'users', currentUser.uid),
    { savedPosts: isSaved ? arrayRemove(id) : arrayUnion(id) }
  ).catch(() => {});
  showToast(isSaved ? 'Removed' : '🔖 Saved!');
};

// ---- SHARE POST ----
window.sgSharePost = (id, title) => {
  const url = `${location.origin}${location.pathname}?postid=${id}`;
  if (navigator.share) {
    navigator.share({ title: title || 'Socialgati Post', url }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(url).then(() => showToast('🔗 Link copied!'));
  }
};

// ---- SWITCH FEED TAB ----
window.switchSGFeed = (btn, type) => {
  document.querySelectorAll('.sg-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadSocialgati(true);
};


async function loadSocialgati(reset = true) {
  if (reset) {
    lastCommunityDoc = null;
    // Cancel existing real-time listener
    if (communityUnsub) { communityUnsub(); communityUnsub = null; }
  }

  const feed = document.getElementById('sg-feed');
  if (!feed) return;
  if (reset) feed.innerHTML = renderPostSkeleton();

  try {
    const baseQuery = query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'),
      orderBy('timestamp', 'desc'),
      limit(reset ? 15 : 10)
    );
    const q = (lastCommunityDoc && !reset) ? query(baseQuery, startAfter(lastCommunityDoc)) : baseQuery;

    if (reset) {
      // Use real-time listener for first page — live updates
      communityUnsub = onSnapshot(q, (snap) => {
        if (snap.empty) {
          feed.innerHTML = `<div style="text-align:center;padding:60px 20px;color:#9aa0a6;background:var(--card-bg)">
            <i class="fas fa-feather-alt" style="font-size:36px;display:block;margin-bottom:12px;opacity:0.4"></i>
            <p style="font-size:16px;font-weight:600">Nothing here yet</p>
            <p style="font-size:13px;margin-top:6px">Be the first to post on Socialgati!</p>
            ${currentUser ? '' : '<button onclick="openAuthModal()" style="margin-top:16px;background:#1a73e8;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--font-body)">Join & Post</button>'}
          </div>`;
          return;
        }
        // Re-render on any real-time change
        feed.innerHTML = '';
        snap.docs.forEach(d => {
          const div = document.createElement('div');
          div.innerHTML = renderPostCard(d.data(), d.id);
          if (div.firstElementChild) feed.appendChild(div.firstElementChild);
        });
        lastCommunityDoc = snap.docs[snap.docs.length - 1];
      }, (err) => {
        console.error('Socialgati feed error:', err);
        feed.innerHTML = `<div style="text-align:center;padding:40px;color:#9aa0a6">Could not load posts</div>`;
      });
    } else {
      // Load more — getDocs (no live listener for older posts)
      const snap = await getDocs(q);
      snap.docs.forEach(d => {
        const div = document.createElement('div');
        div.innerHTML = renderPostCard(d.data(), d.id);
        if (div.firstElementChild) feed.appendChild(div.firstElementChild);
      });
      lastCommunityDoc = snap.docs[snap.docs.length - 1];
    }
  } catch(e) {
    console.error('loadSocialgati error:', e);
    if (reset) feed.innerHTML = `<div style="text-align:center;padding:40px;color:#9aa0a6">Could not load posts. Check connection.</div>`;
  }
}

function renderPostSkeleton() {
  return `
    <div class="sg-post-skeleton">
      <div style="display:flex;gap:10px;align-items:flex-start">
        <div class="skeleton" style="width:44px;height:44px;border-radius:50%;flex-shrink:0"></div>
        <div style="flex:1">
          <div class="skeleton" style="height:14px;width:40%;margin-bottom:8px;border-radius:4px"></div>
          <div class="skeleton" style="height:12px;width:25%;margin-bottom:12px;border-radius:4px"></div>
          <div class="skeleton" style="height:16px;width:90%;margin-bottom:6px;border-radius:4px"></div>
          <div class="skeleton" style="height:16px;width:70%;border-radius:4px"></div>
        </div>
      </div>
    </div>
    <div class="sg-post-skeleton">
      <div style="display:flex;gap:10px;align-items:flex-start">
        <div class="skeleton" style="width:44px;height:44px;border-radius:50%;flex-shrink:0"></div>
        <div style="flex:1">
          <div class="skeleton" style="height:14px;width:35%;margin-bottom:8px;border-radius:4px"></div>
          <div class="skeleton" style="height:180px;border-radius:12px;margin-top:8px"></div>
        </div>
      </div>
    </div>`;
}

function renderPostCard(p, id) {
  const likes = p.likes || [];
  const isLiked = currentUser && likes.includes(currentUser.uid);
  const isBookmarked = userSavedPosts.includes(id);
  const av = p.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.username||'U')}&background=4285f4&color=fff`;
  const reactions = p.reactions || {};
  const EMOJIS = ['❤️','😂','😮','😢','🔥','🎉'];

  // Build content
  let contentHTML = '';
  if (p.type === 'poll') {
    const opts = p.pollOptions || [];
    const total = opts.reduce((s,o)=>s+(o.votes||0),0);
    const userVoted = opts.some(o=>(o.voters||[]).includes(currentUser?.uid));
    contentHTML = `<div class="sg-poll">
      <div class="sg-poll-question">${p.headline||'Vote below:'}</div>
      ${opts.map((o,i)=>{
        const pct = total ? Math.round((o.votes||0)/total*100) : 0;
        const voted = (o.voters||[]).includes(currentUser?.uid);
        return `<div class="sg-poll-option${voted?' voted':''}" onclick="sgVotePoll('${id}',${i})">
          <div class="sg-poll-fill" style="width:${userVoted?pct:0}%"></div>
          <span class="sg-poll-label">${o.text}</span>
          ${userVoted?`<span class="sg-poll-pct">${pct}%</span>`:''}
        </div>`;
      }).join('')}
      <div class="sg-poll-total">${total} vote${total!==1?'s':''} · ${userVoted?'Voted':'Tap to vote'}</div>
    </div>`;
  } else if (p.type === 'text') {
    contentHTML = `<div class="sg-post-body"><p class="sg-post-text" ondblclick="sgToggleLike('${id}',true)">${processText(p.headline||'')}</p></div>`;
  } else if (p.type === 'repost') {
    contentHTML = `
      <div class="sg-post-body" style="padding-bottom:4px">
        <p class="sg-post-text" style="font-size:13px;color:#9aa0a6"><i class="fas fa-retweet" style="color:#34a853;margin-right:4px"></i>Reposted from <strong>${p.newsSource||'NewsTally'}</strong></p>
      </div>
      <div class="sg-repost-embed" onclick="window.open('${p.newsUrl||'#'}','_blank')">
        ${p.image?`<img src="${p.image}" alt="news" loading="lazy" onerror="this.style.display='none'">`:''}
        <div class="sg-repost-embed-body">
          <div class="sg-repost-source">📰 ${p.newsSource||'News'}</div>
          <div class="sg-repost-title">${p.headline||''}</div>
        </div>
      </div>`;
  } else {
    contentHTML = `
      ${p.headline ? `<div class="sg-post-body"><p class="sg-post-text">${processText(p.headline)}</p></div>` : ''}
      ${p.image ? `<div class="sg-post-image" ondblclick="sgToggleLike('${id}',true)"><img src="${p.image}" loading="lazy" alt="post" onerror="this.parentElement.style.display='none'"></div>` : ''}`;
  }

  // Type badge
  const typeBadge = p.type === 'repost' ? '<span class="sg-type-badge sg-type-repost">↺ Repost</span>'
    : p.type === 'poll' ? '<span class="sg-type-badge sg-type-poll">📊 Poll</span>'
    : '';

  return `
    <article class="sg-post fade-up" id="post-${id}">
      <div class="sg-post-head">
        <img src="${av}" class="sg-post-av" onclick="openPublicProfile('${p.userId||''}')"
             onerror="this.src='https://ui-avatars.com/api/?name=U&background=4285f4&color=fff'">
        <div class="sg-post-meta">
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:2px">
            <span class="sg-post-username" onclick="openPublicProfile('${p.userId||''}')" style="cursor:pointer">${p.username||'User'}</span>
            ${typeBadge}
          </div>
          <div style="display:flex;align-items:center;gap:4px">
            <span class="sg-post-handle">@${p.username||'user'}</span>
            <span class="sg-post-dot">·</span>
            <span class="sg-post-time">${formatTimestamp(p.timestamp)}</span>
          </div>
        </div>
        <button class="sg-post-more" onclick="showPostMenu('${id}','${p.userId||''}')"><i class="fas fa-ellipsis"></i></button>
      </div>

      ${contentHTML}

      <!-- ACTION BAR -->
      <div class="sg-post-actions" onclick="event.stopPropagation()">
        <button id="sg-like-${id}" class="sg-action ${isLiked?'liked':''}" onclick="sgToggleLike('${id}')">
          <i class="${isLiked?'fas':'far'} fa-heart"></i>
          <span id="sg-lc-${id}">${likes.length||''}</span>
        </button>
        <button class="sg-action" onclick="openComments('${id}')">
          <i class="far fa-comment"></i>
          <span>${p.commentsCount||''}</span>
        </button>
        <button class="sg-action" onclick="sgSharePost('${id}','${(p.headline||p.title||'').replace(/'/g,'').substring(0,60)}')">
          <i class="fas fa-share-nodes"></i>
        </button>
        <button id="sg-bm-${id}" class="sg-action ${isBookmarked?'bookmarked':''}" onclick="sgToggleBookmark('${id}')">
          <i class="${isBookmarked?'fas':'far'} fa-bookmark"></i>
        </button>
      </div>

      <!-- EMOJI REACTIONS — real-time from DB -->
      <div class="sg-reactions" id="sg-rx-${id}" onclick="event.stopPropagation()">
        ${EMOJIS.map(e => {
          const cnt = reactions[e.replace(/️/g,'')] || reactions[e] || 0;
          const myReaction = currentUser && (p.reactors||{})[`${e}_${currentUser.uid}`];
          return `<button class="sg-reaction-pill${myReaction?' reacted':''}" onclick="sgReact('${id}','${e}',this)">
            ${e}<span class="sg-r-count">${cnt||''}</span>
          </button>`;
        }).join('')}
      </div>
    </article>`;
}

function renderPollInCard(p, id) {
  const opts = p.pollOptions || [];
  const total = opts.reduce((s, o) => s + (o.votes || 0), 0);
  return `<div style="padding:14px 14px 0">
    ${opts.map((o, i) => `
      <div class="poll-option" onclick="votePoll('${id}',${i})">
        <div class="poll-bar" style="width:${total?Math.round((o.votes||0)/total*100):0}%"></div>
        <span class="poll-label">${o.text}</span>
        <span class="poll-pct">${total?Math.round((o.votes||0)/total*100):0}%</span>
      </div>`).join('')}
    <p style="font-size:12px;color:var(--muted);margin-top:8px;margin-bottom:4px">${total} vote${total!==1?'s':''}</p>
  </div>`;
}

window.handleLoadMore = () => loadSocialgati(false);
window.switchSGFeed = (btn, type) => {
  document.querySelectorAll('.sg-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadSocialgati(true);
};