// ============================================================
//  Wedding Invitation – main script
// ============================================================

// ─────────────────────────────────────────────────────────────
//  방명록 DB (Supabase 또는 Firebase 중 택1)
//  ----------------------------------------------------------
//  둘 다 비어있으면 → localStorage (이 기기에만 저장)
//  Supabase 값이 있으면 → Supabase (추천)
//  Firebase 값이 있으면 → Firebase
//
//  ▶ Supabase 설정 (5분, 추천)
//   1) https://supabase.com → 회원가입 (GitHub 로그인 추천)
//   2) New project → DB password 만들고, region: Northeast Asia (Seoul) 선택
//   3) 좌측 SQL Editor → 아래 쿼리 붙여넣고 RUN:
//        create table messages (
//          id bigint generated always as identity primary key,
//          name text not null,
//          password text not null,
//          body text not null,
//          ts bigint not null
//        );
//        alter table messages enable row level security;
//        create policy "anyone can read"   on messages for select using (true);
//        create policy "anyone can insert" on messages for insert with check (true);
//        create policy "anyone can delete" on messages for delete using (true);
//   4) 좌측 Settings → API → Project URL과 anon public key 복사
//   5) 아래 SUPABASE_CONFIG에 붙여넣기 → 끝
//
//  ▶ Firebase 설정 (대안)
//   1) https://console.firebase.google.com → 프로젝트 추가
//   2) Realtime Database 생성 (asia-southeast1) → 규칙(Rules):
//        { "rules": { "messages": { ".read": true, ".write": true } } }
//   3) 프로젝트 설정 → 웹앱 추가 → config 복사 → 아래 FIREBASE_CONFIG에 붙여넣기
// ─────────────────────────────────────────────────────────────

const SUPABASE_CONFIG = {
  url: 'https://glblqusgjbdkbgntdhfw.supabase.co',          // 예: 'https://xxxxx.supabase.co'
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsYmxxdXNnamJka2JnbnRkaGZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNTQ5MzgsImV4cCI6MjA5MjczMDkzOH0.SAst9L0WYHx_3Fpdh4S4SI9ypQ1MDkLDmhNtspgCaqk',      // anon public key (공개되어도 안전)
};

const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  databaseURL: '',
  projectId: '',
};

const CONFIG = {
  weddingDate: new Date('2026-06-13T12:30:00'),
  groomName: '박익현',
  brideName: '최은서',
};

// 33 gallery photos exported from Figma (with crops applied)
const GALLERY_IMAGES = Array.from({ length: 33 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  const base = [
    'town_1','town_2','town_3','yellow_1','yellow_2','yellow_3','home_1','home_2','home_3',
    'night_1','night_2','night_3','class_1','class_2','class_3','blue_1','blue_2','blue_3',
    'univ_1','univ_2','univ_3','hi_1','hi_2','hi_3','stair_1','stair_2','stair_3',
    'green_1','green_2','green_3','smile_1','smile_2','smile_3'
  ][i];
  return `images/gallery/${n}_${base}.jpg`;
});
const PREVIEW_COUNT = 6; // first 6 shown directly, rest via "더보기"

const ACCOUNT_DATA = {
  groom: {
    title: '신랑측 계좌',
    rows: [
      { role: '신랑',   name: '박익현', bank: '국민은행', number: '937702-00-241666' },
      { role: '아버지', name: '박용조', bank: '국민은행', number: '808-21-0310-939' },
      { role: '어머니', name: '윤혜숙', bank: '국민은행', number: '802-24-0474317' },
    ],
  },
  bride: {
    title: '신부측 계좌',
    rows: [
      { role: '신부',   name: '최은서', bank: '카카오뱅크', number: '3333-15-6610971' },
      { role: '아버지', name: '최병석', bank: '국민은행', number: '049-21-0938686' },
      { role: '어머니', name: '김윤정', bank: '국민은행', number: '282401-04-112397' },
    ],
  },
};

