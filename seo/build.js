#!/usr/bin/env node
/**
 * SuperTasks — Programmatic SEO Page Generator
 * Run: node seo/build.js
 * Output: website/vs/[slug]/, website/alternatives/[slug]/
 */

const fs   = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const DATA_DIR    = path.join(__dirname, 'data');
const OUT_DIR     = path.join(__dirname, '..', 'website');
const YEAR        = new Date().getFullYear();

// ── Load data ─────────────────────────────────────────────────────────────────
const st = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'supertasks.json'), 'utf8'));
const competitorFiles = fs.readdirSync(path.join(DATA_DIR, 'competitors'))
  .filter(f => f.endsWith('.json'));
const competitors = competitorFiles.map(f =>
  JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'competitors', f), 'utf8'))
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('  ✓', filePath.replace(OUT_DIR, ''));
}

function check(val) { return val === true ? '✓' : val === false ? '✗' : '~'; }
function checkClass(val) { return val === true ? 'chk' : val === false ? 'crs' : 'prt'; }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Shared CSS ────────────────────────────────────────────────────────────────
function baseCSS() {
  return `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0A0A0A; --bg2: #0D0D0D; --surface: #111111;
    --border: rgba(255,255,255,0.06); --border2: rgba(255,255,255,0.10);
    --accent: #5B6AFF; --accent-d: #4a57e8; --accent-glow: rgba(91,106,255,0.18);
    --t1: #F5F5F5; --t2: rgba(245,245,245,0.72); --t3: rgba(245,245,245,0.44); --t4: rgba(245,245,245,0.24);
    --green: #1DB954; --font: 'Sora', system-ui, sans-serif; --mono: 'JetBrains Mono', 'SF Mono', monospace;
  }
  html { scroll-behavior: smooth; }
  body { font-family: var(--font); background: var(--bg); color: var(--t1); -webkit-font-smoothing: antialiased; overflow-x: hidden; }
  a { color: inherit; text-decoration: none; }
  img { display: block; max-width: 100%; }

  /* Nav */
  nav { position: sticky; top: 0; z-index: 100; height: 60px; display: flex; align-items: center; justify-content: space-between; padding: 0 48px; background: rgba(10,10,10,0.92); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); }
  .nav-brand { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 700; letter-spacing: -0.02em; }
  .nav-icon { width: 26px; height: 26px; border-radius: 7px; background: linear-gradient(135deg, #5B47E0, #8B5CF6); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .nav-back { font-size: 12px; color: var(--t3); display: flex; align-items: center; gap: 6px; transition: color 0.15s; }
  .nav-back:hover { color: var(--t1); }
  .nav-dl { font-size: 13px; font-weight: 600; color: #fff; background: var(--accent); padding: 8px 18px; border-radius: 8px; transition: background 0.15s; }
  .nav-dl:hover { background: var(--accent-d); }

  /* Breadcrumb */
  .breadcrumb { font-family: var(--mono); font-size: 11px; color: var(--t4); padding: 20px 48px 0; letter-spacing: 0.06em; }
  .breadcrumb a { color: var(--t4); transition: color 0.15s; }
  .breadcrumb a:hover { color: var(--t2); }
  .breadcrumb span { margin: 0 8px; }

  /* Hero */
  .page-hero { padding: 56px 48px 64px; max-width: 860px; margin: 0 auto; }
  .page-eyebrow { font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); display: block; margin-bottom: 16px; }
  .page-hero h1 { font-size: clamp(32px, 4.5vw, 56px); font-weight: 800; letter-spacing: -0.04em; line-height: 1.06; margin-bottom: 18px; }
  .page-hero .intro { font-size: 16px; color: var(--t3); line-height: 1.75; max-width: 700px; }

  /* TL;DR */
  .tldr { background: var(--surface); border: 1px solid var(--border2); border-left: 3px solid var(--accent); border-radius: 10px; padding: 24px 28px; margin: 0 48px 48px; max-width: 800px; margin-left: auto; margin-right: auto; }
  .tldr-label { font-family: var(--mono); font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); margin-bottom: 10px; }
  .tldr p { font-size: 14px; color: var(--t2); line-height: 1.7; }

  /* Sections */
  .content { max-width: 860px; margin: 0 auto; padding: 0 48px 80px; }
  .content h2 { font-size: clamp(22px, 3vw, 34px); font-weight: 800; letter-spacing: -0.03em; margin-bottom: 20px; margin-top: 56px; }
  .content h2:first-child { margin-top: 0; }
  .content p { font-size: 15px; color: var(--t3); line-height: 1.75; margin-bottom: 16px; }
  .content p:last-child { margin-bottom: 0; }

  /* Feature list */
  .feat-list { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
  .feat-list li { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: var(--t2); line-height: 1.6; }
  .feat-list li::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex-shrink: 0; margin-top: 7px; }
  .feat-list.weak li::before { background: var(--t4); }

  /* Comparison table */
  .cmp-wrap { overflow-x: auto; margin: 24px 0; }
  table.cmp { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; min-width: 480px; }
  table.cmp th { font-size: 12px; font-weight: 700; padding: 14px 18px; background: var(--surface); color: var(--t3); border-bottom: 1px solid var(--border); text-align: center; letter-spacing: 0.04em; text-transform: uppercase; }
  table.cmp th:first-child { text-align: left; }
  table.cmp th.hl { background: rgba(91,106,255,0.1); color: var(--accent); }
  table.cmp td { font-size: 13px; padding: 12px 18px; text-align: center; color: var(--t3); border-bottom: 1px solid var(--border); background: var(--bg); }
  table.cmp td:first-child { text-align: left; color: var(--t2); font-weight: 500; }
  table.cmp td.hl { background: rgba(91,106,255,0.04); }
  table.cmp tr:last-child td { border-bottom: none; }
  .chk { color: var(--accent); } .crs { color: var(--t4); } .prt { color: rgba(255,200,80,0.8); }

  /* Who section cards */
  .who-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin: 20px 0; }
  .who-card { background: var(--bg); padding: 28px 24px; }
  .who-card h3 { font-size: 14px; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 14px; }
  .who-card h3 .badge { font-family: var(--mono); font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; margin-left: 8px; vertical-align: middle; }
  .who-card h3 .badge.us { background: rgba(91,106,255,0.15); color: var(--accent); }
  .who-card h3 .badge.them { background: rgba(255,255,255,0.06); color: var(--t3); }

  /* FAQ */
  .faq-item { border-bottom: 1px solid var(--border); padding: 20px 0; cursor: pointer; }
  .faq-item:first-of-type { border-top: 1px solid var(--border); }
  .faq-q { display: flex; align-items: center; justify-content: space-between; gap: 20px; font-size: 15px; font-weight: 600; user-select: none; }
  .faq-chevron { color: var(--t4); font-size: 18px; transition: transform 0.2s, color 0.2s; flex-shrink: 0; }
  .faq-item.open .faq-chevron { transform: rotate(45deg); color: var(--accent); }
  .faq-a { font-size: 14px; color: var(--t3); line-height: 1.8; max-height: 0; overflow: hidden; transition: max-height 0.3s ease, padding 0.3s ease; }
  .faq-item.open .faq-a { max-height: 400px; padding-top: 12px; }
  .faq-a code { font-family: var(--mono); font-size: 12px; background: var(--surface); border: 1px solid var(--border2); border-radius: 4px; padding: 1px 6px; color: var(--t2); }

  /* Alternatives list */
  .alt-cards { display: flex; flex-direction: column; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin: 20px 0; }
  .alt-card { background: var(--bg); padding: 22px 24px; display: grid; grid-template-columns: 1fr auto; align-items: start; gap: 16px; }
  .alt-card h3 { font-size: 15px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 6px; }
  .alt-card p { font-size: 13px; color: var(--t3); line-height: 1.65; }
  .alt-price { font-family: var(--mono); font-size: 11px; color: var(--t4); white-space: nowrap; padding-top: 3px; }
  .alt-card.featured { background: rgba(91,106,255,0.04); border-left: 2px solid var(--accent); }
  .alt-featured-label { font-family: var(--mono); font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); margin-bottom: 6px; display: block; }

  /* CTA */
  .cta-block { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 48px 40px; text-align: center; margin: 48px 0 0; }
  .cta-block h2 { font-size: clamp(26px, 3.5vw, 42px); font-weight: 800; letter-spacing: -0.04em; margin-bottom: 12px; }
  .cta-block p { font-size: 15px; color: var(--t3); margin-bottom: 32px; line-height: 1.65; }
  .btn-dl { display: inline-flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 700; color: #fff; background: var(--accent); padding: 15px 30px; border-radius: 10px; box-shadow: 0 0 40px rgba(91,106,255,0.25); transition: background 0.15s, transform 0.15s; }
  .btn-dl:hover { background: var(--accent-d); transform: translateY(-2px); }
  .cta-meta { font-family: var(--mono); font-size: 11px; color: var(--t4); margin-top: 14px; letter-spacing: 0.06em; }

  /* Footer */
  footer { border-top: 1px solid var(--border); padding: 48px 48px 40px; }
  .foot-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 40px; gap: 40px; }
  .foot-brand { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--t3); }
  .foot-links { display: flex; gap: 56px; }
  .foot-col h4 { font-family: var(--mono); font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--t4); margin-bottom: 14px; }
  .foot-col a { display: block; font-size: 13px; color: var(--t3); margin-bottom: 10px; transition: color 0.15s; }
  .foot-col a:hover { color: var(--t1); }
  .foot-bottom { display: flex; align-items: center; justify-content: space-between; padding-top: 24px; border-top: 1px solid var(--border); }
  .foot-right { font-family: var(--mono); font-size: 11px; color: var(--t4); }

  /* Responsive */
  @media (max-width: 700px) {
    nav, .breadcrumb { padding: 0 20px; }
    .breadcrumb { padding-top: 16px; padding-left: 20px; }
    .page-hero, .content { padding-left: 20px; padding-right: 20px; }
    .tldr { margin-left: 20px; margin-right: 20px; }
    .who-grid { grid-template-columns: 1fr; }
    .alt-card { grid-template-columns: 1fr; }
    footer { padding: 36px 20px 28px; }
    .foot-top { flex-direction: column; gap: 32px; }
    .foot-links { flex-direction: column; gap: 28px; }
  }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }
  `.trim();
}

