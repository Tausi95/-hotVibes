/**
 * HotVibes Live Feed — Cloudflare Pages Function
 * Route: /api/feed?category=football|hiphop|tech|fashion|adult|ticker
 *
 * Powered by The Guardian Open Platform (free, works in production)
 * Get a free key at: open-platform.theguardian.com/access/
 * Add GUARDIAN_KEY to Cloudflare Pages → Settings → Environment Variables
 */

const QUERIES = {
  football: { q: 'football OR "Premier League" OR "Champions League" OR Bellingham OR Mbappe',  section: 'sport'       },
  hiphop:   { q: '"hip hop" OR rap OR Drake OR "J. Cole" OR "Kendrick Lamar" OR "Travis Scott"', section: 'music'       },
  tech:     { q: '"creator economy" OR "content creator" OR influencer OR "AI tools"',           section: 'technology'  },
  fashion:  { q: 'fashion OR influencer OR streetwear OR "luxury brand"',                        section: 'fashion'     },
  adult:    { q: '"creator economy" OR "OnlyFans" OR "platform monetization" OR "adult industry"',section: 'business'   },
  ticker:   { q: '"creator economy" OR influencer OR "brand deal" OR "content creator"',         section: ''            },
};

const CACHE_TTL = 1800; // 30 minutes

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors() });
  }

  const url    = new URL(request.url);
  const cat    = url.searchParams.get('category') || 'ticker';
  const query  = QUERIES[cat] || QUERIES.ticker;
  const apiKey = env.GUARDIAN_KEY;

  if (!apiKey) {
    return json({
      error: 'GUARDIAN_KEY not set. Add it in Cloudflare Pages → Settings → Environment Variables.',
      articles: [],
    }, 500);
  }

  // Edge cache
  const cacheUrl = new Request(`https://hotvibes-cache.internal/guardian-${cat}`);
  const cache    = caches.default;
  const hit      = await cache.match(cacheUrl);

  if (hit) {
    const data = await hit.json();
    return json({ ...data, cached: true });
  }

  try {
    const apiUrl = new URL('https://content.guardianapis.com/search');
    apiUrl.searchParams.set('q',           query.q);
    apiUrl.searchParams.set('api-key',     apiKey);
    apiUrl.searchParams.set('show-fields', 'thumbnail,trailText,headline');
    apiUrl.searchParams.set('order-by',    'newest');
    apiUrl.searchParams.set('page-size',   '10');
    if (query.section) apiUrl.searchParams.set('section', query.section);

    const res = await fetch(apiUrl.toString(), {
      headers: { 'User-Agent': 'HotVibes-Magazine/1.0' },
    });

    if (!res.ok) {
      const err = await res.text();
      return json({ error: `Guardian API ${res.status}`, detail: err, articles: [] }, 502);
    }

    const raw = await res.json();

    const articles = (raw.response?.results || [])
      .filter(a => a.fields?.thumbnail)
      .slice(0, 10)
      .map(a => ({
        title:       a.webTitle,
        description: a.fields?.trailText || '',
        image:       a.fields?.thumbnail,
        url:         a.webUrl,
        source:      'The Guardian',
        publishedAt: a.webPublicationDate,
      }));

    const payload = { articles, category: cat, cached: false, total: raw.response?.total };

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