// ============================================================
//  DOM helpers
// ============================================================
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function formatDate(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

// ─────────────────────────────────────────────────────────────
//  D-Day counter
// ─────────────────────────────────────────────────────────────
function renderDDay() {
  const el = document.getElementById('dday-counter');
  if (!el) return;
  const now = new Date();
  const target = CONFIG.weddingDate;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const wedDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diff = Math.round((wedDay - today) / (1000 * 60 * 60 * 24));
  if (diff > 0) el.textContent = `D-${diff}`;
  else if (diff === 0) el.textContent = `D-Day`;
  else el.textContent = `D+${Math.abs(diff)}`;
}

// ============================================================
//  Gallery + Lightbox (swipe + keyboard)
// ============================================================
let lightboxIndex = 0;

function renderGalleryPreview() {
  const wrap = $('#gallery-preview');
  if (!wrap) return;
  wrap.innerHTML = GALLERY_IMAGES.slice(0, PREVIEW_COUNT)
    .map((src, i) => `<img src="${src}" alt="갤러리 ${i + 1}" data-idx="${i}" loading="lazy">`)
    .join('');
  wrap.addEventListener('click', e => {
    if (e.target.tagName === 'IMG') {
      openLightbox(parseInt(e.target.dataset.idx, 10));
    }
  });
}

function renderGalleryModal() {
  const grid = $('#gallery-modal-grid');
  if (!grid) return;
  grid.innerHTML = GALLERY_IMAGES
    .map((src, i) => `<img src="${src}" alt="갤러리 ${i + 1}" data-idx="${i}" loading="lazy">`)
    .join('');
  grid.addEventListener('click', e => {
    if (e.target.tagName === 'IMG') {
      openLightbox(parseInt(e.target.dataset.idx, 10));
    }
  });
  const counter = $('#gallery-modal-count');
  if (counter) counter.textContent = `${GALLERY_IMAGES.length} PHOTOS`;
}

function setupGalleryModal() {
  const modal = $('#gallery-modal');
  $('#gallery-more').addEventListener('click', () => {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
  $('#gallery-modal-close').addEventListener('click', closeGalleryModal);
  modal.addEventListener('click', e => {
    if (e.target === modal) closeGalleryModal();
  });
}
function closeGalleryModal() {
  $('#gallery-modal').classList.remove('open');
  if (!$('.lightbox.open')) document.body.style.overflow = '';
}

function openLightbox(idx) {
  lightboxIndex = idx;
  const lb = $('#lightbox');
  const total = GALLERY_IMAGES.length;
  const prevIdx = (idx - 1 + total) % total;
  const nextIdx = (idx + 1) % total;
  $('#lightbox-img').src = GALLERY_IMAGES[idx];
  const prevThumb = $('#lightbox-prev-thumb');
  const nextThumb = $('#lightbox-next-thumb');
  if (prevThumb) prevThumb.src = GALLERY_IMAGES[prevIdx];
  if (nextThumb) nextThumb.src = GALLERY_IMAGES[nextIdx];
  $('#lightbox-counter').textContent = `${idx + 1} / ${total}`;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  $('#lightbox').classList.remove('open');
  if (!$('#gallery-modal').classList.contains('open')) {
    document.body.style.overflow = '';
  }
}
function prevImage() {
  lightboxIndex = (lightboxIndex - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length;
  openLightbox(lightboxIndex);
}
function nextImage() {
  lightboxIndex = (lightboxIndex + 1) % GALLERY_IMAGES.length;
  openLightbox(lightboxIndex);
}

function setupLightbox() {
  $('#lightbox-close').addEventListener('click', closeLightbox);
  $('#lightbox-prev').addEventListener('click', prevImage);
  $('#lightbox-next').addEventListener('click', nextImage);
  $('#lightbox').addEventListener('click', e => {
    if (e.target.id === 'lightbox') closeLightbox();
  });
  document.addEventListener('keydown', e => {
    if (!$('#lightbox').classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') prevImage();
    else if (e.key === 'ArrowRight') nextImage();
  });

  // Swipe (touch + mouse drag)
  const lb = $('#lightbox');
  let startX = 0, startY = 0, dragging = false;
  const onStart = (x, y) => { startX = x; startY = y; dragging = true; };
  const onEnd = (x, y) => {
    if (!dragging) return;
    dragging = false;
    const dx = x - startX, dy = y - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      dx > 0 ? prevImage() : nextImage();
    }
  };
  lb.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  lb.addEventListener('touchend', e => onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY));
  lb.addEventListener('mousedown', e => onStart(e.clientX, e.clientY));
  lb.addEventListener('mouseup', e => onEnd(e.clientX, e.clientY));
}

// ============================================================
//  Account modal
// ============================================================
function openAccountModal(side) {
  const data = ACCOUNT_DATA[side];
  if (!data) return;
  $('#account-modal-title').textContent = data.title;
  const body = $('#account-modal-body');
  body.innerHTML = data.rows.map(r => `
    <div class="acc-row">
      <div class="acc-row-info">
        <p class="acc-row-role">${r.role}</p>
        <p class="acc-row-name">${escapeHtml(r.name)}</p>
        <p class="acc-row-num">${r.bank} ${r.number}</p>
      </div>
      <button class="acc-row-copy" data-num="${r.number}">복사</button>
    </div>
  `).join('');
  body.querySelectorAll('.acc-row-copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.num);
        btn.textContent = '복사됨';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = '복사'; btn.classList.remove('copied'); }, 1400);
      } catch (e) {
        prompt('계좌번호 복사', btn.dataset.num);
      }
    });
  });
  $('#account-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function setupAccount() {
  $$('.acc-btn').forEach(btn => {
    btn.addEventListener('click', () => openAccountModal(btn.dataset.side));
  });
}