// ── Shared head ──────────────────────────────────────────────────────────────
function headHTML({ title, desc, canon, extraStyle = '', ldJson = '' }) {
  return `<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <meta name="theme-color" content="#0A0A0A" />
  <link rel="canonical" href="${esc(canon)}" />
  <!-- Favicon -->
  <link rel="icon" type="image/png" href="${st.site_url}/favicon.png" />
  <link rel="apple-touch-icon" href="${st.site_url}/favicon.png" />
  <!-- OpenGraph -->
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image" content="${st.site_url}/og.png" />
  <meta property="og:image:width" content="2238" />
  <meta property="og:image:height" content="1246" />
  <meta property="og:url" content="${esc(canon)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="SuperTasks" />
  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image" content="${st.site_url}/og.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>${baseCSS()}${extraStyle}</style>
  ${ldJson ? `<script type="application/ld+json">${ldJson}</script>` : ''}
</head>`;
}

// ── Shared nav + footer ───────────────────────────────────────────────────────
function navHTML(backLabel, backHref) {
  return `
<nav>
  <a href="${st.site_url}" class="nav-brand">
    <div class="nav-icon">
      <svg width="13" height="13" viewBox="0 0 1024 1024" fill="none">
        <circle cx="310" cy="360" r="44" stroke="white" stroke-width="68" fill="none"/>
        <polyline points="289,360 306,378 334,344" stroke="white" stroke-width="68" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="310" cy="512" r="44" stroke="white" stroke-width="68" fill="none"/>
        <polyline points="289,512 306,530 334,496" stroke="white" stroke-width="68" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    </div>
    SuperTasks
  </a>
  <a href="${backHref}" class="nav-back">&#8592; ${esc(backLabel)}</a>
  <a href="${st.download_url}" class="nav-dl">Download Free</a>
</nav>`.trim();
}

