/* HotVibes Magazine — main.js */

document.addEventListener('DOMContentLoaded', () => {
  initFlameO();
  duplicateTickers();
  initScrollAnimations();
  initLiveFeed();
  initLightbox();
});

/* ── Flame O: replace "o" in .hot spans with Hotica flame glyph ── */
function initFlameO() {
  const d = 'M490.08698,538.80621c-.75066-3.55846-1.78922-7.03677-2.87669-10.37322-1.31945-4.04819-2.82802-9.64987-5.25432-12.72999-.71623-.90923-1.68965-1.62488-2.82187-2.06854-1.13012-.44369-2.37259-.59743-3.59139-.44641-1.41413.17523-2.9327.84518-3.86622,2.01608-1.13205,1.4199-1.05165,3.3641-1.69599,5.00085-.30705.77998-1.04878,1.81498-1.88379,1.88852-1.36994.12064-2.04562-.74914-2.36157-2.10854-2.02024-8.6932-6.78311-18.16763-12.60045-25.37731-7.28724-9.03394-17.10557-16.13298-28.43731-20.56144-.9983-.4226-2.09835-.61622-3.19839-.56396-1.09998.05226-2.17201.34831-3.11653.86084-.94667.51468-1.73996,1.22896-2.31073,2.08626-.57076.85513-.90163,1.82597-.9646,2.82412-.53736,8.51794-2.20916,17.032-5.36818,24.97752-1.58774,3.99347-3.58068,7.76234-5.92698,11.35923-3.01175,4.61703-7.47379,9.0421-10.4299,13.7998-16.4723,26.51127-3.20938,61.54314,24.27624,74.4738,3.18607,1.49889,6.52947,2.66341,9.96502,3.43805,3.66278.82588,7.41606,1.23935,11.17059,1.23935,29.20552,0,52.88127-24.82562,52.88127-55.44946,0-4.68612-.58728-9.54063-1.58822-14.28556Z';
  const svg = `<svg class="hot-o-flame" viewBox="400 468 95 155" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#fe9fb7" d="${d}"/></svg>`;
  document.querySelectorAll('.hot').forEach(el => {
    el.innerHTML = 'H' + svg + 't';
  });
}

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