// ============================================================
//  Generic modal close
// ============================================================
function setupModalClose() {
  $$('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const which = btn.dataset.close;
      $(`#${which}-modal`).classList.remove('open');
      document.body.style.overflow = '';
    });
  });
  $$('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', e => {
      if (e.target === ov) {
        ov.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    $$('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    if (!$('#lightbox').classList.contains('open') && !$('#gallery-modal').classList.contains('open')) {
      document.body.style.overflow = '';
    }
  });
}

// ============================================================
//  Guestbook – Supabase / Firebase / localStorage 중 자동 선택
// ============================================================
const STORAGE_KEY = 'wedding_messages_v3';
const hasSupabase = () => SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey;
const hasFirebase = () => FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.databaseURL;

let dbBackend = null;       // 'supabase' | 'firebase' | 'local'
let supabaseClient = null;
let firebaseDb = null;
let firebaseRef = null;
let cachedMessages = [];

async function initBackend() {
  const status = $('#msg-status');
  if (hasSupabase()) {
    try {
      await initSupabase(status);
      return;
    } catch (e) {
      console.warn('Supabase init failed, trying Firebase…', e);
    }
  }
  if (hasFirebase()) {
    try {
      await initFirebase(status);
      return;
    } catch (e) {
      console.warn('Firebase init failed, falling back to localStorage:', e);
    }
  }
  initLocal(status);
}

async function initSupabase(statusEl) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

  const { data, error } = await supabaseClient
    .from('messages').select('*').order('ts', { ascending: false });
  if (error) throw error;
  cachedMessages = (data || []).map(r => ({ ...r, id: String(r.id) }));

  // Realtime updates
  supabaseClient
    .channel('messages-feed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async () => {
      const { data } = await supabaseClient
        .from('messages').select('*').order('ts', { ascending: false });
      cachedMessages = (data || []).map(r => ({ ...r, id: String(r.id) }));
      renderMessages();
    })
    .subscribe();

  dbBackend = 'supabase';
  statusEl.textContent = '☁ Supabase 저장 중';
  statusEl.classList.add('cloud');
  renderMessages();
}