function footerHTML() {
  return `
<footer>
  <div class="foot-top">
    <a href="${st.site_url}" class="foot-brand">
      <div class="nav-icon" style="width:20px;height:20px;border-radius:5px;">
        <svg width="10" height="10" viewBox="0 0 1024 1024" fill="none">
          <circle cx="310" cy="360" r="44" stroke="white" stroke-width="68" fill="none"/>
          <polyline points="289,360 306,378 334,344" stroke="white" stroke-width="68" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </div>
      SuperTasks
    </a>
    <div class="foot-links">
      <div class="foot-col">
        <h4><a href="${st.site_url}/vs/" style="color:inherit;">Compare</a></h4>
        <a href="${st.site_url}/vs/todoist">vs Todoist</a>
        <a href="${st.site_url}/vs/things-3">vs Things 3</a>
        <a href="${st.site_url}/vs/apple-reminders">vs Apple Reminders</a>
        <a href="${st.site_url}/vs/omnifocus">vs OmniFocus</a>
      </div>
      <div class="foot-col">
        <h4><a href="${st.site_url}/alternatives/" style="color:inherit;">Alternatives</a></h4>
        <a href="${st.site_url}/alternatives/todoist">Todoist alternatives</a>
        <a href="${st.site_url}/alternatives/things-3">Things 3 alternatives</a>
        <a href="${st.site_url}/alternatives/apple-reminders">Apple Reminders alternatives</a>
        <a href="${st.site_url}/alternatives/omnifocus">OmniFocus alternatives</a>
      </div>
    </div>
  </div>
  <div class="foot-bottom">
    <div class="foot-right">Free forever &nbsp;&middot;&nbsp; &copy; ${YEAR} Ali Mirza</div>
  </div>
</footer>`.trim();
}

