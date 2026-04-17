/**
 * HotVibes Live Feed — Cloudflare Pages Function
 * Route: /api/feed?category=football|hiphop|tech|fashion|adult|ticker
 *
 * Requires: GNEWS_KEY in Cloudflare Pages → Settings → Environment Variables
 * Get a free key at gnews.io (100 req/day, works in production)
 */

const QUERIES = {
  football: 'football OR "Premier League" OR "Champions League" OR Bellingham OR Mbappe',
  hiphop:   '"hip hop" OR "rap music" OR Drake OR "Kendrick Lamar" OR "Travis Scott"',
  tech:     '"creator economy" OR "AI creator" OR "content creator" AI OR influencer technology',
  fashion:  '"fashion influencer" OR "luxury brand" OR "micro influencer" OR streetwear',
  adult:    '"creator economy" OR "content creator" OR "OnlyFans" OR "platform monetization"',
  ticker:   '"creator economy" OR influencer OR "brand deal" OR "content creator"',
};

const CACHE_TTL = 1800; // 30 minutes

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors() });
  }

  const url    = new URL(request.url);
  const cat    = url.searchParams.get('category') || 'ticker';
  const query  = QUERIES[cat] || QUERIES.ticker;
  const apiKey = env.GNEWS_KEY;

  if (!apiKey) {
    return json({
      error: 'GNEWS_KEY not set. Add it in Cloudflare Pages → Settings → Environment Variables.',
      articles: [],
    }, 500);
  }

  // Check edge cache first
  const cacheUrl = new Request(`https://hotvibes-cache.internal/gnews-${cat}`);
  const cache    = caches.default;
  const hit      = await cache.match(cacheUrl);

  if (hit) {
    const data = await hit.json();
    return json({ ...data, cached: true });
  }

  // Fetch from GNews
  try {
    const apiUrl = new URL('https://gnews.io/api/v4/search');
    apiUrl.searchParams.set('q',       query);
    apiUrl.searchParams.set('token',   apiKey);
    apiUrl.searchParams.set('lang',    'en');
    apiUrl.searchParams.set('max',     '10');
    apiUrl.searchParams.set('sortby',  'publishedAt');

    const res = await fetch(apiUrl.toString(), {
      headers: { 'User-Agent': 'HotVibes-Magazine/1.0' },
    });

    if (!res.ok) {
      const err = await res.text();
      return json({ error: `GNews ${res.status}`, detail: err, articles: [] }, 502);
    }

    const raw = await res.json();

    const articles = (raw.articles || [])
      .filter(a => a.title && a.image)
      .slice(0, 10)
      .map(a => ({
        title:       a.title,
        description: a.description || '',
        image:       a.image,
        url:         a.url,
        source:      a.source?.name || '',
        publishedAt: a.publishedAt,
      }));

    const payload = { articles, category: cat, cached: false, total: raw.totalArticles };

    // Store in edge cache for 30 min
    const cacheRes = new Response(JSON.stringify(payload), {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
        'Content-Type': 'application/json',
      },
    });
    await cache.put(cacheUrl, cacheRes);

    return json(payload);

  } catch (err) {
    return json({ error: err.message, articles: [] }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() },
  });
}

function cors() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