async function initFirebase(statusEl) {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
  const { getDatabase, ref, onValue, push, remove } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
  const app = initializeApp(FIREBASE_CONFIG);
  firebaseDb = getDatabase(app);
  firebaseRef = ref(firebaseDb, 'messages');
  window.__fb = { push, remove, ref };
  onValue(firebaseRef, snap => {
    const val = snap.val() || {};
    cachedMessages = Object.entries(val).map(([id, m]) => ({ id, ...m }));
    renderMessages();
  });
  dbBackend = 'firebase';
  statusEl.textContent = '☁ Firebase 저장 중';
  statusEl.classList.add('cloud');
}

function initLocal(statusEl) {
  dbBackend = 'local';
  statusEl.textContent = '※ 이 기기에서만 저장됨';
  statusEl.classList.add('local');
  cachedMessages = loadLocal();
  renderMessages();
}

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveLocal(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

async function addMessage(name, password, body) {
  const ts = Date.now();
  if (dbBackend === 'supabase') {
    const { error } = await supabaseClient
      .from('messages').insert([{ name, password, body, ts }]);
    if (error) throw error;
  } else if (dbBackend === 'firebase') {
    const { push } = window.__fb;
    await push(firebaseRef, { name, password, body, ts });
  } else {
    const id = String(ts) + Math.random().toString(36).slice(2, 6);
    cachedMessages.push({ id, name, password, body, ts });
    saveLocal(cachedMessages);
    renderMessages();
  }
}

async function deleteMessage(id, password) {
  const msg = cachedMessages.find(m => String(m.id) === String(id));
  if (!msg) return false;
  if (msg.password !== password) return false;

  if (dbBackend === 'supabase') {
    const { error } = await supabaseClient
      .from('messages').delete().eq('id', Number(id));
    if (error) throw error;
  } else if (dbBackend === 'firebase') {
    const { ref, remove } = window.__fb;
    await remove(ref(firebaseDb, `messages/${id}`));
  } else {
    cachedMessages = cachedMessages.filter(m => m.id !== id);
    saveLocal(cachedMessages);
    renderMessages();
  }
  return true;
}

function renderMessages() {
  const list = $('#msg-list');
  const dots = $('#msg-dots');
  if (!list) return;

  if (cachedMessages.length === 0) {
    list.innerHTML = `
      <div class="msg-card">
        <div class="msg-card-head">
          <span class="msg-card-name">신랑 · 신부</span>
          <span class="msg-card-date">${formatDate(Date.now())}</span>
        </div>
        <div class="msg-card-body">첫 번째 축하의 글을 남겨주시면<br>오래도록 간직하겠습니다.</div>
      </div>
    `;
    if (dots) dots.innerHTML = '';
    return;
  }

  const sorted = [...cachedMessages].sort((a, b) => b.ts - a.ts);
  list.innerHTML = sorted.map(m => `
    <div class="msg-card" data-id="${m.id}">
      <div class="msg-card-head">
        <span class="msg-card-name">${escapeHtml(m.name)}</span>
        <span class="msg-card-date">${formatDate(m.ts)}</span>
      </div>
      <div class="msg-card-body">${escapeHtml(m.body)}</div>
      <button class="msg-card-delete" data-id="${m.id}" aria-label="삭제">×</button>
    </div>
  `).join('');
  list.querySelectorAll('.msg-card-delete').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      requestDelete(btn.dataset.id);
    });
  });

  // dots indicator
  if (dots) {
    dots.innerHTML = sorted.map((_, i) => `<span ${i === 0 ? 'class="active"' : ''}></span>`).join('');
  }

  updateDotsOnScroll();
}

function setupAutoScroll() {
  const list = $('#msg-list');
  if (!list || list.__autoScrollSetup) return;
  list.__autoScrollSetup = true;

  let userPaused = false;
  let pauseUntil = 0;

  const pause = (ms = 6000) => {
    userPaused = true;
    pauseUntil = Date.now() + ms;
  };
  list.addEventListener('pointerdown', () => pause(6000), { passive: true });
  list.addEventListener('touchstart', () => pause(6000), { passive: true });
  list.addEventListener('wheel',      () => pause(6000), { passive: true });

  setInterval(() => {
    if (userPaused) {
      if (Date.now() > pauseUntil) userPaused = false;
      else return;
    }
    if (cachedMessages.length < 2) return;
    const cards = list.querySelectorAll('.msg-card');
    if (cards.length === 0) return;
    const cardW = cards[0].offsetWidth;
    const gap = 14;
    const step = cardW + gap;
    const max = list.scrollWidth - list.clientWidth;
    if (list.scrollLeft >= max - 4) {
      list.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      list.scrollBy({ left: step, behavior: 'smooth' });
    }
  }, 3500);
}