function faqScript() {
  return `
<script>
  document.querySelectorAll('.faq-item').forEach(function(item) {
    item.querySelector('.faq-q').addEventListener('click', function() {
      var wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function(o) { o.classList.remove('open'); });
      if (!wasOpen) item.classList.add('open');
    });
  });
</script>`.trim();
}

// ── Schema: FAQPage ───────────────────────────────────────────────────────────
function faqSchema(faqs) {
  const items = faqs.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a }
  }));
  return JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items }, null, 2);
}

// ── Comparison table rows ─────────────────────────────────────────────────────
function cmpTableRows(c) {
  const rows = [
    ['Price',               st.price_display,         c.price_paid || c.price_free || 'Free'],
    ['No account needed',   st.requires_account===false, c.requires_account===false],
    ['Local storage',       st.local_storage,          c.local_storage],
    ['Keyboard-first',      st.keyboard_first,         c.keyboard_first],
    ['Command palette',     st.command_palette,        c.command_palette],
    ['Custom filtered views', st.custom_views,         c.custom_views],
    ['Open data format',    st.open_data,              c.open_data],
    ['Works offline',       st.offline,                c.offline],
    ['Free forever',        true,                      !c.price_paid],
  ];
  return rows.map(([label, stVal, cVal]) => `
    <tr>
      <td>${esc(label)}</td>
      <td class="hl"><span class="${checkClass(stVal)}">${stVal === st.price_display ? `<strong style="color:var(--accent)">${stVal}</strong>` : check(stVal)}</span></td>
      <td>${label === 'Price' ? esc(String(cVal)) : `<span class="${checkClass(cVal)}">${check(cVal)}</span>`}</td>
    </tr>`).join('');
}

