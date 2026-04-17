# HotVibes Magazine

**Culture × Money × Attention**

A high-conversion digital magazine covering the creator economy — football, hip hop, tech, fashion, and adult industry — built on the Hotica brand. Drives traffic to [hotica.com](https://hotica.com) and [adultwork.com](https://adultwork.com).

---

## Live Site

Deployed on Cloudflare Pages. Each push to `master` auto-deploys.

---

## Project Structure

```
/
├── index.html                    Homepage — issue grid + masthead
├── issues/
│   └── 000/
│       └── index.html            Issue 000 — Culture Meets Capital
├── functions/
│   └── api/
│       └── feed.js               Cloudflare Pages Function — live NewsAPI proxy
├── assets/
│   ├── css/styles.css            Full design system (Hotica brand)
│   ├── js/main.js                Ticker, animations, live feed hydration
│   ├── fonts/                    Funnel Display + Funnel Sans (woff2)
│   └── images/
│       └── hotica-wordmark.svg   Transparent Hotica wordmark
├── lifestyle-magazine-assets/    Designed magazine page spreads (Issue 000)
├── data/
│   └── issues.json               Issue registry (title, date, link)
├── _headers                      Cloudflare cache rules
└── README.md
```

---

## Publishing System

### Issue Format

| Day | Format | Focus |
|---|---|---|
| Monday | Insight | Deep analysis, Cereb, strategy |
| Friday | Hype | Viral energy, fast takes, hard CTAs |

### Adding a New Issue

1. Create `issues/NNN/index.html` (copy 000 as template, update content)
2. Add entry to `data/issues.json`
3. Update the issue card in `index.html` (remove greyed-out state)
4. `git add . && git commit -m "Add Issue NNN" && git push`

Cloudflare deploys automatically on push.

### Scheduling Issues

Build the issue HTML ahead of time and keep the card greyed out on the homepage. When ready to publish, un-grey the card and push. One commit = issue goes live.

---

## Design System

Built on the Hotica brand guide.

### Colour Tokens

| Token | Value | Usage |
|---|---|---|
| `--pink` | `#fe9fb7` | Primary brand, CTAs, fashion |
| `--blue` | `#5b65bc` | AdultWork, secondary |
| `--electric` | `#4f8ef7` | Tech, sports platforms |
| `--green` | `#10b981` | Football, growth stats |
| `--violet` | `#9b7cf7` | Hip hop, culture |
| `--amber` | `#f5a623` | Money stats, LVMH angle |
| `--p-deep` | `#221d32` | Dark purple background |
| `--bg` | `#080612` | Page background |

### Typography

- **Funnel Display** — headings (ExtraBold 800, Bold 700)
- **Funnel Sans** — body (Regular 400, Medium 500, Bold 700)

Both served locally from `assets/fonts/` — no Google Fonts dependency.

### Cereb Section Classes

Each industry category has a colour-themed panel:

```html
<div class="cereb-hero cereb-football">  <!-- emerald green -->
<div class="cereb-hero cereb-hiphop">    <!-- violet -->
<div class="cereb-hero cereb-tech">      <!-- electric blue -->
<div class="cereb-hero cereb-fashion">   <!-- pink -->
<div class="cereb-hero cereb-adult">     <!-- deep purple -->
```

### Card Colour Variants

```html
<div class="card c-green">   <!-- green hover glow -->
<div class="card c-blue">    <!-- blue hover glow -->
<div class="card c-violet">  <!-- violet hover glow -->
<div class="card c-amber">   <!-- amber hover glow -->
```

---

## Live Data (NewsAPI)

The live feed is powered by a Cloudflare Pages Function that proxies NewsAPI. The API key never touches the browser.

### Endpoint

```
GET /api/feed?category=football|hiphop|tech|fashion|adult|ticker
```

Returns JSON:
```json
{
  "articles": [
    {
      "title": "...",
      "description": "...",
      "image": "https://...",
      "url": "https://...",
      "source": "BBC Sport",
      "publishedAt": "2026-04-21T..."
    }
  ],
  "category": "football",
  "cached": true
}
```

Responses are cached at Cloudflare's edge for 30 minutes.

### Setup

1. Sign up at [newsapi.org](https://newsapi.org) — free tier (100 req/day)
2. Go to Cloudflare Pages → your project → **Settings → Environment Variables**
3. Add: `NEWSAPI_KEY` = your API key
4. Redeploy (push any change or click Retry in dashboard)

> **Never put the API key in any file or commit it to git.**

### What Goes Live

- **Ticker** — replaced with real headlines on page load
- **Cereb banners** — swapped with real news article images as sections scroll into view
- **Fallback** — static content shown automatically if API is unavailable

---

## Deployment

### Cloudflare Pages Settings

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | *(leave empty)* |
| Build output directory | `/` (root) |
| Branch | `master` |

### Environment Variables

| Name | Description |
|---|---|
| `NEWSAPI_KEY` | NewsAPI key — set in Cloudflare dashboard only |

### Caching

The `_headers` file configures:
- HTML pages: no cache (always fresh)
- `assets/*`: 1 year immutable cache (fonts, CSS, JS, images)

---

## Conversion Funnel

Every issue drives to two destinations:

| Platform | CTA Copy | Audience |
|---|---|---|
| [hotica.com](https://hotica.com) | "Turn Up the Heat" | Creators, fans |
| [adultwork.com](https://adultwork.com) | "Start Earning" | UK creator market |

Primary CTA (hero button) uses `.btn-pink.pulse` — animated glow to draw the eye.

---

## Roadmap

- [x] Issue 000 — Culture Meets Capital (Monday Insight)
- [ ] Issue 001 — The Heat Index (Friday Hype)
- [ ] Issue 002 — New Money (Monday Insight)
- [ ] Category archive pages (football, hiphop, tech, fashion)
- [ ] Email capture integration
- [ ] Automated issue scheduling via Cloudflare Cron Triggers