function updateDotsOnScroll() {
  const list = $('#msg-list');
  const dots = $('#msg-dots');
  if (!list || !dots || dots.children.length === 0) return;

  // throttle scroll handler
  if (list.__scrollHandler) list.removeEventListener('scroll', list.__scrollHandler);
  let raf = null;
  const handler = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      const cards = list.querySelectorAll('.msg-card');
      const center = list.scrollLeft + list.clientWidth / 2;
      let nearest = 0, minDist = Infinity;
      cards.forEach((card, i) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const d = Math.abs(cardCenter - center);
        if (d < minDist) { minDist = d; nearest = i; }
      });
      [...dots.children].forEach((dot, i) => {
        dot.classList.toggle('active', i === nearest);
      });
    });
  };
  list.__scrollHandler = handler;
  list.addEventListener('scroll', handler, { passive: true });
}

let pendingDeleteId = null;
function requestDelete(id) {
  pendingDeleteId = id;
  $('#delete-password').value = '';
  $('#delete-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#delete-password').focus(), 100);
}

function setupMessageForm() {
  $('#open-message-form').addEventListener('click', () => {
    $('#message-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  $('#message-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = (fd.get('name') || '').toString().trim();
    const password = (fd.get('password') || '').toString();
    const body = (fd.get('body') || '').toString().trim();
    if (!name || !password || !body) return;
    try {
      await addMessage(name, password, body);
      e.target.reset();
      $('#message-modal').classList.remove('open');
      document.body.style.overflow = '';
    } catch (err) {
      alert('전송 실패. 잠시 후 다시 시도해주세요.\n' + err.message);
    }
  });

  $('#delete-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (!pendingDeleteId) return;
    const pw = $('#delete-password').value;
    try {
      const ok = await deleteMessage(pendingDeleteId, pw);
      if (!ok) {
        alert('비밀번호가 일치하지 않습니다');
        return;
      }
      $('#delete-modal').classList.remove('open');
      document.body.style.overflow = '';
      pendingDeleteId = null;
    } catch (err) {
      alert('삭제 실패. 잠시 후 다시 시도해주세요.\n' + err.message);
    }
  });
}