// ── VS page template ──────────────────────────────────────────────────────────
function vsPage(c) {
  const title   = `SuperTasks vs ${c.name}: Which is right for you? (${YEAR})`;
  const desc    = `Honest comparison of SuperTasks vs ${c.name}. Pricing, keyboard shortcuts, data privacy, and which task manager is right for Mac users.`;
  const canon   = `${st.site_url}/vs/${c.slug}/`;
  const stWins  = st.strengths.slice(0, 5);
  const cWins   = c.strengths;
  const faqMarkup = c.faq.map(f => `
  <div class="faq-item">
    <div class="faq-q">${esc(f.q)}<span class="faq-chevron">+</span></div>
    <div class="faq-a">${esc(f.a)}</div>
  </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
${headHTML({ title, desc, canon, ldJson: faqSchema(c.faq) })}
<body>

${navHTML('All comparisons', `${st.site_url}/vs/`)}

<div class="breadcrumb">
  <a href="${st.site_url}">SuperTasks</a><span>/</span>
  <a href="${st.site_url}/vs/">Compare</a><span>/</span>
  SuperTasks vs ${esc(c.name)}
</div>

<div class="page-hero">
  <span class="page-eyebrow">Compare</span>
  <h1>SuperTasks vs ${esc(c.name)}</h1>
  <p class="intro">${esc(c.vs_intro)}</p>
</div>

<div class="tldr">
  <div class="tldr-label">TL;DR</div>
  <p>Choose <strong>SuperTasks</strong> if you want a free, keyboard-first Mac task manager with local data and zero subscription. Choose <strong>${esc(c.name)}</strong> if you need ${esc(c.best_for.toLowerCase())}.</p>
</div>

<div class="content">

  <h2>Side-by-side comparison</h2>
  <div class="cmp-wrap">
    <table class="cmp">
      <thead>
        <tr>
          <th></th>
          <th class="hl">SuperTasks</th>
          <th>${esc(c.name)}</th>
        </tr>
      </thead>
      <tbody>
        ${cmpTableRows(c)}
      </tbody>
    </table>
  </div>
  <p style="font-family:var(--mono);font-size:11px;color:var(--t4);">~ = partial support &nbsp;&middot;&nbsp; Last updated ${YEAR}</p>

  <h2>Where SuperTasks wins</h2>
  <ul class="feat-list">
    ${stWins.map(s => `<li>${esc(s)}</li>`).join('\n    ')}
  </ul>

  <h2>Where ${esc(c.name)} wins</h2>
  <ul class="feat-list">
    ${cWins.map(s => `<li>${esc(s)}</li>`).join('\n    ')}
  </ul>

  <h2>Who should choose which</h2>
  <div class="who-grid">
    <div class="who-card">
      <h3>SuperTasks <span class="badge us">Free</span></h3>
      <ul class="feat-list">
        <li>You want zero monthly cost — forever</li>
        <li>You live on the keyboard and want 22+ shortcuts</li>
        <li>You want your tasks stored on your Mac, not a server</li>
        <li>You're a solo Mac user who needs speed over features</li>
      </ul>
    </div>
    <div class="who-card">
      <h3>${esc(c.name)} <span class="badge them">${esc(c.price_paid || 'Free')}</span></h3>
      <ul class="feat-list">
        ${c.switch_reasons.map(r => `<li>${esc(r.replace(/^(Tired of|Don't want|Want|Need|Looking for|Use|Frustrated|Without) /i, '').replace(/^[a-z]/, m => m.toUpperCase()))}</li>`).join('\n        ')}
      </ul>
    </div>
  </div>

  <h2>Frequently asked questions</h2>
  ${faqMarkup}

  <p style="margin-top:40px;font-size:13px;color:var(--t4);">Also see: <a href="${st.site_url}/alternatives/${c.slug}" style="color:var(--accent);">Best ${esc(c.name)} alternatives for Mac →</a></p>

  <div class="cta-block">
    <h2>Try SuperTasks free</h2>
    <p>No account. No subscription. No cloud. Your tasks live on your Mac.<br>Download takes seconds — press C and you're moving.</p>
    <a href="${st.download_url}" class="btn-dl">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
      Download for Mac — Free
    </a>
    <p class="cta-meta">macOS 12+ &nbsp;&middot;&nbsp; Apple Silicon &nbsp;&middot;&nbsp; ~25 MB &nbsp;&middot;&nbsp; No account needed</p>
  </div>

</div>

${footerHTML()}
${faqScript()}
</body>
</html>`;
}

// ── Alternatives page template ────────────────────────────────────────────────
function alternativesPage(c) {
  const title = `Best ${c.name} Alternatives for Mac (${YEAR})`;
  const desc  = `Looking for a ${c.name} alternative? Compare the best options for Mac users. SuperTasks is free, keyboard-first, and stores your data locally — no subscription, no account.`;
  const canon = `${st.site_url}/alternatives/${c.slug}/`;
  const faqMarkup = c.faq.slice(0, 3).map(f => `
  <div class="faq-item">
    <div class="faq-q">${esc(f.q)}<span class="faq-chevron">+</span></div>
    <div class="faq-a">${esc(f.a)}</div>
  </div>`).join('');
  const otherAlts = (c.other_alternatives || []).map(a => `
  <div class="alt-card">
    <div>
      <h3>${esc(a.name)}</h3>
      <p>${esc(a.note)}</p>
    </div>
    <div class="alt-price">${esc(a.price)}</div>
  </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
${headHTML({ title, desc, canon, ldJson: faqSchema(c.faq.slice(0,3)) })}
<body>

${navHTML('All alternatives', `${st.site_url}/alternatives/`)}

<div class="breadcrumb">
  <a href="${st.site_url}">SuperTasks</a><span>/</span>
  <a href="${st.site_url}/alternatives/">Alternatives</a><span>/</span>
  ${esc(c.name)} Alternatives
</div>

<div class="page-hero">
  <span class="page-eyebrow">Alternatives</span>
  <h1>Best ${esc(c.name)} Alternatives for Mac (${YEAR})</h1>
  <p class="intro">${esc(c.alternatives_intro)}</p>
</div>

<div class="content">

  <h2>What to look for in a ${esc(c.name)} alternative</h2>
  <ul class="feat-list">
    <li>Low or no cost — if you're leaving ${esc(c.name)}, subscription fatigue is likely a factor</li>
    <li>Local data storage — your tasks shouldn't depend on someone else's uptime</li>
    <li>Keyboard shortcuts — the faster you can capture and triage, the better</li>
    <li>Mac-native feel — not a web app wrapped in a browser</li>
  </ul>

  <h2>The best ${esc(c.name)} alternatives</h2>

  <div class="alt-cards">
    <div class="alt-card featured">
      <div>
        <span class="alt-featured-label">Our top pick</span>
        <h3>SuperTasks</h3>
        <p>Free, keyboard-first, and local-first. Every action reachable from the keyboard via 22+ shortcuts and a ⌘K command palette. Your data lives in a SQLite file on your Mac — no account, no cloud, no subscription. The strongest free alternative to ${esc(c.name)} for Mac power users.</p>
        <ul class="feat-list" style="margin-top:12px;">
          ${st.strengths.slice(0, 4).map(s => `<li>${esc(s)}</li>`).join('\n          ')}
        </ul>
      </div>
      <div class="alt-price">Free</div>
    </div>
    ${otherAlts}
  </div>

  <h2>Quick comparison</h2>
  <div class="cmp-wrap">
    <table class="cmp">
      <thead>
        <tr>
          <th></th>
          <th class="hl">SuperTasks</th>
          <th>${esc(c.name)}</th>
        </tr>
      </thead>
      <tbody>
        ${cmpTableRows(c)}
      </tbody>
    </table>
  </div>

  <h2>Why people switch from ${esc(c.name)}</h2>
  <ul class="feat-list">
    ${c.switch_reasons.map(r => `<li>${esc(r)}</li>`).join('\n    ')}
  </ul>

  <h2>Frequently asked questions</h2>
  ${faqMarkup}

  <p style="margin-top:40px;font-size:13px;color:var(--t4);">Also see: <a href="${st.site_url}/vs/${c.slug}" style="color:var(--accent);">SuperTasks vs ${esc(c.name)}: full comparison →</a></p>

  <div class="cta-block">
    <h2>Switch to SuperTasks — it's free</h2>
    <p>No account. No subscription. Keyboard-first. Download and be productive in under a minute.</p>
    <a href="${st.download_url}" class="btn-dl">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
      Download for Mac — Free
    </a>
    <p class="cta-meta">macOS 12+ &nbsp;&middot;&nbsp; Apple Silicon &nbsp;&middot;&nbsp; ~25 MB &nbsp;&middot;&nbsp; No account needed</p>
  </div>

</div>

${footerHTML()}
${faqScript()}
</body>
</html>`;
}

// ── Index pages ───────────────────────────────────────────────────────────────
function vsIndexPage() {
  const cards = competitors.map(c => `
  <a href="${st.site_url}/vs/${c.slug}/" class="index-card">
    <div class="index-card-title">SuperTasks vs ${esc(c.name)}</div>
    <p>${esc(c.best_for)}</p>
    <span class="index-card-link">Read comparison &#8594;</span>
  </a>`).join('');

  const vsHubTitle = `SuperTasks vs. Other Task Managers — Comparison Hub (${YEAR})`;
  const vsHubDesc  = `Honest comparisons of SuperTasks vs Todoist, Things 3, OmniFocus, and Apple Reminders. See which keyboard-first Mac task manager is right for you.`;
  const vsHubCSS   = `
    .index-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; margin-top: 32px; }
    .index-card { background: var(--bg); padding: 28px 24px; display: flex; flex-direction: column; gap: 8px; transition: background 0.15s; }
    .index-card:hover { background: var(--surface); }
    .index-card-title { font-size: 16px; font-weight: 700; letter-spacing: -0.02em; }
    .index-card p { font-size: 13px; color: var(--t3); line-height: 1.6; flex: 1; }
    .index-card-link { font-family: var(--mono); font-size: 11px; color: var(--accent); letter-spacing: 0.06em; }`;

  return `<!DOCTYPE html>
<html lang="en">
${headHTML({ title: vsHubTitle, desc: vsHubDesc, canon: `${st.site_url}/vs/`, extraStyle: vsHubCSS })}
<body>
${navHTML('Back to SuperTasks', st.site_url)}
<div class="page-hero">
  <span class="page-eyebrow">Compare</span>
  <h1>SuperTasks vs. the competition</h1>
  <p class="intro">Honest, detailed comparisons to help you decide. We don't hide our weaknesses or misrepresent competitors.</p>
</div>
<div class="content">
  <div class="index-grid">${cards}</div>
  <div class="cta-block" style="margin-top:48px;">
    <h2>Ready to try SuperTasks?</h2>
    <p>Free forever. No account. Every action, one key.</p>
    <a href="${st.download_url}" class="btn-dl">Download for Mac — Free</a>
  </div>
</div>
${footerHTML()}
</body>
</html>`;
}

function alternativesIndexPage() {
  const cards = competitors.map(c => `
  <a href="${st.site_url}/alternatives/${c.slug}/" class="index-card">
    <div class="index-card-title">${esc(c.name)} Alternatives</div>
    <p>${esc(c.alternatives_intro.split('.')[0])}.</p>
    <span class="index-card-link">See alternatives &#8594;</span>
  </a>`).join('');

  const altHubTitle = `Task Manager Alternatives for Mac — SuperTasks (${YEAR})`;
  const altHubDesc  = `Looking to switch task managers? Explore the best alternatives to Todoist, Things 3, OmniFocus, and Apple Reminders for Mac — including SuperTasks, free forever.`;
  const altHubCSS   = `
    .index-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; margin-top: 32px; }
    .index-card { background: var(--bg); padding: 28px 24px; display: flex; flex-direction: column; gap: 8px; transition: background 0.15s; }
    .index-card:hover { background: var(--surface); }
    .index-card-title { font-size: 16px; font-weight: 700; letter-spacing: -0.02em; }
    .index-card p { font-size: 13px; color: var(--t3); line-height: 1.6; flex: 1; }
    .index-card-link { font-family: var(--mono); font-size: 11px; color: var(--accent); letter-spacing: 0.06em; }`;

  return `<!DOCTYPE html>
<html lang="en">
${headHTML({ title: altHubTitle, desc: altHubDesc, canon: `${st.site_url}/alternatives/`, extraStyle: altHubCSS })}
<body>
${navHTML('Back to SuperTasks', st.site_url)}
<div class="page-hero">
  <span class="page-eyebrow">Alternatives</span>
  <h1>Looking to switch task managers?</h1>
  <p class="intro">Whether you're leaving Todoist, Things 3, OmniFocus, or Apple Reminders, we've written an honest guide for each — including why SuperTasks might (or might not) be the right fit.</p>
</div>
<div class="content">
  <div class="index-grid">${cards}</div>
  <div class="cta-block" style="margin-top:48px;">
    <h2>SuperTasks is free forever</h2>
    <p>No account. No cloud. Keyboard-first. Download and be productive in under a minute.</p>
    <a href="${st.download_url}" class="btn-dl">Download for Mac — Free</a>
  </div>
</div>
${footerHTML()}
</body>
</html>`;
}

// ── Generate all pages ────────────────────────────────────────────────────────
console.log('\nSuperTasks — SEO Page Generator\n');

console.log('VS pages:');
competitors.forEach(c => {
  write(path.join(OUT_DIR, 'vs', c.slug, 'index.html'), vsPage(c));
});
write(path.join(OUT_DIR, 'vs', 'index.html'), vsIndexPage());

console.log('\nAlternatives pages:');
competitors.forEach(c => {
  write(path.join(OUT_DIR, 'alternatives', c.slug, 'index.html'), alternativesPage(c));
});
write(path.join(OUT_DIR, 'alternatives', 'index.html'), alternativesIndexPage());

const total = (competitors.length * 2) + 2;
console.log(`\n✓ Generated ${total} pages into website/\n`);
