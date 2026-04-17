/* HotVibes Magazine — main.js */

document.addEventListener('DOMContentLoaded', () => {
  duplicateTickers();
  initScrollAnimations();
  initLiveFeed();
  initLightbox();
});

/* ── Ticker: duplicate items for seamless loop ─────────────── */
function duplicateTickers() {
  document.querySelectorAll('.ticker-track').forEach(t => {
    t.innerHTML += t.innerHTML;
  });
}

/* ── Scroll-triggered fade-up ──────────────────────────────── */
function initScrollAnimations() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.animationPlayState = 'running';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fu').forEach(el => {
    el.style.animationPlayState = 'paused';
    obs.observe(el);
  });
}

/* ── Live Feed ─────────────────────────────────────────────── */
function initLiveFeed() {
  // Only run on pages that have cereb sections or a live ticker
  hydrateTicker();
  hydrateCerebImages();
}

/* Fetch helper — falls back silently if API unavailable */
async function fetchFeed(category) {
  try {
    const res = await fetch(`/api/feed?category=${category}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* ── Live Ticker ───────────────────────────────────────────── */
async function hydrateTicker() {
  const track = document.querySelector('.ticker-track');
  if (!track) return;

  const data = await fetchFeed('ticker');
  if (!data?.articles?.length) return;

  // Build live items
  const colors = ['', 'b', 'g', 'v', 'a'];
  const items = data.articles.map((a, i) => {
    const dot = colors[i % colors.length];
    const source = a.source ? `<span style="opacity:.45;font-size:.75em">${a.source}</span> ` : '';
    return `<a class="ticker-item" href="${a.url}" target="_blank" rel="noopener">
      <span class="dot ${dot}"></span>${source}${truncate(a.title, 90)}
    </a>`;
  }).join('');

  // Replace static content with live content (doubled for loop)
  track.innerHTML = items + items;
}

/* ── Cereb Banner Images ───────────────────────────────────── */
function hydrateCerebImages() {
  // Map cereb sections to their feed category
  const map = [
    { selector: '.cereb-football', category: 'football' },
    { selector: '.cereb-hiphop',   category: 'hiphop'   },
    { selector: '.cereb-tech',     category: 'tech'      },
    { selector: '.cereb-fashion',  category: 'fashion'   },
    { selector: '.cereb-adult',    category: 'adult'     },
  ];

  // Use IntersectionObserver so we only fetch when section is near viewport
  const obs = new IntersectionObserver(async (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      obs.unobserve(entry.target);

      const cat     = entry.target.dataset.feedCategory;
      const banner  = entry.target.querySelector('.cereb-banner');
      if (!banner || !cat) continue;

      const data = await fetchFeed(cat);
      if (!data?.articles?.length) continue;

      // Find first article with a working image
      const article = data.articles.find(a => a.image);
      if (!article) continue;

      // Swap the image src and add a clickable link overlay
      const newImg = new Image();
      newImg.onload = () => {
        banner.src = article.image;
        banner.alt = article.title;

        // Inject "Read article →" link below the banner
        const existing = entry.target.querySelector('.cereb-article-link');
        if (!existing) {
          const link = document.createElement('a');
          link.href      = article.url;
          link.target    = '_blank';
          link.rel       = 'noopener';
          link.className = 'cereb-article-link';
          link.innerHTML = `<span class="dot"></span> ${truncate(article.title, 80)} <span style="opacity:.5">— ${article.source}</span> →`;
          banner.after(link);
        }
      };
      newImg.onerror = () => {}; // keep static fallback
      newImg.src = article.image;
    }
  }, { rootMargin: '200px' });

  map.forEach(({ selector, category }) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.dataset.feedCategory = category;
    obs.observe(el);
  });
}

/* ── Lightbox ──────────────────────────────────────────────── */
function initLightbox() {
  const imgs = Array.from(document.querySelectorAll('.mag-card img'));
  if (!imgs.length) return;

  const overlay = document.createElement('div');
  overlay.className = 'lb-overlay';
  overlay.innerHTML = `
    <button class="lb-close">✕</button>
    <button class="lb-arrow lb-prev">‹</button>
    <img class="lb-img" src="" alt="">
    <button class="lb-arrow lb-next">›</button>
    <div class="lb-counter"></div>
  `;
  document.body.appendChild(overlay);

  let cur = 0;
  const lbImg     = overlay.querySelector('.lb-img');
  const lbCounter = overlay.querySelector('.lb-counter');

  function open(n) {
    cur = (n + imgs.length) % imgs.length;
    lbImg.src = imgs[cur].src;
    lbImg.alt = imgs[cur].alt;
    lbCounter.textContent = `${cur + 1} / ${imgs.length}`;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  imgs.forEach((img, i) => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => open(i));
  });

  overlay.querySelector('.lb-close').addEventListener('click', close);
  overlay.querySelector('.lb-prev').addEventListener('click', e => { e.stopPropagation(); open(cur - 1); });
  overlay.querySelector('.lb-next').addEventListener('click', e => { e.stopPropagation(); open(cur + 1); });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape')      close();
    if (e.key === 'ArrowRight')  open(cur + 1);
    if (e.key === 'ArrowLeft')   open(cur - 1);
  });
}

/* ── Utils ─────────────────────────────────────────────────── */
function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max).trimEnd() + '…' : str;
}