// ============================================================
//  Map shortcut modal
// ============================================================
function setupMapModal() {
  const btn = $('#open-map-modal');
  if (!btn) return;
  btn.addEventListener('click', () => {
    $('#map-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  // Each app button: try app deep link; if it fails (mostly desktop), fallback to web URL.
  $$('.map-app-btn').forEach(a => {
    a.addEventListener('click', e => {
      const appUrl = a.getAttribute('href');
      const webUrl = a.dataset.fallback;
      const ua = navigator.userAgent || '';
      const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);

      if (!isMobile) {
        // Desktop → open web fallback directly
        e.preventDefault();
        window.open(webUrl, '_blank', 'noopener');
        return;
      }
      // Mobile → try app, fallback to web after a short delay
      e.preventDefault();
      const start = Date.now();
      const t = setTimeout(() => {
        if (Date.now() - start < 1800) window.location.href = webUrl;
      }, 1500);
      window.addEventListener('pagehide', () => clearTimeout(t), { once: true });
      window.location.href = appUrl;
    });
  });
}

// ============================================================
//  BGM
// ============================================================
const BGM_STATE_KEY = 'wedding_bgm_on';
function setupBgm() {
  const audio = $('#bgm');
  const btn = $('#bgm-toggle');
  if (!audio || !btn) return;

  // Default: try to play. If user previously toggled off, respect that.
  const stored = sessionStorage.getItem(BGM_STATE_KEY);
  let wantPlay = stored === null ? true : stored === '1';
  audio.volume = 0.5;

  const apply = () => {
    if (wantPlay) {
      const p = audio.play();
      if (p && p.then) p.then(() => markPlaying()).catch(() => markMuted());
      else markPlaying();
    } else {
      audio.pause();
      markMuted();
    }
  };
  const markPlaying = () => {
    btn.classList.add('playing');
    btn.classList.remove('muted');
    sessionStorage.setItem(BGM_STATE_KEY, '1');
  };
  const markMuted = () => {
    btn.classList.remove('playing');
    btn.classList.add('muted');
    sessionStorage.setItem(BGM_STATE_KEY, '0');
  };

  btn.addEventListener('click', () => {
    wantPlay = !wantPlay;
    apply();
  });

  // Browsers block autoplay until user interaction → start muted, then start on first interaction
  apply();
  if (wantPlay && audio.paused) {
    const startOnce = () => {
      if (!wantPlay) return;
      audio.play().then(markPlaying).catch(() => {});
    };
    ['pointerdown', 'touchstart', 'keydown', 'scroll'].forEach(ev => {
      document.addEventListener(ev, startOnce, { once: true, passive: true });
    });
  }
}

// ============================================================
//  Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  renderDDay();
  renderGalleryPreview();
  renderGalleryModal();
  setupGalleryModal();
  setupLightbox();
  setupAccount();
  setupMapModal();
  setupModalClose();
  setupMessageForm();
  setupBgm();
  setupAutoScroll();
  setupPhotoShare();
  setupShare();
  setupShuttle();
  initBackend();
});

// ============================================================
//  Shuttle bus — opening popup + registration to Supabase
// ============================================================
//  Supabase 테이블 셋업 (SQL Editor에서 한 번 실행):
//    create table shuttle (
//      id bigint generated always as identity primary key,
//      name text not null,
//      phone text not null,
//      side text not null check (side in ('groom', 'bride')),
//      count int not null default 1,
//      ts bigint not null
//    );
//    alter table shuttle enable row level security;
//    create policy "anyone can read"   on shuttle for select using (true);
//    create policy "anyone can insert" on shuttle for insert with check (true);
// ─────────────────────────────────────────────────────────────
const SHUTTLE_SEEN_KEY = 'wedding_shuttle_notice_seen_v1';
const SHUTTLE_TABLE = 'shuttle';

function openShuttleNotice() {
  const m = $('#shuttle-notice-modal');
  if (!m) return;
  m.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeShuttleNotice() {
  const m = $('#shuttle-notice-modal');
  if (!m) return;
  m.classList.remove('open');
  if (!document.querySelector('.modal-overlay.open')) {
    document.body.style.overflow = '';
  }
}
function openShuttleForm() {
  closeShuttleNotice();
  const m = $('#shuttle-form-modal');
  if (!m) return;
  m.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    const first = m.querySelector('input[name="name"]');
    if (first) first.focus();
  }, 80);
}

