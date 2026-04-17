/**
 * HotVibes Live Feed — Cloudflare Pages Function
 * Route: /api/feed?category=football|hiphop|tech|fashion|adult|ticker
 *
 * Set NEWSAPI_KEY in Cloudflare Pages → Settings → Environment Variables
 */

const QUERIES = {
  football: 'football OR "Premier League" OR "Champions League" OR Bellingham OR Mbappe',
  hiphop:   'hip hop OR rap OR Drake OR "Kendrick Lamar" OR "Travis Scott" OR "Central Cee"',
  tech:     '"creator economy" OR "AI creator" OR "content creator" AI OR "influencer tech"',
  fashion:  '"fashion influencer" OR "luxury brand" creator OR "micro influencer" fashion',
  adult:    '"creator economy" OR OnlyFans OR "adult creator" OR "content monetization"',
  ticker:   '"creator economy" OR influencer OR "content creator" OR "brand deal"',
};

const CACHE_TTL = 1800; // 30 minutes

export async function onRequest({ request, env }) {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  const url    = new URL(request.url);
  const cat    = url.searchParams.get('category') || 'ticker';
  const query  = QUERIES[cat] || QUERIES.ticker;
  const apiKey = env.NEWSAPI_KEY;

  if (!apiKey) {
    return json({ error: 'NEWSAPI_KEY not configured', articles: [] }, 500);
  }

  // Check Cloudflare edge cache
  const cacheUrl = new Request(`https://hotvibes-cache.internal/${cat}`);
  const cache    = caches.default;
  const hit      = await cache.match(cacheUrl);

  if (hit) {
    const data = await hit.json();
    return json({ ...data, cached: true });
  }

  // Fetch from NewsAPI
  try {
    const apiUrl = new URL('https://newsapi.org/v2/everything');
    apiUrl.searchParams.set('q',        query);
    apiUrl.searchParams.set('language', 'en');
    apiUrl.searchParams.set('sortBy',   'publishedAt');
    apiUrl.searchParams.set('pageSize', '12');
    apiUrl.searchParams.set('apiKey',   apiKey);

    const res  = await fetch(apiUrl.toString(), {
      headers: { 'User-Agent': 'HotVibes-Magazine/1.0' },
    });

    if (!res.ok) {
      const err = await res.text();
      return json({ error: `NewsAPI ${res.status}`, detail: err, articles: [] }, 502);
    }

    const raw = await res.json();

    const articles = (raw.articles || [])
      .filter(a => a.title && a.title !== '[Removed]' && a.urlToImage)
      .slice(0, 10)
      .map(a => ({
        title:       a.title,
        description: a.description || '',
        image:       a.urlToImage,
        url:         a.url,
        source:      a.source?.name || '',
        publishedAt: a.publishedAt,
      }));

    const payload = { articles, category: cat, cached: false, total: raw.totalResults };

    // Store in edge cache
    const cacheRes = new Response(JSON.stringify(payload), {
      headers: { 'Cache-Control': `public, max-age=${CACHE_TTL}`, 'Content-Type': 'application/json' },
    });
    await cache.put(cacheUrl, cacheRes);

    return json(payload);

  } catch (err) {
    return json({ error: err.message, articles: [] }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
