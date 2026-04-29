import type { SiteConfig } from './types'

function escHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

export function docsHtml(config: SiteConfig): string {
	const { siteName, siteUrl, apiUrl, githubUrl } = config
	const e = {
		siteName: escHtml(siteName),
		siteUrl: escHtml(siteUrl),
		apiUrl: escHtml(apiUrl),
		githubUrl: escHtml(githubUrl)
	}

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${e.siteName} | Free Country, State, City & Location API</title>
<meta name="description" content="Free, fast REST API for country, state, city, and IP geolocation data. Powered by Cloudflare Workers with global edge caching." />
<meta name="theme-color" content="#0a0a0b" />
<link rel="canonical" href="${e.siteUrl}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${e.siteUrl}" />
<meta property="og:title" content="${e.siteName} | Free Country, State, City & Location API" />
<meta property="og:description" content="Free, fast REST API for country, state, city, and IP geolocation data. Powered by Cloudflare Workers with global edge caching." />
<meta property="og:site_name" content="${e.siteName}" />
<meta property="og:image" content="${e.siteUrl}/logo.png" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="${e.siteName} | Free Country, State, City & Location API" />
<meta name="twitter:description" content="Free, fast REST API for country, state, city, and IP geolocation data. Powered by Cloudflare Workers with global edge caching." />
<meta name="twitter:image" content="${e.siteUrl}/logo.png" />
<link rel="icon" type="image/png" href="/logo.png" />
<link rel="apple-touch-icon" href="/logo.png" />
<style type="text/css">
/* ---------- Scalar theme ---------- */
.dark-mode {
	color-scheme: dark;
	--scalar-color-1: rgba(255, 255, 245, .86);
	--scalar-color-2: rgba(255, 255, 245, .6);
	--scalar-color-3: rgba(255, 255, 245, .38);
	--scalar-color-disabled: rgba(255, 255, 245, .25);
	--scalar-color-ghost: rgba(255, 255, 245, .25);
	--scalar-color-accent: #3b82f6;
	--scalar-background-1: #0a0a0b;
	--scalar-background-2: #131316;
	--scalar-background-3: #1e1e24;
	--scalar-background-4: rgba(255, 255, 255, 0.06);
	--scalar-background-accent: #3b82f61f;
	--scalar-border-color: rgba(255, 255, 255, 0.1);
	--scalar-scrollbar-color: rgba(255, 255, 255, 0.24);
	--scalar-scrollbar-color-active: rgba(255, 255, 255, 0.48);
	--scalar-lifted-brightness: 1.45;
	--scalar-backdrop-brightness: 0.5;
	--scalar-shadow-1: 0 1px 3px 0 rgb(0, 0, 0, 0.1);
	--scalar-shadow-2: rgba(15, 15, 15, 0.2) 0px 3px 6px, rgba(15, 15, 15, 0.4) 0px 9px 24px, 0 0 0 1px rgba(255, 255, 255, 0.1);
	--scalar-button-1: #f6f6f6;
	--scalar-button-1-color: #000;
	--scalar-button-1-hover: #e7e7e7;
	--scalar-color-green: #3dd68c;
	--scalar-color-red: #f66f81;
	--scalar-color-yellow: #f9b44e;
	--scalar-color-blue: #5c73e7;
	--scalar-color-orange: #ff8d4d;
	--scalar-color-purple: #b191f9;
}
.dark-mode .sidebar {
	--scalar-sidebar-background-1: #0a0a0b;
	--scalar-sidebar-item-hover-color: var(--scalar-color-accent);
	--scalar-sidebar-item-hover-background: transparent;
	--scalar-sidebar-item-active-background: transparent;
	--scalar-sidebar-border-color: transparent;
	--scalar-sidebar-color-1: var(--scalar-color-1);
	--scalar-sidebar-color-2: var(--scalar-color-2);
	--scalar-sidebar-color-active: var(--scalar-color-accent);
	--scalar-sidebar-search-background: #131316;
	--scalar-sidebar-search-border-color: transparent;
	--scalar-sidebar-search-color: var(--scalar-color-3);
}

/* ---------- Landing page ---------- */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root {
	--bg: #0a0a0b;
	--bg-card: #131316;
	--bg-code: #1a1a1f;
	--accent: #3b82f6;
	--accent-hover: #2563eb;
	--text-1: rgba(255,255,245,.86);
	--text-2: rgba(255,255,245,.6);
	--text-3: rgba(255,255,245,.38);
	--border: rgba(255,255,255,.1);
	--radius: 12px;
	--font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	--font-mono: 'SF Mono', SFMono-Regular, ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace;
}
html {
	scroll-behavior: smooth;
	background: var(--bg);
	color: var(--text-1);
	font-family: var(--font);
	line-height: 1.6;
	-webkit-font-smoothing: antialiased;
}
body { background: var(--bg); }

/* Layout */
.landing-container {
	max-width: 1120px;
	margin: 0 auto;
	padding: 0 24px;
}

/* ---------- NAV ---------- */
.landing-nav {
	position: sticky;
	top: 0;
	z-index: 100;
	backdrop-filter: blur(16px) saturate(180%);
	-webkit-backdrop-filter: blur(16px) saturate(180%);
	background: rgba(10,10,11,.8);
	border-bottom: 1px solid var(--border);
}
.landing-nav .landing-container {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 60px;
}
.nav-brand {
	display: flex;
	align-items: center;
	gap: 10px;
	text-decoration: none;
	color: var(--text-1);
	font-weight: 700;
	font-size: 18px;
}
.nav-brand img { width: 32px; height: 32px; border-radius: 6px; }
.nav-links { display: flex; gap: 24px; align-items: center; }
.nav-links a {
	color: var(--text-2);
	text-decoration: none;
	font-size: 14px;
	font-weight: 500;
	transition: color .15s;
}
.nav-links a:hover { color: var(--text-1); }
.nav-links .gh-link {
	display: inline-flex;
	align-items: center;
	gap: 6px;
}
.nav-links .gh-link svg { width: 18px; height: 18px; fill: currentColor; }

/* ---------- HERO ---------- */
.hero {
	padding: 100px 0 80px;
	text-align: center;
}
.hero-logo {
	width: 72px;
	height: 72px;
	border-radius: 16px;
	margin-bottom: 24px;
}
.hero h1 {
	font-size: clamp(36px, 5vw, 56px);
	font-weight: 800;
	letter-spacing: -0.03em;
	line-height: 1.1;
	margin-bottom: 16px;
}
.hero h1 .accent { color: var(--accent); }
.hero-tagline {
	font-size: clamp(18px, 2.5vw, 22px);
	color: var(--text-2);
	max-width: 600px;
	margin: 0 auto 12px;
	font-weight: 500;
}
.hero-desc {
	font-size: 16px;
	color: var(--text-3);
	max-width: 540px;
	margin: 0 auto 40px;
}
.hero-actions {
	display: flex;
	gap: 12px;
	justify-content: center;
	flex-wrap: wrap;
	margin-bottom: 48px;
}
.btn {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 12px 24px;
	border-radius: 10px;
	font-size: 15px;
	font-weight: 600;
	font-family: var(--font);
	text-decoration: none;
	cursor: pointer;
	border: none;
	transition: all .15s;
}
.btn-primary {
	background: var(--accent);
	color: #fff;
}
.btn-primary:hover { background: var(--accent-hover); }
.btn-secondary {
	background: transparent;
	color: var(--text-1);
	border: 1px solid var(--border);
}
.btn-secondary:hover {
	background: rgba(255,255,255,.05);
	border-color: rgba(255,255,255,.2);
}

/* Hero curl block */
.hero-curl {
	max-width: 580px;
	margin: 0 auto;
	background: var(--bg-code);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	text-align: left;
	position: relative;
	overflow: hidden;
}
.hero-curl-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 16px;
	border-bottom: 1px solid var(--border);
	background: rgba(255,255,255,.02);
}
.hero-curl-dots {
	display: flex;
	gap: 6px;
}
.hero-curl-dots span {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: rgba(255,255,255,.12);
}
.copy-btn {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 4px 10px;
	border-radius: 6px;
	background: rgba(255,255,255,.06);
	border: 1px solid var(--border);
	color: var(--text-3);
	font-size: 12px;
	font-family: var(--font);
	cursor: pointer;
	transition: all .15s;
}
.copy-btn:hover {
	background: rgba(255,255,255,.1);
	color: var(--text-2);
}
.copy-btn svg { width: 14px; height: 14px; }
.hero-curl pre {
	padding: 16px 20px;
	overflow-x: auto;
	font-family: var(--font-mono);
	font-size: 14px;
	line-height: 1.6;
	color: var(--text-2);
}
.hero-curl pre .prompt { color: var(--accent); user-select: none; }
.hero-curl pre .url { color: #3dd68c; }

/* ---------- FEATURES ---------- */
.features {
	padding: 80px 0;
}
.section-label {
	font-size: 13px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--accent);
	margin-bottom: 12px;
}
.section-title {
	font-size: clamp(24px, 3vw, 36px);
	font-weight: 700;
	letter-spacing: -0.02em;
	margin-bottom: 12px;
}
.section-desc {
	color: var(--text-2);
	font-size: 16px;
	max-width: 560px;
	margin-bottom: 48px;
}
.features-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 16px;
}
.feature-card {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	padding: 28px;
	transition: border-color .2s;
}
.feature-card:hover {
	border-color: rgba(255,255,255,.18);
}
.feature-icon {
	width: 40px;
	height: 40px;
	border-radius: 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 16px;
	font-size: 20px;
}
.feature-icon.blue { background: rgba(59,130,246,.15); color: #3b82f6; }
.feature-icon.green { background: rgba(61,214,140,.15); color: #3dd68c; }
.feature-icon.purple { background: rgba(177,145,249,.15); color: #b191f9; }
.feature-icon.orange { background: rgba(255,141,77,.15); color: #ff8d4d; }
.feature-card h3 {
	font-size: 17px;
	font-weight: 650;
	margin-bottom: 8px;
}
.feature-card p {
	font-size: 14px;
	color: var(--text-2);
	line-height: 1.6;
}

/* ---------- EXAMPLES ---------- */
.examples {
	padding: 80px 0;
}
.examples-grid {
	display: flex;
	flex-direction: column;
	gap: 24px;
}
.example-block {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	overflow: hidden;
}
.example-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 20px;
	border-bottom: 1px solid var(--border);
}
.example-header h3 {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-1);
}
.example-header .method {
	font-size: 12px;
	font-weight: 700;
	font-family: var(--font-mono);
	color: #3dd68c;
	background: rgba(61,214,140,.1);
	padding: 3px 8px;
	border-radius: 4px;
}
.example-content {
	display: grid;
	grid-template-columns: 1fr 1fr;
}
.example-req, .example-res {
	padding: 16px 20px;
}
.example-req {
	border-right: 1px solid var(--border);
}
.example-req-label, .example-res-label {
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--text-3);
	margin-bottom: 10px;
}
.example-req pre, .example-res pre {
	font-family: var(--font-mono);
	font-size: 13px;
	line-height: 1.65;
	color: var(--text-2);
	overflow-x: auto;
	white-space: pre;
}
.example-req pre .prompt { color: var(--accent); user-select: none; }
.example-req pre .url { color: #3dd68c; }
.example-res pre .key { color: #b191f9; }
.example-res pre .str { color: #3dd68c; }
.example-res pre .num { color: #ff8d4d; }
.example-res pre .bool { color: #f9b44e; }

/* ---------- FOOTER ---------- */
.landing-footer {
	border-top: 1px solid var(--border);
	padding: 40px 0;
	margin-top: 80px;
}
.footer-inner {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 24px;
	flex-wrap: wrap;
}
.footer-left {
	display: flex;
	flex-direction: column;
	gap: 8px;
}
.footer-brand {
	display: flex;
	align-items: center;
	gap: 8px;
	font-weight: 700;
	font-size: 16px;
	color: var(--text-1);
	text-decoration: none;
}
.footer-brand img { width: 24px; height: 24px; border-radius: 4px; }
.footer-left p {
	font-size: 13px;
	color: var(--text-3);
	line-height: 1.5;
}
.footer-left a {
	color: var(--text-2);
	text-decoration: underline;
	text-underline-offset: 2px;
}
.footer-left a:hover { color: var(--text-1); }
.footer-right {
	display: flex;
	gap: 24px;
	flex-wrap: wrap;
}
.footer-right a {
	font-size: 13px;
	color: var(--text-2);
	text-decoration: none;
	transition: color .15s;
}
.footer-right a:hover { color: var(--text-1); }

/* ---------- RESPONSIVE ---------- */
@media (max-width: 768px) {
	.hero { padding: 64px 0 48px; }
	.features-grid { grid-template-columns: 1fr; }
	.example-content { grid-template-columns: 1fr; }
	.example-req { border-right: none; border-bottom: 1px solid var(--border); }
	.nav-links .hide-mobile { display: none; }
	.footer-inner { flex-direction: column; }
}
@media (max-width: 480px) {
	.hero-curl pre { font-size: 12px; }
	.example-req pre, .example-res pre { font-size: 12px; }
}
</style>
</head>
<body>

<!-- ==================== NAV ==================== -->
<nav class="landing-nav">
	<div class="landing-container">
		<a href="/" class="nav-brand">
			<img src="/logo.png" alt="${e.siteName} logo" width="32" height="32" />
			${e.siteName}
		</a>
		<div class="nav-links">
			<a href="#features" class="hide-mobile">Features</a>
			<a href="#examples" class="hide-mobile">Examples</a>
			<a href="/docs">API Docs</a>
			<a href="${e.githubUrl}" target="_blank" rel="noopener noreferrer" class="gh-link" aria-label="GitHub repository">
				<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
			</a>
		</div>
	</div>
</nav>

<!-- ==================== HERO ==================== -->
<section class="hero">
	<div class="landing-container">
		<img src="/logo.png" alt="" class="hero-logo" width="72" height="72" />
		<h1>
			<span class="accent">${e.siteName}</span>
		</h1>
		<p class="hero-tagline">Free Country, State, City & Location API</p>
		<p class="hero-desc">
			Open-source REST API with 252 countries, 3,800+ states, and 230,000+ cities.
			No API key required. Deployed on the edge for instant responses worldwide.
		</p>
		<div class="hero-actions">
			<a href="/docs" class="btn btn-primary">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
				View API Docs
			</a>
			<a href="${e.githubUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
				GitHub
			</a>
		</div>

		<div class="hero-curl">
			<div class="hero-curl-header">
				<div class="hero-curl-dots">
					<span></span><span></span><span></span>
				</div>
				<button class="copy-btn" onclick="copyCode(this, 'curl ${e.apiUrl}')" aria-label="Copy curl command">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
					Copy
				</button>
			</div>
			<pre><span class="prompt">$</span> curl <span class="url">${e.apiUrl}</span></pre>
		</div>
	</div>
</section>

<!-- ==================== FEATURES ==================== -->
<section class="features" id="features">
	<div class="landing-container">
		<p class="section-label">Why ${e.siteName}</p>
		<h2 class="section-title">Built for developers who ship fast</h2>
		<p class="section-desc">
			No signup, no API key, no rate limits. Just clean JSON over HTTPS.
		</p>
		<div class="features-grid">
			<div class="feature-card">
				<div class="feature-icon blue">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
				</div>
				<h3>Free & Open Source</h3>
				<p>
					No API key, no signup, no rate limits. Data sourced from official institutions
					(GeoNames, CLDR, Wikidata, IANA) under CC BY 4.0. Use it for anything.
				</p>
			</div>
			<div class="feature-card">
				<div class="feature-icon green">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
				</div>
				<h3>Global Edge Network</h3>
				<p>
					Powered by Cloudflare Workers with near-zero cold starts. Responses are cached
					aggressively at the edge, so your users get data in milliseconds from the closest POP.
				</p>
			</div>
			<div class="feature-card">
				<div class="feature-icon purple">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
				</div>
				<h3>Rich Data</h3>
				<p>
					252 countries, 3,800+ states, and 230,000+ cities complete with
					translations, timezones, coordinates, phone codes, currencies, and more.
				</p>
			</div>
			<div class="feature-card">
				<div class="feature-icon orange">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
				</div>
				<h3>Field Selection</h3>
				<p>
					Pick exactly the fields you need with the <code>?fields=</code> parameter.
					Supports dot notation for nested objects. Smaller payloads, faster apps.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- ==================== EXAMPLES ==================== -->
<section class="examples" id="examples">
	<div class="landing-container">
		<p class="section-label">Quick Start</p>
		<h2 class="section-title">Three endpoints, zero config</h2>
		<p class="section-desc">
			Every response is JSON with aggressive cache headers. Try these from your terminal right now.
		</p>
		<div class="examples-grid">

			<!-- Example 1: Location -->
			<div class="example-block">
				<div class="example-header">
					<h3>Your location from IP</h3>
					<span class="method">GET</span>
				</div>
				<div class="example-content">
					<div class="example-req">
						<div class="example-req-label">Request</div>
						<pre><span class="prompt">$</span> curl <span class="url">${e.apiUrl}</span></pre>
					</div>
					<div class="example-res">
						<div class="example-res-label">Response</div>
						<pre>{
  <span class="key">"ip"</span>: <span class="str">"203.0.113.42"</span>,
  <span class="key">"country"</span>: <span class="str">"US"</span>,
  <span class="key">"region"</span>: <span class="str">"California"</span>,
  <span class="key">"city"</span>: <span class="str">"San Francisco"</span>,
  <span class="key">"latitude"</span>: <span class="str">"37.7749"</span>,
  <span class="key">"longitude"</span>: <span class="str">"-122.4194"</span>,
  <span class="key">"timezone"</span>: <span class="str">"America/Los_Angeles"</span>
}</pre>
					</div>
				</div>
			</div>

			<!-- Example 2: Countries with field selection -->
			<div class="example-block">
				<div class="example-header">
					<h3>Countries with field selection</h3>
					<span class="method">GET</span>
				</div>
				<div class="example-content">
					<div class="example-req">
						<div class="example-req-label">Request</div>
						<pre><span class="prompt">$</span> curl <span class="url">${e.apiUrl}/countries/US?fields=name,iso2,capital,currency</span></pre>
					</div>
					<div class="example-res">
						<div class="example-res-label">Response</div>
						<pre>{
  <span class="key">"name"</span>: <span class="str">"United States"</span>,
  <span class="key">"iso2"</span>: <span class="str">"US"</span>,
  <span class="key">"capital"</span>: <span class="str">"Washington"</span>,
  <span class="key">"currency"</span>: <span class="str">"USD"</span>
}</pre>
					</div>
				</div>
			</div>

			<!-- Example 3: States and cities drill-down -->
			<div class="example-block">
				<div class="example-header">
					<h3>Drill down to states and cities</h3>
					<span class="method">GET</span>
				</div>
				<div class="example-content">
					<div class="example-req">
						<div class="example-req-label">Request</div>
						<pre><span class="prompt">$</span> curl <span class="url">${e.apiUrl}/countries/US/states/CA/cities?fields=name,latitude,longitude</span></pre>
					</div>
					<div class="example-res">
						<div class="example-res-label">Response</div>
						<pre>[
  {
    <span class="key">"name"</span>: <span class="str">"Los Angeles"</span>,
    <span class="key">"latitude"</span>: <span class="str">"34.05223420"</span>,
    <span class="key">"longitude"</span>: <span class="str">"-118.24368490"</span>
  },
  {
    <span class="key">"name"</span>: <span class="str">"San Francisco"</span>,
    <span class="key">"latitude"</span>: <span class="str">"37.77492950"</span>,
    <span class="key">"longitude"</span>: <span class="str">"-122.41941550"</span>
  }
]</pre>
					</div>
				</div>
			</div>

		</div>
	</div>
</section>

<!-- ==================== FOOTER ==================== -->
<footer class="landing-footer">
	<div class="landing-container">
		<div class="footer-inner">
			<div class="footer-left">
				<a href="/" class="footer-brand">
					<img src="/logo.png" alt="" width="24" height="24" />
					${e.siteName}
				</a>
				<p>
					Data sourced from
					<a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer">GeoNames</a>,
					<a href="https://cldr.unicode.org/" target="_blank" rel="noopener noreferrer">Unicode CLDR</a>,
					<a href="https://www.wikidata.org/" target="_blank" rel="noopener noreferrer">Wikidata</a>, and
					<a href="https://www.iana.org/time-zones" target="_blank" rel="noopener noreferrer">IANA</a>
					under
					<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>.
				</p>
				<p>Built with Hono on Cloudflare Workers.</p>
			</div>
			<div class="footer-right">
				<a href="${e.githubUrl}" target="_blank" rel="noopener noreferrer">GitHub</a>
				<a href="/docs">API Docs</a>
				<a href="/openapi.json">OpenAPI Spec</a>
			</div>
		</div>
	</div>
</footer>

<!-- ==================== SCRIPTS ==================== -->
<script type="text/javascript">
	function copyCode(btn, text) {
		navigator.clipboard.writeText(text).then(function() {
			var original = btn.innerHTML
			btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!'
			setTimeout(function() { btn.innerHTML = original }, 2000)
		})
	}
</script>

</body>
</html>`
}

export function scalarHtml(config: SiteConfig): string {
	const { siteName } = config
	const e = { siteName: escHtml(siteName) }

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>API Reference | ${e.siteName}</title>
<meta name="description" content="Interactive API reference for ${e.siteName}. Full OpenAPI 3.1 documentation." />
<meta name="theme-color" content="#0a0a0b" />
<link rel="icon" type="image/png" href="/logo.png" />
<style type="text/css">
.dark-mode {
	color-scheme: dark;
	--scalar-color-1: rgba(255, 255, 245, .86);
	--scalar-color-2: rgba(255, 255, 245, .6);
	--scalar-color-3: rgba(255, 255, 245, .38);
	--scalar-color-disabled: rgba(255, 255, 245, .25);
	--scalar-color-ghost: rgba(255, 255, 245, .25);
	--scalar-color-accent: #3b82f6;
	--scalar-background-1: #0a0a0b;
	--scalar-background-2: #131316;
	--scalar-background-3: #1e1e24;
	--scalar-background-4: rgba(255, 255, 255, 0.06);
	--scalar-background-accent: #3b82f61f;
	--scalar-border-color: rgba(255, 255, 255, 0.1);
	--scalar-scrollbar-color: rgba(255, 255, 255, 0.24);
	--scalar-scrollbar-color-active: rgba(255, 255, 255, 0.48);
	--scalar-lifted-brightness: 1.45;
	--scalar-backdrop-brightness: 0.5;
	--scalar-shadow-1: 0 1px 3px 0 rgb(0, 0, 0, 0.1);
	--scalar-shadow-2: rgba(15, 15, 15, 0.2) 0px 3px 6px, rgba(15, 15, 15, 0.4) 0px 9px 24px, 0 0 0 1px rgba(255, 255, 255, 0.1);
	--scalar-button-1: #f6f6f6;
	--scalar-button-1-color: #000;
	--scalar-button-1-hover: #e7e7e7;
	--scalar-color-green: #3dd68c;
	--scalar-color-red: #f66f81;
	--scalar-color-yellow: #f9b44e;
	--scalar-color-blue: #5c73e7;
	--scalar-color-orange: #ff8d4d;
	--scalar-color-purple: #b191f9;
}
.dark-mode .sidebar {
	--scalar-sidebar-background-1: #0a0a0b;
	--scalar-sidebar-item-hover-color: var(--scalar-color-accent);
	--scalar-sidebar-item-hover-background: transparent;
	--scalar-sidebar-item-active-background: transparent;
	--scalar-sidebar-border-color: transparent;
	--scalar-sidebar-color-1: var(--scalar-color-1);
	--scalar-sidebar-color-2: var(--scalar-color-2);
	--scalar-sidebar-color-active: var(--scalar-color-accent);
	--scalar-sidebar-search-background: #131316;
	--scalar-sidebar-search-border-color: transparent;
	--scalar-sidebar-search-color: var(--scalar-color-3);
}
</style>
</head>
<body>
<div id="app"></div>
<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
<script type="text/javascript">
	Scalar.createApiReference('#app', {
		_integration: 'hono',
		url: '/openapi.json',
		theme: 'saturn',
		darkMode: true,
		hideDarkModeToggle: true,
		defaultOpenAllTags: true,
	})
</script>
</body>
</html>`
}