function setupShuttle() {
  // Show on first session entry
  const seen = sessionStorage.getItem(SHUTTLE_SEEN_KEY);
  if (!seen) {
    setTimeout(() => {
      openShuttleNotice();
      sessionStorage.setItem(SHUTTLE_SEEN_KEY, '1');
    }, 250);
  }

  // Re-open from directions section
  const reopenBtn = $('#reopen-shuttle-notice');
  if (reopenBtn) reopenBtn.addEventListener('click', openShuttleNotice);

  // "닫기" button inside notice (classic-btn style, not picked up by setupModalClose)
  $$('[data-close="shuttle-notice"]').forEach(btn => {
    btn.addEventListener('click', closeShuttleNotice);
  });
  $$('[data-close="shuttle-form"]').forEach(btn => {
    btn.addEventListener('click', () => {
      $('#shuttle-form-modal').classList.remove('open');
      if (!document.querySelector('.modal-overlay.open')) {
        document.body.style.overflow = '';
      }
    });
  });

  // "신청 하기" buttons (inside popup AND in-body section) → open form
  $$('#open-shuttle-form, #open-shuttle-form-inline').forEach(btn => {
    btn.addEventListener('click', openShuttleForm);
  });

  // Form submission → Supabase
  const form = $('#shuttle-form');
  const status = $('#shuttle-form-status');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const name  = (fd.get('name')  || '').toString().trim();
    const phone = (fd.get('phone') || '').toString().trim();
    const count = parseInt(fd.get('count'), 10) || 1;
    const side  = 'groom'; // 진주 출발 셔틀은 전원 신랑측
    if (!name || !phone) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    setShuttleStatus('전송 중…', '');

    try {
      await registerShuttle({ name, phone, side, count });
      setShuttleStatus('✓ 신청이 접수되었습니다. 감사합니다.', 'ok');
      form.reset();
      setTimeout(() => {
        $('#shuttle-form-modal').classList.remove('open');
        document.body.style.overflow = '';
        setShuttleStatus('', '');
      }, 1600);
    } catch (err) {
      console.error('shuttle register failed:', err);
      // Save to localStorage as a backup so the submission isn't lost
      saveShuttleLocal({ name, phone, side, count, ts: Date.now() });
      const detail = err && err.message ? err.message : String(err || '');
      setShuttleStatus(
        `전송 실패 — 임시로 이 기기에 저장됨 (${detail})`,
        'error'
      );
    } finally {
      submitBtn.disabled = false;
    }
  });

  function setShuttleStatus(text, kind) {
    if (!status) return;
    status.textContent = text;
    status.classList.remove('ok', 'error');
    if (kind) status.classList.add(kind);
  }
}

async function registerShuttle(payload) {
  const ts = Date.now();
  const row = { ...payload, ts };

  // Prefer Supabase
  if (dbBackend === 'supabase' && supabaseClient) {
    const { error } = await supabaseClient.from(SHUTTLE_TABLE).insert([row]);
    if (error) throw error;   // surfaced to caller for UI display
    return;
  }
  // Backend not ready / not configured → localStorage
  saveShuttleLocal(row);
}

function saveShuttleLocal(row) {
  const KEY = 'wedding_shuttle_local';
  const id = String(Date.now()) + Math.random().toString(36).slice(2, 6);
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(KEY)) || []; } catch {}
  arr.push({ ...row, id });
  localStorage.setItem(KEY, JSON.stringify(arr));
}

// ============================================================
//  Share – KakaoTalk + Link copy
// ============================================================
//  카카오톡 리치 카드(이미지 미리보기 포함)를 보내려면 Kakao JS SDK가 필요합니다.
//  1) https://developers.kakao.com → 내 애플리케이션 → 추가
//  2) 플랫폼 → Web → 사이트 도메인에 배포 URL 등록 (예: https://irenechoi.github.io)
//  3) 앱 키 → JavaScript 키 복사 → 아래 KAKAO_KEY에 붙여넣기
//  비워두면 Web Share API 또는 단순 링크 복사로 동작합니다.
const KAKAO_KEY = '';

function setupShare() {
  // KakaoTalk
  const kakaoBtn = $('#share-kakao');
  if (kakaoBtn) {
    kakaoBtn.addEventListener('click', () => shareToKakao());
  }
  // Link copy
  const linkBtn = $('#share-link');
  if (linkBtn) {
    linkBtn.addEventListener('click', () => copyLink());
  }
}

async function shareToKakao() {
  const url = location.href;
  const title = '박익현 · 최은서 결혼합니다';
  const desc  = '2026.06.13 SAT 12:30 PM · 더뉴컨벤션 르노브홀';

  // Try Kakao SDK first
  if (KAKAO_KEY) {
    try {
      await ensureKakaoSdk();
      if (!window.Kakao.isInitialized()) window.Kakao.init(KAKAO_KEY);
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title,
          description: desc,
          imageUrl: new URL('images/figma/og.jpg', location.href).href,
          link: { mobileWebUrl: url, webUrl: url },
        },
        buttons: [
          { title: '청첩장 보기', link: { mobileWebUrl: url, webUrl: url } },
        ],
      });
      return;
    } catch (e) {
      console.warn('Kakao share failed, falling back:', e);
    }
  }

  // Fallback: Web Share API (mobile) → otherwise copy link
  if (navigator.share) {
    try {
      await navigator.share({ title, text: desc, url });
      return;
    } catch {}
  }
  copyLink();
}

function ensureKakaoSdk() {
  return new Promise((resolve, reject) => {
    if (window.Kakao) return resolve();
    const s = document.createElement('script');
    s.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function copyLink() {
  const url = location.href;
  try {
    await navigator.clipboard.writeText(url);
    showToast('청첩장 링크를 복사했습니다');
  } catch {
    prompt('링크 복사:', url);
  }
}

function showToast(msg) {
  let t = document.getElementById('share-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'share-toast';
    t.className = 'share-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), 1800);
}

// ============================================================
//  Photo Share – Supabase Storage 'guest-photos' bucket
// ============================================================
const PHOTO_BUCKET = 'guest-photos';
let pendingPhotos = [];

function setupPhotoShare() {
  const openBtn   = $('#open-photo-share');
  const fileInput = $('#photo-input');
  const preview   = $('#photo-preview');
  const uploadBtn = $('#photo-upload-btn');
  const status    = $('#photo-upload-status');
  const nameInput = $('#photo-uploader-name');
  if (!openBtn) return;

  openBtn.addEventListener('click', () => {
    $('#photo-share-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
    setStatus('', '');
  });

  fileInput.addEventListener('change', e => {
    const incoming = Array.from(e.target.files);
    pendingPhotos = pendingPhotos.concat(incoming);
    fileInput.value = '';   // allow re-selecting same file
    renderPreview();
  });

  function renderPreview() {
    preview.innerHTML = pendingPhotos.map((f, i) => `
      <div class="photo-preview-item">
        <img src="${URL.createObjectURL(f)}" alt="">
        <button data-i="${i}" aria-label="제거">×</button>
      </div>
    `).join('');
    preview.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.i, 10);
        pendingPhotos.splice(i, 1);
        renderPreview();
      });
    });
  }

  function setStatus(text, kind) {
    status.textContent = text;
    status.classList.remove('ok', 'error');
    if (kind) status.classList.add(kind);
  }

  uploadBtn.addEventListener('click', async () => {
    if (pendingPhotos.length === 0) {
      setStatus('사진을 먼저 선택해주세요', 'error');
      return;
    }
    if (dbBackend !== 'supabase' || !supabaseClient) {
      setStatus('☁ Supabase 연결이 필요합니다', 'error');
      return;
    }

    const uploader = (nameInput.value || '').trim().replace(/[^a-zA-Z0-9가-힣_-]/g, '') || 'guest';
    uploadBtn.disabled = true;
    let done = 0, failed = 0;
    setStatus(`0 / ${pendingPhotos.length} 업로드 중...`, '');

    let lastError = null;
    for (const file of pendingPhotos) {
      try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const rand = Math.random().toString(36).slice(2, 8);
        const path = `${uploader}/${ts}_${rand}.${ext}`;
        const { error } = await supabaseClient.storage
          .from(PHOTO_BUCKET)
          .upload(path, file, { contentType: file.type, cacheControl: '3600' });
        if (error) throw error;
        done++;
        setStatus(`${done} / ${pendingPhotos.length} 업로드 중...`, '');
      } catch (err) {
        console.error('upload failed:', err);
        lastError = err;
        failed++;
      }
    }

    if (failed === 0) {
      setStatus(`✓ ${done}장 업로드 완료. 감사합니다.`, 'ok');
      pendingPhotos = [];
      renderPreview();
      setTimeout(() => {
        $('#photo-share-modal').classList.remove('open');
        document.body.style.overflow = '';
        setStatus('', '');
      }, 1800);
    } else {
      const detail = lastError && lastError.message ? lastError.message : '알 수 없는 오류';
      setStatus(`✓ ${done}장 성공 / ✗ ${failed}장 실패 (${detail})`, 'error');
    }
    uploadBtn.disabled = false;
  });
}
