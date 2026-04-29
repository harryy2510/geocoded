import type { SiteConfig } from './types'

function escHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

export function exploreHtml(config: SiteConfig): string {
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
<title>Explore | ${e.siteName}</title>
<meta name="description" content="Explore 252 countries, 5,000+ states, 232,000+ cities, timezones, and currencies. Interactive data explorer for the ${e.siteName} API." />
<meta name="theme-color" content="#0a0a0b" />
<link rel="canonical" href="${e.siteUrl}/explore" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${e.siteUrl}/explore" />
<meta property="og:title" content="Explore | ${e.siteName}" />
<meta property="og:description" content="Explore 252 countries, 5,000+ states, 232,000+ cities, timezones, and currencies interactively." />
<meta property="og:image" content="${e.siteUrl}/logo.png" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="Explore | ${e.siteName}" />
<meta name="twitter:description" content="Explore 252 countries, 5,000+ states, 232,000+ cities, timezones, and currencies interactively." />
<meta name="twitter:image" content="${e.siteUrl}/logo.png" />
<link rel="icon" type="image/svg+xml" href="/logo-background.svg" />
<link rel="apple-touch-icon" href="/logo.png" />
<style type="text/css">
/* ========== RESET & BASE ========== */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root {
	--bg: #0a0a0b;
	--bg-card: #131316;
	--bg-card-hover: #18181d;
	--bg-code: #1a1a1f;
	--bg-input: #111114;
	--accent: #3b82f6;
	--accent-hover: #2563eb;
	--accent-dim: rgba(59,130,246,.15);
	--accent-glow: rgba(59,130,246,.25);
	--green: #3dd68c;
	--red: #f66f81;
	--yellow: #f9b44e;
	--purple: #b191f9;
	--orange: #ff8d4d;
	--cyan: #22d3ee;
	--text-1: rgba(255,255,245,.86);
	--text-2: rgba(255,255,245,.6);
	--text-3: rgba(255,255,245,.38);
	--border: rgba(255,255,255,.1);
	--border-hover: rgba(255,255,255,.2);
	--radius: 12px;
	--radius-sm: 8px;
	--radius-xs: 6px;
	--font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	--font-mono: 'SF Mono', SFMono-Regular, ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace;
	--shadow: 0 1px 3px rgba(0,0,0,.3), 0 4px 12px rgba(0,0,0,.2);
	--shadow-lg: 0 4px 24px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.06);

	/* region colors */
	--region-americas: #3b82f6;
	--region-europe: #8b5cf6;
	--region-asia: #f59e0b;
	--region-africa: #ef4444;
	--region-oceania: #10b981;
	--region-antarctic: #94a3b8;
	--region-default: #64748b;
}
html {
	scroll-behavior: smooth;
	background: var(--bg);
	color: var(--text-1);
	font-family: var(--font);
	line-height: 1.6;
	-webkit-font-smoothing: antialiased;
}
body { background: var(--bg); overflow-x: hidden; }
a { color: var(--accent); text-decoration: none; }
a:hover { color: var(--accent-hover); }
button { cursor: pointer; font-family: var(--font); }
input, select { font-family: var(--font); }

/* ========== LAYOUT ========== */
.container { max-width: 1400px; margin: 0 auto; padding: 0 24px; }
.container-wide { max-width: 1600px; margin: 0 auto; padding: 0 24px; }

/* ========== NAV ========== */
.nav {
	position: sticky;
	top: 0;
	z-index: 100;
	backdrop-filter: blur(16px) saturate(180%);
	-webkit-backdrop-filter: blur(16px) saturate(180%);
	background: rgba(10,10,11,.8);
	border-bottom: 1px solid var(--border);
}
.nav .container {
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
.nav-links a.active { color: var(--accent); }
.nav-links .gh-link {
	display: inline-flex;
	align-items: center;
	gap: 6px;
}
.nav-links .gh-link svg { width: 18px; height: 18px; fill: currentColor; }

/* ========== HERO STATS ========== */
.stats-bar {
	padding: 48px 0 32px;
	border-bottom: 1px solid var(--border);
}
.stats-grid {
	display: flex;
	gap: 8px;
	justify-content: center;
	flex-wrap: wrap;
}
.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 20px 32px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	min-width: 160px;
	transition: border-color .2s, transform .2s;
}
.stat-item:hover {
	border-color: var(--border-hover);
	transform: translateY(-2px);
}
.stat-number {
	font-size: 32px;
	font-weight: 800;
	letter-spacing: -0.02em;
	color: var(--accent);
	font-variant-numeric: tabular-nums;
}
.stat-label {
	font-size: 13px;
	color: var(--text-3);
	font-weight: 500;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	margin-top: 4px;
}

/* ========== MAIN LAYOUT ========== */
.main-layout {
	display: grid;
	grid-template-columns: 280px 1fr;
	gap: 24px;
	padding: 32px 0;
	min-height: 80vh;
}
.sidebar {
	position: sticky;
	top: 84px;
	max-height: calc(100vh - 100px);
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: 20px;
	padding-right: 8px;
}
.sidebar::-webkit-scrollbar { width: 4px; }
.sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }
.content { min-width: 0; }

/* ========== FILTER SECTION ========== */
.filter-section {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	padding: 16px;
}
.filter-title {
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--text-3);
	margin-bottom: 12px;
}
.filter-input {
	width: 100%;
	padding: 10px 12px;
	background: var(--bg-input);
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
	color: var(--text-1);
	font-size: 14px;
	outline: none;
	transition: border-color .15s;
}
.filter-input:focus { border-color: var(--accent); }
.filter-input::placeholder { color: var(--text-3); }
.filter-select {
	width: 100%;
	padding: 10px 12px;
	background: var(--bg-input);
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
	color: var(--text-1);
	font-size: 14px;
	outline: none;
	appearance: none;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='rgba(255,255,245,.38)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 4l4 4 4-4'/%3E%3C/svg%3E");
	background-repeat: no-repeat;
	background-position: right 12px center;
	cursor: pointer;
	transition: border-color .15s;
}
.filter-select:focus { border-color: var(--accent); }
.filter-group { display: flex; flex-direction: column; gap: 8px; }
.filter-group + .filter-group { margin-top: 12px; }
.filter-label {
	font-size: 12px;
	color: var(--text-2);
	font-weight: 500;
}
.filter-range-wrapper { position: relative; }
.filter-range {
	width: 100%;
	-webkit-appearance: none;
	appearance: none;
	height: 4px;
	background: var(--border);
	border-radius: 2px;
	outline: none;
}
.filter-range::-webkit-slider-thumb {
	-webkit-appearance: none;
	width: 16px; height: 16px;
	background: var(--accent);
	border-radius: 50%;
	cursor: pointer;
	border: 2px solid var(--bg);
}
.filter-range::-moz-range-thumb {
	width: 16px; height: 16px;
	background: var(--accent);
	border-radius: 50%;
	cursor: pointer;
	border: 2px solid var(--bg);
}
.filter-range-value {
	font-size: 12px;
	color: var(--accent);
	font-weight: 600;
	font-variant-numeric: tabular-nums;
	text-align: right;
	margin-top: 4px;
}
.filter-pills {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}
.filter-pill {
	padding: 5px 10px;
	background: transparent;
	border: 1px solid var(--border);
	border-radius: 20px;
	color: var(--text-2);
	font-size: 12px;
	font-weight: 500;
	cursor: pointer;
	transition: all .15s;
}
.filter-pill:hover { border-color: var(--border-hover); color: var(--text-1); }
.filter-pill.active {
	background: var(--accent-dim);
	border-color: var(--accent);
	color: var(--accent);
}
.filter-clear {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 6px 0;
	background: none;
	border: none;
	color: var(--text-3);
	font-size: 12px;
	cursor: pointer;
	transition: color .15s;
}
.filter-clear:hover { color: var(--red); }

/* ========== WORLD MAP ========== */
.map-section {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	overflow: hidden;
	position: relative;
}
.map-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	border-bottom: 1px solid var(--border);
}
.map-title {
	font-size: 16px;
	font-weight: 700;
}
.map-legend {
	display: flex;
	gap: 16px;
	flex-wrap: wrap;
}
.map-legend-item {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 12px;
	color: var(--text-2);
}
.map-legend-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
}
.map-container {
	position: relative;
	width: 100%;
	padding-top: 50%;
	overflow: hidden;
	background: radial-gradient(ellipse at center, rgba(59,130,246,.03) 0%, transparent 70%);
}
.map-svg {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}
.map-dot {
	cursor: pointer;
	transition: r .2s, opacity .2s;
	opacity: 0.7;
}
.map-dot:hover { opacity: 1; }
.map-dot.active { opacity: 1; stroke: #fff; stroke-width: 1.5; }
.map-tooltip {
	position: absolute;
	pointer-events: none;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
	padding: 12px 16px;
	box-shadow: var(--shadow-lg);
	z-index: 50;
	opacity: 0;
	transform: translateY(4px);
	transition: opacity .15s, transform .15s;
	min-width: 200px;
}
.map-tooltip.visible { opacity: 1; transform: translateY(0); }
.map-tooltip-name {
	font-size: 15px;
	font-weight: 700;
	margin-bottom: 6px;
	display: flex;
	align-items: center;
	gap: 8px;
}
.map-tooltip-flag { font-size: 20px; }
.map-tooltip-row {
	display: flex;
	justify-content: space-between;
	gap: 16px;
	font-size: 12px;
	color: var(--text-2);
	line-height: 1.8;
}
.map-tooltip-row span:last-child { color: var(--text-1); font-weight: 500; }
.map-loading {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--text-3);
	font-size: 14px;
}

/* ========== COUNTRY GRID ========== */
.grid-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin: 24px 0 16px;
	flex-wrap: wrap;
	gap: 12px;
}
.grid-header h2 {
	font-size: 18px;
	font-weight: 700;
}
.grid-count {
	font-size: 13px;
	color: var(--text-3);
	font-variant-numeric: tabular-nums;
}
.grid-sort {
	display: flex;
	align-items: center;
	gap: 8px;
}
.grid-sort label {
	font-size: 12px;
	color: var(--text-3);
}
.grid-sort select {
	padding: 6px 28px 6px 10px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius-xs);
	color: var(--text-1);
	font-size: 13px;
	outline: none;
	appearance: none;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='none' stroke='rgba(255,255,245,.38)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 3l3 3 3-3'/%3E%3C/svg%3E");
	background-repeat: no-repeat;
	background-position: right 8px center;
	cursor: pointer;
}
.country-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: 12px;
}
.country-card {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	padding: 16px;
	cursor: pointer;
	transition: all .2s;
	display: flex;
	flex-direction: column;
	gap: 8px;
}
.country-card:hover {
	border-color: var(--border-hover);
	background: var(--bg-card-hover);
	transform: translateY(-1px);
}
.country-card.active {
	border-color: var(--accent);
	background: var(--accent-dim);
}
.country-card-top {
	display: flex;
	align-items: center;
	gap: 10px;
}
.country-card-flag { font-size: 28px; line-height: 1; }
.country-card-info { flex: 1; min-width: 0; }
.country-card-name {
	font-size: 14px;
	font-weight: 600;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.country-card-meta {
	display: flex;
	gap: 12px;
	font-size: 12px;
	color: var(--text-3);
}
.country-card-region {
	display: inline-block;
	padding: 2px 8px;
	border-radius: 10px;
	font-size: 11px;
	font-weight: 500;
	background: var(--accent-dim);
	color: var(--accent);
	align-self: flex-start;
}

/* ========== DETAIL PANEL ========== */
.detail-overlay {
	position: fixed;
	inset: 0;
	background: rgba(0,0,0,.6);
	backdrop-filter: blur(4px);
	z-index: 200;
	opacity: 0;
	pointer-events: none;
	transition: opacity .25s;
}
.detail-overlay.open { opacity: 1; pointer-events: auto; }
.detail-panel {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	width: min(680px, 100vw);
	background: var(--bg);
	border-left: 1px solid var(--border);
	z-index: 201;
	overflow-y: auto;
	transform: translateX(100%);
	transition: transform .3s cubic-bezier(.4,0,.2,1);
}
.detail-panel.open { transform: translateX(0); }
.detail-close {
	position: sticky;
	top: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 24px;
	background: rgba(10,10,11,.9);
	backdrop-filter: blur(8px);
	border-bottom: 1px solid var(--border);
	z-index: 1;
}
.detail-close-btn {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 8px 14px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
	color: var(--text-2);
	font-size: 13px;
	cursor: pointer;
	transition: all .15s;
}
.detail-close-btn:hover { border-color: var(--border-hover); color: var(--text-1); }
.detail-nav-btns {
	display: flex;
	gap: 6px;
}
.detail-nav-btn {
	padding: 8px 12px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
	color: var(--text-2);
	font-size: 13px;
	cursor: pointer;
	transition: all .15s;
}
.detail-nav-btn:hover { border-color: var(--border-hover); color: var(--text-1); }
.detail-nav-btn:disabled { opacity: .3; cursor: default; }
.detail-body { padding: 24px; }
.detail-hero {
	display: flex;
	align-items: flex-start;
	gap: 20px;
	margin-bottom: 24px;
}
.detail-flag { font-size: 56px; line-height: 1; }
.detail-title-block { flex: 1; }
.detail-country-name {
	font-size: 28px;
	font-weight: 800;
	letter-spacing: -0.02em;
	line-height: 1.2;
}
.detail-native-name {
	font-size: 14px;
	color: var(--text-3);
	margin-top: 2px;
}
.detail-badges {
	display: flex;
	gap: 6px;
	margin-top: 8px;
	flex-wrap: wrap;
}
.detail-badge {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 3px 10px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: 20px;
	font-size: 12px;
	color: var(--text-2);
	font-weight: 500;
}

/* detail info grid */
.detail-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 1px;
	background: var(--border);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	overflow: hidden;
	margin-bottom: 20px;
}
.detail-cell {
	background: var(--bg-card);
	padding: 12px 16px;
}
.detail-cell-label {
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--text-3);
	margin-bottom: 4px;
}
.detail-cell-value {
	font-size: 14px;
	color: var(--text-1);
	font-weight: 500;
}

/* literacy bar */
.literacy-bar-bg {
	width: 100%;
	height: 6px;
	background: var(--border);
	border-radius: 3px;
	margin-top: 6px;
	overflow: hidden;
}
.literacy-bar-fill {
	height: 100%;
	background: var(--green);
	border-radius: 3px;
	transition: width .6s ease-out;
}

/* neighbours */
.detail-section { margin-bottom: 20px; }
.detail-section-title {
	font-size: 13px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--text-3);
	margin-bottom: 10px;
}
.neighbour-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}
.neighbour-chip {
	padding: 5px 12px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: 20px;
	font-size: 13px;
	color: var(--text-2);
	cursor: pointer;
	transition: all .15s;
}
.neighbour-chip:hover {
	border-color: var(--accent);
	color: var(--accent);
	background: var(--accent-dim);
}

/* timezones expandable */
.tz-list { display: flex; flex-direction: column; gap: 4px; }
.tz-item {
	padding: 8px 12px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius-xs);
	font-size: 13px;
	color: var(--text-2);
	display: flex;
	justify-content: space-between;
}
.tz-item-name { color: var(--text-1); font-weight: 500; }
.tz-toggle {
	padding: 6px 12px;
	background: none;
	border: 1px solid var(--border);
	border-radius: var(--radius-xs);
	color: var(--text-3);
	font-size: 12px;
	cursor: pointer;
	transition: all .15s;
	margin-top: 6px;
}
.tz-toggle:hover { border-color: var(--border-hover); color: var(--text-2); }

/* translations grid */
.translations-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
	gap: 6px;
}
.translation-item {
	padding: 6px 10px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius-xs);
	font-size: 12px;
	display: flex;
	justify-content: space-between;
	gap: 8px;
}
.translation-lang { color: var(--text-3); font-weight: 600; text-transform: uppercase; }
.translation-val { color: var(--text-2); text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* states & cities */
.states-section {
	border: 1px solid var(--border);
	border-radius: var(--radius);
	overflow: hidden;
	margin-bottom: 20px;
}
.states-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	background: var(--bg-card);
	border-bottom: 1px solid var(--border);
	cursor: pointer;
	transition: background .15s;
}
.states-header:hover { background: var(--bg-card-hover); }
.states-header-title {
	font-size: 14px;
	font-weight: 600;
}
.states-header-count {
	font-size: 12px;
	color: var(--text-3);
	font-variant-numeric: tabular-nums;
}
.states-body { max-height: 0; overflow: hidden; transition: max-height .35s ease; }
.states-body.open { max-height: 2000px; }
.states-search {
	padding: 8px 16px;
	border-bottom: 1px solid var(--border);
}
.states-search input {
	width: 100%;
	padding: 8px 12px;
	background: var(--bg-input);
	border: 1px solid var(--border);
	border-radius: var(--radius-xs);
	color: var(--text-1);
	font-size: 13px;
	outline: none;
}
.states-search input:focus { border-color: var(--accent); }
.states-list { max-height: 400px; overflow-y: auto; }
.states-list::-webkit-scrollbar { width: 4px; }
.states-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }
.state-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 16px;
	border-bottom: 1px solid var(--border);
	cursor: pointer;
	transition: background .1s;
	font-size: 13px;
}
.state-row:last-child { border-bottom: none; }
.state-row:hover { background: var(--bg-card-hover); }
.state-row.active { background: var(--accent-dim); }
.state-name { font-weight: 500; color: var(--text-1); }
.state-meta { color: var(--text-3); font-size: 12px; display: flex; gap: 12px; }

.cities-section {
	border: 1px solid var(--border);
	border-radius: var(--radius);
	overflow: hidden;
	margin-bottom: 20px;
}
.cities-header {
	padding: 12px 16px;
	background: var(--bg-card);
	border-bottom: 1px solid var(--border);
	font-size: 14px;
	font-weight: 600;
}
.cities-list { max-height: 300px; overflow-y: auto; }
.cities-list::-webkit-scrollbar { width: 4px; }
.cities-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }
.city-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px 16px;
	border-bottom: 1px solid var(--border);
	font-size: 13px;
}
.city-row:last-child { border-bottom: none; }
.city-name { color: var(--text-1); font-weight: 500; }
.city-meta { color: var(--text-3); font-size: 12px; display: flex; gap: 12px; }
.cities-loading {
	padding: 24px;
	text-align: center;
	color: var(--text-3);
	font-size: 13px;
}

/* ========== TABS (Currencies & Timezones) ========== */
.tabs-section { margin-top: 32px; }
.tabs-nav {
	display: flex;
	gap: 0;
	border-bottom: 1px solid var(--border);
	margin-bottom: 20px;
}
.tab-btn {
	padding: 12px 24px;
	background: none;
	border: none;
	border-bottom: 2px solid transparent;
	color: var(--text-3);
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	transition: all .15s;
}
.tab-btn:hover { color: var(--text-2); }
.tab-btn.active {
	color: var(--accent);
	border-bottom-color: var(--accent);
}
.tab-panel { display: none; }
.tab-panel.active { display: block; }

.currency-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: 10px;
}
.currency-card {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	padding: 14px 16px;
	transition: border-color .15s;
}
.currency-card:hover { border-color: var(--border-hover); }
.currency-top {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 8px;
}
.currency-symbol {
	width: 36px; height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--accent-dim);
	border-radius: var(--radius-xs);
	font-size: 16px;
	font-weight: 700;
	color: var(--accent);
}
.currency-code {
	font-size: 15px;
	font-weight: 700;
}
.currency-name {
	font-size: 12px;
	color: var(--text-3);
}
.currency-details {
	display: flex;
	gap: 16px;
	font-size: 12px;
	color: var(--text-2);
	margin-top: 8px;
}
.currency-countries {
	font-size: 12px;
	color: var(--text-3);
	margin-top: 6px;
	line-height: 1.5;
}

.tz-group { margin-bottom: 20px; }
.tz-group-header {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 10px;
	padding-bottom: 8px;
	border-bottom: 1px solid var(--border);
}
.tz-offset {
	font-size: 14px;
	font-weight: 700;
	color: var(--accent);
	font-variant-numeric: tabular-nums;
	min-width: 80px;
}
.tz-group-count {
	font-size: 12px;
	color: var(--text-3);
}
.tz-entries {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
	gap: 8px;
}
.tz-entry {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
	padding: 10px 14px;
}
.tz-entry-name {
	font-size: 13px;
	font-weight: 600;
	color: var(--text-1);
}
.tz-entry-meta {
	font-size: 12px;
	color: var(--text-3);
	margin-top: 2px;
}

/* ========== SPINNER ========== */
.spinner {
	display: inline-block;
	width: 16px; height: 16px;
	border: 2px solid var(--border);
	border-top-color: var(--accent);
	border-radius: 50%;
	animation: spin .6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ========== EMPTY STATE ========== */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 64px 24px;
	color: var(--text-3);
	font-size: 14px;
	text-align: center;
}
.empty-state-icon { font-size: 32px; margin-bottom: 12px; opacity: .5; }

/* ========== FOOTER ========== */
.footer {
	border-top: 1px solid var(--border);
	padding: 32px 0;
	margin-top: 48px;
}
.footer-inner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	flex-wrap: wrap;
}
.footer-left {
	font-size: 13px;
	color: var(--text-3);
}
.footer-links {
	display: flex;
	gap: 20px;
}
.footer-links a {
	font-size: 13px;
	color: var(--text-2);
	text-decoration: none;
	transition: color .15s;
}
.footer-links a:hover { color: var(--text-1); }

/* ========== ANIMATE IN ========== */
@keyframes fadeInUp {
	from { opacity: 0; transform: translateY(12px); }
	to { opacity: 1; transform: translateY(0); }
}
.animate-in {
	animation: fadeInUp .4s ease-out both;
}

/* ========== RESPONSIVE ========== */
@media (max-width: 1024px) {
	.main-layout { grid-template-columns: 1fr; }
	.sidebar {
		position: static;
		max-height: none;
		flex-direction: row;
		flex-wrap: wrap;
		padding-right: 0;
	}
	.filter-section { flex: 1; min-width: 220px; }
}
@media (max-width: 768px) {
	.stats-grid { gap: 6px; }
	.stat-item { padding: 14px 18px; min-width: 120px; }
	.stat-number { font-size: 24px; }
	.country-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
	.detail-panel { width: 100vw; }
	.detail-grid { grid-template-columns: 1fr; }
	.map-legend { display: none; }
	.nav-links .hide-mobile { display: none; }
}
@media (max-width: 480px) {
	.stat-item { min-width: 100px; padding: 10px 12px; }
	.stat-number { font-size: 20px; }
	.stat-label { font-size: 10px; }
}
</style>
</head>
<body>

<!-- ========== NAV ========== -->
<nav class="nav">
	<div class="container">
		<a href="/" class="nav-brand">
			<img src="/logo.svg" alt="${e.siteName} logo" width="32" height="32" />
			${e.siteName}
		</a>
		<div class="nav-links">
			<a href="/" class="hide-mobile">Home</a>
			<a href="/explore" class="active">Explore</a>
			<a href="/docs">API Docs</a>
			<a href="${e.githubUrl}" target="_blank" rel="noopener noreferrer" class="gh-link" aria-label="GitHub repository">
				<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
			</a>
		</div>
	</div>
</nav>

<!-- ========== STATS BAR ========== -->
<section class="stats-bar">
	<div class="container">
		<div class="stats-grid">
			<div class="stat-item animate-in" style="animation-delay:.05s">
				<span class="stat-number" data-count="252">0</span>
				<span class="stat-label">Countries</span>
			</div>
			<div class="stat-item animate-in" style="animation-delay:.1s">
				<span class="stat-number" data-count="5084" data-suffix="+">0</span>
				<span class="stat-label">States</span>
			</div>
			<div class="stat-item animate-in" style="animation-delay:.15s">
				<span class="stat-number" data-count="232000" data-suffix="+">0</span>
				<span class="stat-label">Cities</span>
			</div>
			<div class="stat-item animate-in" style="animation-delay:.2s">
				<span class="stat-number" data-count="312">0</span>
				<span class="stat-label">Timezones</span>
			</div>
			<div class="stat-item animate-in" style="animation-delay:.25s">
				<span class="stat-number" data-count="178">0</span>
				<span class="stat-label">Currencies</span>
			</div>
		</div>
	</div>
</section>

<!-- ========== MAIN LAYOUT ========== -->
<div class="container-wide">
	<div class="main-layout">

		<!-- ===== SIDEBAR FILTERS ===== -->
		<aside class="sidebar" id="sidebar">
			<div class="filter-section">
				<div class="filter-title">Search</div>
				<input type="text" class="filter-input" id="searchInput" placeholder="Search countries, states, cities..." autocomplete="off" />
			</div>

			<div class="filter-section">
				<div class="filter-title">Region</div>
				<div class="filter-pills" id="regionFilter">
					<button class="filter-pill" data-region="">All</button>
					<button class="filter-pill" data-region="Americas">Americas</button>
					<button class="filter-pill" data-region="Europe">Europe</button>
					<button class="filter-pill" data-region="Asia">Asia</button>
					<button class="filter-pill" data-region="Africa">Africa</button>
					<button class="filter-pill" data-region="Oceania">Oceania</button>
					<button class="filter-pill" data-region="Antarctic">Antarctic</button>
				</div>
			</div>

			<div class="filter-section">
				<div class="filter-title">Continent</div>
				<select class="filter-select" id="continentFilter">
					<option value="">All Continents</option>
					<option value="AF">Africa (AF)</option>
					<option value="AN">Antarctica (AN)</option>
					<option value="AS">Asia (AS)</option>
					<option value="EU">Europe (EU)</option>
					<option value="NA">North America (NA)</option>
					<option value="OC">Oceania (OC)</option>
					<option value="SA">South America (SA)</option>
				</select>
			</div>

			<div class="filter-section">
				<div class="filter-title">Options</div>
				<div class="filter-group">
					<label class="filter-label">Driving Side</label>
					<select class="filter-select" id="drivingFilter">
						<option value="">Any</option>
						<option value="right">Right</option>
						<option value="left">Left</option>
					</select>
				</div>
				<div class="filter-group">
					<label class="filter-label">Measurement System</label>
					<select class="filter-select" id="measurementFilter">
						<option value="">Any</option>
						<option value="metric">Metric</option>
						<option value="US">US</option>
						<option value="UK">UK</option>
					</select>
				</div>
				<div class="filter-group">
					<label class="filter-label">Currency</label>
					<select class="filter-select" id="currencyFilter">
						<option value="">Any Currency</option>
					</select>
				</div>
			</div>

			<div class="filter-section">
				<div class="filter-title">Population</div>
				<div class="filter-group">
					<input type="range" class="filter-range" id="populationFilter" min="0" max="10" step="1" value="0" />
					<div class="filter-range-value" id="populationValue">Any</div>
				</div>
			</div>

			<div class="filter-section">
				<div class="filter-title">Sort By</div>
				<select class="filter-select" id="sortFilter">
					<option value="name">Name (A to Z)</option>
					<option value="-name">Name (Z to A)</option>
					<option value="-population">Population (High to Low)</option>
					<option value="population">Population (Low to High)</option>
					<option value="-areaSqKm">Area (Largest)</option>
					<option value="areaSqKm">Area (Smallest)</option>
					<option value="-gdp">GDP (Highest)</option>
					<option value="-literacy">Literacy (Highest)</option>
				</select>
			</div>

			<button class="filter-clear" id="clearFilters">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				Clear all filters
			</button>
		</aside>

		<!-- ===== CONTENT ===== -->
		<main class="content">

			<!-- MAP -->
			<div class="map-section animate-in" style="animation-delay:.1s">
				<div class="map-header">
					<h2 class="map-title">World Map</h2>
					<div class="map-legend">
						<div class="map-legend-item"><span class="map-legend-dot" style="background:var(--region-americas)"></span>Americas</div>
						<div class="map-legend-item"><span class="map-legend-dot" style="background:var(--region-europe)"></span>Europe</div>
						<div class="map-legend-item"><span class="map-legend-dot" style="background:var(--region-asia)"></span>Asia</div>
						<div class="map-legend-item"><span class="map-legend-dot" style="background:var(--region-africa)"></span>Africa</div>
						<div class="map-legend-item"><span class="map-legend-dot" style="background:var(--region-oceania)"></span>Oceania</div>
					</div>
				</div>
				<div class="map-container" id="mapContainer">
					<svg class="map-svg" id="mapSvg" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet"></svg>
					<div class="map-tooltip" id="mapTooltip"></div>
					<div class="map-loading" id="mapLoading">Loading map data...</div>
				</div>
			</div>

			<!-- COUNTRY GRID -->
			<div class="grid-header">
				<div>
					<h2>Countries</h2>
					<span class="grid-count" id="gridCount"></span>
				</div>
			</div>
			<div class="country-grid" id="countryGrid"></div>

			<!-- TABS: Currencies & Timezones -->
			<div class="tabs-section">
				<div class="tabs-nav">
					<button class="tab-btn active" data-tab="currencies">Currencies</button>
					<button class="tab-btn" data-tab="timezones">Timezones</button>
				</div>
				<div class="tab-panel active" id="tab-currencies">
					<div class="currency-grid" id="currencyGrid">
						<div class="empty-state"><div class="spinner"></div></div>
					</div>
				</div>
				<div class="tab-panel" id="tab-timezones">
					<div id="timezoneList">
						<div class="empty-state"><div class="spinner"></div></div>
					</div>
				</div>
			</div>

		</main>
	</div>
</div>

<!-- ========== DETAIL PANEL OVERLAY ========== -->
<div class="detail-overlay" id="detailOverlay"></div>
<div class="detail-panel" id="detailPanel">
	<div class="detail-close">
		<button class="detail-close-btn" id="detailCloseBtn">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			Close
		</button>
		<div class="detail-nav-btns">
			<button class="detail-nav-btn" id="detailPrev" aria-label="Previous country">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
			</button>
			<button class="detail-nav-btn" id="detailNext" aria-label="Next country">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
			</button>
		</div>
	</div>
	<div class="detail-body" id="detailBody"></div>
</div>

<!-- ========== FOOTER ========== -->
<footer class="footer">
	<div class="container">
		<div class="footer-inner">
			<div class="footer-left">&copy; ${new Date().getFullYear()} ${e.siteName}</div>
			<div class="footer-links">
				<a href="/">Home</a>
				<a href="/docs">API Docs</a>
				<a href="${e.githubUrl}" target="_blank" rel="noopener noreferrer">GitHub</a>
			</div>
		</div>
	</div>
</footer>

<!-- ========== SCRIPTS ========== -->
<script type="text/javascript">
(function() {
	'use strict'

	/* ===== STATE ===== */
	var allCountries = []
	var filteredCountries = []
	var allStates = {}
	var allCurrencies = []
	var allTimezones = []
	var selectedCountry = null
	var selectedStateCode = null
	var searchTimeout = null
	var searchResults = null

	/* ===== DOM REFS ===== */
	var mapSvg = document.getElementById('mapSvg')
	var mapContainer = document.getElementById('mapContainer')
	var mapTooltip = document.getElementById('mapTooltip')
	var mapLoading = document.getElementById('mapLoading')
	var countryGrid = document.getElementById('countryGrid')
	var gridCount = document.getElementById('gridCount')
	var detailOverlay = document.getElementById('detailOverlay')
	var detailPanel = document.getElementById('detailPanel')
	var detailBody = document.getElementById('detailBody')
	var searchInput = document.getElementById('searchInput')
	var regionFilter = document.getElementById('regionFilter')
	var continentFilter = document.getElementById('continentFilter')
	var drivingFilter = document.getElementById('drivingFilter')
	var measurementFilter = document.getElementById('measurementFilter')
	var currencyFilterEl = document.getElementById('currencyFilter')
	var populationFilter = document.getElementById('populationFilter')
	var populationValue = document.getElementById('populationValue')
	var sortFilter = document.getElementById('sortFilter')
	var clearFilters = document.getElementById('clearFilters')

	/* ===== UTIL ===== */
	function fmt(n) {
		if (n == null) return 'N/A'
		if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T'
		if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
		if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
		if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
		return String(n)
	}

	function fmtFull(n) {
		if (n == null) return 'N/A'
		return n.toLocaleString()
	}

	function esc(s) {
		if (!s) return ''
		var d = document.createElement('div')
		d.textContent = s
		return d.innerHTML
	}

	function regionColor(region) {
		var r = (region || '').toLowerCase()
		if (r === 'americas') return 'var(--region-americas)'
		if (r === 'europe') return 'var(--region-europe)'
		if (r === 'asia') return 'var(--region-asia)'
		if (r === 'africa') return 'var(--region-africa)'
		if (r === 'oceania') return 'var(--region-oceania)'
		if (r === 'antarctic' || r === 'antarctica') return 'var(--region-antarctic)'
		return 'var(--region-default)'
	}

	/* project lat/lng to SVG coords (Equirectangular) */
	function projectX(lng) { return ((parseFloat(lng) + 180) / 360) * 1000 }
	function projectY(lat) { return ((90 - parseFloat(lat)) / 180) * 500 }

	/* population to dot radius (log scale) */
	function popRadius(pop) {
		if (!pop || pop <= 0) return 2
		var r = Math.log10(pop) * 1.3
		return Math.max(2, Math.min(r, 14))
	}

	/* population filter thresholds */
	var popThresholds = [
		0, 1e4, 1e5, 5e5, 1e6, 5e6, 1e7, 5e7, 1e8, 5e8, 1e9
	]
	var popLabels = [
		'Any', '10K+', '100K+', '500K+', '1M+', '5M+',
		'10M+', '50M+', '100M+', '500M+', '1B+'
	]

	/* ===== ANIMATED COUNTERS ===== */
	function animateCounters() {
		var els = document.querySelectorAll('[data-count]')
		for (var i = 0; i < els.length; i++) {
			(function(el) {
				var target = parseInt(el.getAttribute('data-count'))
				var suffix = el.getAttribute('data-suffix') || ''
				var duration = 1200
				var start = performance.now()
				function tick(now) {
					var elapsed = now - start
					var progress = Math.min(elapsed / duration, 1)
					/* ease out cubic */
					var eased = 1 - Math.pow(1 - progress, 3)
					var current = Math.round(eased * target)
					el.textContent = fmtFull(current) + suffix
					if (progress < 1) requestAnimationFrame(tick)
				}
				requestAnimationFrame(tick)
			})(els[i])
		}
	}

	/* ===== FETCH DATA ===== */
	function fetchJSON(url) {
		return fetch(url).then(function(r) { return r.json() })
	}

	function loadCountries() {
		return fetchJSON('/countries?fields=iso2,iso3,name,native,capital,population,areaSqKm,gdp,region,subregion,continent,emoji,latitude,longitude,currency,currencyName,currencySymbol,phoneCode,tld,drivingSide,measurementSystem,literacy,languages,nationality,neighbours,timezones,translations,firstDayOfWeek,timeFormat,postalCodeFormat,flagUrl')
			.then(function(data) {
				allCountries = Array.isArray(data) ? data : (data.data || [])
				filteredCountries = allCountries.slice()
				populateCurrencyFilter()
				applyFilters()
				renderMap()
				mapLoading.style.display = 'none'
			})
	}

	function loadStates(countryCode) {
		if (allStates[countryCode]) return Promise.resolve(allStates[countryCode])
		return fetchJSON('/countries/' + countryCode + '/states?fields=iso2,name,capital,population,timezone,type,latitude,longitude')
			.then(function(data) {
				var states = Array.isArray(data) ? data : (data.data || [])
				allStates[countryCode] = states
				return states
			})
	}

	function loadCities(countryCode, stateCode) {
		return fetchJSON('/countries/' + countryCode + '/states/' + stateCode + '/cities?fields=name,population,timezone,latitude,longitude')
			.then(function(data) {
				return Array.isArray(data) ? data : (data.data || [])
			})
	}

	function loadCurrencies() {
		return fetchJSON('/currencies')
			.then(function(data) {
				allCurrencies = Array.isArray(data) ? data : (data.data || [])
				renderCurrencies()
			})
	}

	function loadTimezones() {
		return fetchJSON('/timezones')
			.then(function(data) {
				allTimezones = Array.isArray(data) ? data : (data.data || [])
				renderTimezones()
			})
	}

	/* ===== MAP RENDERING ===== */
	function renderMap() {
		mapSvg.innerHTML = ''

		/* graticule / background grid lines */
		var grid = ''
		for (var lng = -180; lng <= 180; lng += 30) {
			var x = projectX(lng)
			grid += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="500" stroke="rgba(255,255,255,.03)" stroke-width="0.5"/>'
		}
		for (var lat = -90; lat <= 90; lat += 30) {
			var y = projectY(lat)
			grid += '<line x1="0" y1="' + y + '" x2="1000" y2="' + y + '" stroke="rgba(255,255,255,.03)" stroke-width="0.5"/>'
		}
		/* equator slightly brighter */
		grid += '<line x1="0" y1="250" x2="1000" y2="250" stroke="rgba(255,255,255,.06)" stroke-width="0.5"/>'
		mapSvg.innerHTML = grid

		/* render country dots */
		for (var i = 0; i < filteredCountries.length; i++) {
			var c = filteredCountries[i]
			if (!c.latitude || !c.longitude) continue
			var cx = projectX(c.longitude)
			var cy = projectY(c.latitude)
			var r = popRadius(c.population)
			var color = regionColor(c.region)
			var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
			circle.setAttribute('cx', cx.toFixed(1))
			circle.setAttribute('cy', cy.toFixed(1))
			circle.setAttribute('r', r.toFixed(1))
			circle.setAttribute('fill', color)
			circle.setAttribute('class', 'map-dot')
			circle.setAttribute('data-iso', c.iso2)
			circle.setAttribute('data-idx', String(i))
			if (selectedCountry && selectedCountry.iso2 === c.iso2) {
				circle.classList.add('active')
			}
			mapSvg.appendChild(circle)
		}
	}

	/* map tooltip */
	mapSvg.addEventListener('mousemove', function(e) {
		var dot = e.target.closest('.map-dot')
		if (!dot) {
			mapTooltip.classList.remove('visible')
			return
		}
		var iso = dot.getAttribute('data-iso')
		var c = allCountries.find(function(x) { return x.iso2 === iso })
		if (!c) return
		mapTooltip.innerHTML =
			'<div class="map-tooltip-name"><span class="map-tooltip-flag">' + esc(c.emoji) + '</span>' + esc(c.name) + '</div>' +
			'<div class="map-tooltip-row"><span>Capital</span><span>' + esc(c.capital) + '</span></div>' +
			'<div class="map-tooltip-row"><span>Population</span><span>' + fmtFull(c.population) + '</span></div>' +
			'<div class="map-tooltip-row"><span>Region</span><span>' + esc(c.region) + '</span></div>'

		var rect = mapContainer.getBoundingClientRect()
		var x = e.clientX - rect.left + 16
		var y = e.clientY - rect.top - 10

		/* keep tooltip in bounds */
		var tw = 220
		if (x + tw > rect.width) x = e.clientX - rect.left - tw - 10
		if (y < 0) y = 10

		mapTooltip.style.left = x + 'px'
		mapTooltip.style.top = y + 'px'
		mapTooltip.classList.add('visible')
	})

	mapSvg.addEventListener('mouseleave', function() {
		mapTooltip.classList.remove('visible')
	})

	mapSvg.addEventListener('click', function(e) {
		var dot = e.target.closest('.map-dot')
		if (!dot) return
		var iso = dot.getAttribute('data-iso')
		var c = allCountries.find(function(x) { return x.iso2 === iso })
		if (c) openDetail(c)
	})

	/* ===== FILTERS ===== */
	var activeRegion = ''

	function populateCurrencyFilter() {
		var seen = {}
		var options = []
		for (var i = 0; i < allCountries.length; i++) {
			var cc = allCountries[i].currency
			if (cc && !seen[cc]) {
				seen[cc] = true
				options.push({ code: cc, name: allCountries[i].currencyName || cc })
			}
		}
		options.sort(function(a, b) { return a.code.localeCompare(b.code) })
		for (var j = 0; j < options.length; j++) {
			var opt = document.createElement('option')
			opt.value = options[j].code
			opt.textContent = options[j].code + ' - ' + options[j].name
			currencyFilterEl.appendChild(opt)
		}
	}

	regionFilter.addEventListener('click', function(e) {
		var pill = e.target.closest('.filter-pill')
		if (!pill) return
		activeRegion = pill.getAttribute('data-region')
		var pills = regionFilter.querySelectorAll('.filter-pill')
		for (var i = 0; i < pills.length; i++) pills[i].classList.remove('active')
		pill.classList.add('active')
		applyFilters()
	})

	continentFilter.addEventListener('change', function() { applyFilters() })
	drivingFilter.addEventListener('change', function() { applyFilters() })
	measurementFilter.addEventListener('change', function() { applyFilters() })
	currencyFilterEl.addEventListener('change', function() { applyFilters() })
	sortFilter.addEventListener('change', function() { applyFilters() })

	populationFilter.addEventListener('input', function() {
		var idx = parseInt(populationFilter.value)
		populationValue.textContent = popLabels[idx]
		applyFilters()
	})

	searchInput.addEventListener('input', function() {
		var q = searchInput.value.trim()
		clearTimeout(searchTimeout)
		if (!q) {
			searchResults = null
			applyFilters()
			return
		}
		searchTimeout = setTimeout(function() {
			fetchJSON('/search?q=' + encodeURIComponent(q) + '&limit=100')
				.then(function(res) {
					var results = res.data || []
					var codes = {}
					for (var i = 0; i < results.length; i++) {
						codes[results[i].countryCode] = true
					}
					searchResults = codes
					applyFilters()
				})
		}, 250)
	})

	clearFilters.addEventListener('click', function() {
		searchInput.value = ''
		searchResults = null
		activeRegion = ''
		var pills = regionFilter.querySelectorAll('.filter-pill')
		for (var i = 0; i < pills.length; i++) pills[i].classList.remove('active')
		pills[0].classList.add('active')
		continentFilter.value = ''
		drivingFilter.value = ''
		measurementFilter.value = ''
		currencyFilterEl.value = ''
		populationFilter.value = '0'
		populationValue.textContent = 'Any'
		sortFilter.value = 'name'
		applyFilters()
	})

	function applyFilters() {
		var continent = continentFilter.value
		var driving = drivingFilter.value
		var measurement = measurementFilter.value
		var currency = currencyFilterEl.value
		var popIdx = parseInt(populationFilter.value)
		var popMin = popThresholds[popIdx]
		var sort = sortFilter.value

		filteredCountries = allCountries.filter(function(c) {
			if (searchResults && !searchResults[c.iso2]) return false
			if (activeRegion && c.region !== activeRegion) return false
			if (continent && c.continent !== continent) return false
			if (driving && c.drivingSide !== driving) return false
			if (measurement && c.measurementSystem !== measurement) return false
			if (currency && c.currency !== currency) return false
			if (popMin > 0 && c.population < popMin) return false
			return true
		})

		/* sort */
		var desc = sort.charAt(0) === '-'
		var key = desc ? sort.slice(1) : sort
		filteredCountries.sort(function(a, b) {
			var va = a[key], vb = b[key]
			if (va == null) va = desc ? -Infinity : Infinity
			if (vb == null) vb = desc ? -Infinity : Infinity
			if (typeof va === 'string') {
				var cmp = va.localeCompare(vb)
				return desc ? -cmp : cmp
			}
			return desc ? vb - va : va - vb
		})

		renderGrid()
		renderMap()
	}

	/* ===== COUNTRY GRID ===== */
	function renderGrid() {
		gridCount.textContent = filteredCountries.length + ' of ' + allCountries.length + ' countries'
		if (filteredCountries.length === 0) {
			countryGrid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🌍</div>No countries match your filters</div>'
			return
		}
		var html = ''
		for (var i = 0; i < filteredCountries.length; i++) {
			var c = filteredCountries[i]
			var isActive = selectedCountry && selectedCountry.iso2 === c.iso2
			html += '<div class="country-card' + (isActive ? ' active' : '') + '" data-iso="' + esc(c.iso2) + '">' +
				'<div class="country-card-top">' +
				'<span class="country-card-flag">' + esc(c.emoji) + '</span>' +
				'<div class="country-card-info">' +
				'<div class="country-card-name">' + esc(c.name) + '</div>' +
				'<div class="country-card-meta">' +
				'<span>' + esc(c.capital) + '</span>' +
				'<span>' + fmt(c.population) + '</span>' +
				'</div></div></div>' +
				'<span class="country-card-region" style="background:' + regionColor(c.region) + '22;color:' + regionColor(c.region) + '">' + esc(c.region) + '</span>' +
				'</div>'
		}
		countryGrid.innerHTML = html
	}

	countryGrid.addEventListener('click', function(e) {
		var card = e.target.closest('.country-card')
		if (!card) return
		var iso = card.getAttribute('data-iso')
		var c = allCountries.find(function(x) { return x.iso2 === iso })
		if (c) openDetail(c)
	})

	/* ===== DETAIL PANEL ===== */
	function openDetail(country) {
		selectedCountry = country
		selectedStateCode = null
		renderGrid()
		renderMap()
		renderDetail(country)
		detailOverlay.classList.add('open')
		detailPanel.classList.add('open')
		document.body.style.overflow = 'hidden'
	}

	function closeDetail() {
		detailOverlay.classList.remove('open')
		detailPanel.classList.remove('open')
		document.body.style.overflow = ''
		selectedCountry = null
		selectedStateCode = null
		renderGrid()
		renderMap()
	}

	document.getElementById('detailCloseBtn').addEventListener('click', closeDetail)
	detailOverlay.addEventListener('click', closeDetail)

	document.addEventListener('keydown', function(e) {
		if (e.key === 'Escape' && selectedCountry) closeDetail()
	})

	/* prev/next navigation */
	document.getElementById('detailPrev').addEventListener('click', function() {
		if (!selectedCountry) return
		var idx = filteredCountries.findIndex(function(c) { return c.iso2 === selectedCountry.iso2 })
		if (idx > 0) openDetail(filteredCountries[idx - 1])
	})
	document.getElementById('detailNext').addEventListener('click', function() {
		if (!selectedCountry) return
		var idx = filteredCountries.findIndex(function(c) { return c.iso2 === selectedCountry.iso2 })
		if (idx < filteredCountries.length - 1) openDetail(filteredCountries[idx + 1])
	})

	function renderDetail(c) {
		var html = ''

		/* hero */
		html += '<div class="detail-hero">'
		html += '<span class="detail-flag">' + esc(c.emoji) + '</span>'
		html += '<div class="detail-title-block">'
		html += '<div class="detail-country-name">' + esc(c.name) + '</div>'
		if (c.native && c.native !== c.name) {
			html += '<div class="detail-native-name">' + esc(c.native) + '</div>'
		}
		html += '<div class="detail-badges">'
		html += '<span class="detail-badge">' + esc(c.iso2) + '</span>'
		html += '<span class="detail-badge">' + esc(c.iso3) + '</span>'
		html += '<span class="detail-badge" style="background:' + regionColor(c.region) + '22;color:' + regionColor(c.region) + ';border-color:' + regionColor(c.region) + '33">' + esc(c.region) + '</span>'
		html += '</div></div></div>'

		/* info grid */
		html += '<div class="detail-grid">'
		html += cell('Capital', c.capital)
		html += cell('Population', fmtFull(c.population))
		html += cell('Area', c.areaSqKm ? fmtFull(c.areaSqKm) + ' km\\u00B2' : 'N/A')
		html += cell('GDP', c.gdp ? '$' + fmt(c.gdp) : 'N/A')
		html += cell('Region', c.region)
		html += cell('Subregion', c.subregion)
		html += cell('Continent', c.continent)
		html += cell('Languages', Array.isArray(c.languages) ? c.languages.join(', ') : (c.languages || 'N/A'))
		html += cell('Nationality', c.nationality)
		html += cell('Currency', c.currency ? c.currency + ' ' + (c.currencySymbol || '') + ' (' + (c.currencyName || '') + ')' : 'N/A')
		html += cell('Phone Code', c.phoneCode ? '+' + c.phoneCode : 'N/A')
		html += cell('TLD', c.tld || 'N/A')
		html += cell('Postal Code', c.postalCodeFormat || 'N/A')
		html += cell('Driving Side', c.drivingSide || 'N/A')
		html += cell('Measurement', c.measurementSystem || 'N/A')
		html += cell('First Day of Week', c.firstDayOfWeek || 'N/A')
		html += cell('Time Format', c.timeFormat || 'N/A')
		html += cell('Coordinates', (c.latitude || '') + ', ' + (c.longitude || ''))
		html += '</div>'

		/* literacy */
		if (c.literacy != null) {
			html += '<div class="detail-section">'
			html += '<div class="detail-section-title">Literacy Rate</div>'
			html += '<div style="display:flex;align-items:center;gap:12px">'
			html += '<div class="literacy-bar-bg" style="flex:1"><div class="literacy-bar-fill" style="width:' + Math.min(c.literacy, 100) + '%"></div></div>'
			html += '<span style="font-size:14px;font-weight:700;color:var(--green);font-variant-numeric:tabular-nums">' + c.literacy.toFixed(1) + '%</span>'
			html += '</div></div>'
		}

		/* neighbours */
		if (c.neighbours && c.neighbours.length > 0) {
			html += '<div class="detail-section">'
			html += '<div class="detail-section-title">Neighbours</div>'
			html += '<div class="neighbour-chips">'
			for (var i = 0; i < c.neighbours.length; i++) {
				var nb = c.neighbours[i]
				var nbCountry = allCountries.find(function(x) { return x.iso2 === nb })
				var nbLabel = nbCountry ? nbCountry.emoji + ' ' + nbCountry.name : nb
				html += '<button class="neighbour-chip" data-iso="' + esc(nb) + '">' + esc(nbLabel) + '</button>'
			}
			html += '</div></div>'
		}

		/* timezones */
		if (c.timezones && c.timezones.length > 0) {
			html += '<div class="detail-section">'
			html += '<div class="detail-section-title">Timezones (' + c.timezones.length + ')</div>'
			html += '<div class="tz-list">'
			var showCount = Math.min(c.timezones.length, 3)
			for (var t = 0; t < c.timezones.length; t++) {
				var tz = c.timezones[t]
				html += '<div class="tz-item" style="' + (t >= showCount ? 'display:none' : '') + '" data-tz-extra="' + (t >= showCount ? 'extra' : '') + '">'
				html += '<span class="tz-item-name">' + esc(tz.zoneName || tz.tzName || '') + '</span>'
				html += '<span>' + esc(tz.gmtOffsetName || '') + '</span>'
				html += '</div>'
			}
			if (c.timezones.length > showCount) {
				html += '<button class="tz-toggle" data-action="expand">Show all ' + c.timezones.length + ' timezones</button>'
			}
			html += '</div></div>'
		}

		/* translations */
		if (c.translations && Object.keys(c.translations).length > 0) {
			html += '<div class="detail-section">'
			html += '<div class="detail-section-title">Translations</div>'
			html += '<div class="translations-grid">'
			var langs = Object.keys(c.translations).sort()
			for (var l = 0; l < langs.length; l++) {
				html += '<div class="translation-item">'
				html += '<span class="translation-lang">' + esc(langs[l]) + '</span>'
				html += '<span class="translation-val">' + esc(c.translations[langs[l]]) + '</span>'
				html += '</div>'
			}
			html += '</div></div>'
		}

		/* states placeholder */
		html += '<div id="statesContainer"></div>'
		html += '<div id="citiesContainer"></div>'

		detailBody.innerHTML = html
		detailPanel.scrollTop = 0

		/* load states */
		loadStates(c.iso2).then(function(states) {
			renderStates(states, c.iso2)
		})
	}

	function cell(label, value) {
		return '<div class="detail-cell"><div class="detail-cell-label">' + esc(label) + '</div><div class="detail-cell-value">' + esc(String(value || 'N/A')) + '</div></div>'
	}

	/* event delegation for detail panel */
	detailBody.addEventListener('click', function(e) {
		/* neighbour chip */
		var chip = e.target.closest('.neighbour-chip')
		if (chip) {
			var iso = chip.getAttribute('data-iso')
			var c = allCountries.find(function(x) { return x.iso2 === iso })
			if (c) openDetail(c)
			return
		}

		/* timezone toggle */
		var tzBtn = e.target.closest('.tz-toggle')
		if (tzBtn) {
			var items = detailBody.querySelectorAll('[data-tz-extra="extra"]')
			var expanding = tzBtn.getAttribute('data-action') === 'expand'
			for (var i = 0; i < items.length; i++) {
				items[i].style.display = expanding ? 'flex' : 'none'
			}
			tzBtn.setAttribute('data-action', expanding ? 'collapse' : 'expand')
			tzBtn.textContent = expanding ? 'Show fewer' : 'Show all timezones'
			return
		}

		/* states header toggle */
		var stHeader = e.target.closest('.states-header')
		if (stHeader) {
			var body = stHeader.nextElementSibling
			body.classList.toggle('open')
			return
		}

		/* state row click */
		var stRow = e.target.closest('.state-row')
		if (stRow) {
			var stCode = stRow.getAttribute('data-state')
			var ctCode = stRow.getAttribute('data-country')
			selectedStateCode = stCode
			/* highlight active */
			var rows = detailBody.querySelectorAll('.state-row')
			for (var j = 0; j < rows.length; j++) rows[j].classList.remove('active')
			stRow.classList.add('active')
			/* load cities */
			loadCitiesForState(ctCode, stCode)
			return
		}
	})

	function renderStates(states, countryCode) {
		var container = document.getElementById('statesContainer')
		if (!container) return
		if (!states || states.length === 0) {
			container.innerHTML = ''
			return
		}
		var html = '<div class="states-section">'
		html += '<div class="states-header"><span class="states-header-title">States & Regions</span><span class="states-header-count">' + states.length + '</span></div>'
		html += '<div class="states-body open">'
		html += '<div class="states-search"><input type="text" placeholder="Filter states..." id="stateSearchInput" /></div>'
		html += '<div class="states-list" id="statesList">'
		for (var i = 0; i < states.length; i++) {
			var s = states[i]
			html += stateRowHtml(s, countryCode)
		}
		html += '</div></div></div>'
		container.innerHTML = html

		/* state search */
		var stateSearch = document.getElementById('stateSearchInput')
		if (stateSearch) {
			stateSearch.addEventListener('input', function() {
				var q = stateSearch.value.toLowerCase()
				var list = document.getElementById('statesList')
				if (!list) return
				var filtered = states.filter(function(s) {
					return s.name.toLowerCase().indexOf(q) !== -1 || (s.iso2 && s.iso2.toLowerCase().indexOf(q) !== -1)
				})
				var h = ''
				for (var i = 0; i < filtered.length; i++) {
					h += stateRowHtml(filtered[i], countryCode)
				}
				list.innerHTML = h || '<div class="empty-state" style="padding:24px">No states match</div>'
			})
		}
	}

	function stateRowHtml(s, countryCode) {
		return '<div class="state-row" data-state="' + esc(s.iso2) + '" data-country="' + esc(countryCode) + '">' +
			'<span class="state-name">' + esc(s.name) + (s.type ? ' <span style="color:var(--text-3);font-size:11px">(' + esc(s.type) + ')</span>' : '') + '</span>' +
			'<span class="state-meta">' +
			(s.capital ? '<span>' + esc(s.capital) + '</span>' : '') +
			(s.population ? '<span>' + fmt(s.population) + '</span>' : '') +
			'<span>' + esc(s.iso2 || '') + '</span>' +
			'</span></div>'
	}

	function loadCitiesForState(countryCode, stateCode) {
		var container = document.getElementById('citiesContainer')
		if (!container) return
		container.innerHTML = '<div class="cities-section"><div class="cities-header">Cities</div><div class="cities-loading"><span class="spinner"></span> Loading cities...</div></div>'
		loadCities(countryCode, stateCode).then(function(cities) {
			if (!cities || cities.length === 0) {
				container.innerHTML = '<div class="cities-section"><div class="cities-header">Cities</div><div class="cities-loading">No cities found</div></div>'
				return
			}
			cities.sort(function(a, b) { return (b.population || 0) - (a.population || 0) })
			var html = '<div class="cities-section">'
			html += '<div class="cities-header">Cities (' + cities.length + ')</div>'
			html += '<div class="cities-list">'
			for (var i = 0; i < cities.length; i++) {
				var city = cities[i]
				html += '<div class="city-row">'
				html += '<span class="city-name">' + esc(city.name) + '</span>'
				html += '<span class="city-meta">'
				if (city.population) html += '<span>' + fmt(city.population) + '</span>'
				if (city.timezone) html += '<span>' + esc(city.timezone) + '</span>'
				html += '</span></div>'
			}
			html += '</div></div>'
			container.innerHTML = html
		})
	}

	/* ===== CURRENCIES TAB ===== */
	function renderCurrencies() {
		var grid = document.getElementById('currencyGrid')
		if (allCurrencies.length === 0) {
			grid.innerHTML = '<div class="empty-state">No currencies found</div>'
			return
		}
		var html = ''
		for (var i = 0; i < allCurrencies.length; i++) {
			var cur = allCurrencies[i]
			html += '<div class="currency-card">'
			html += '<div class="currency-top">'
			html += '<div class="currency-symbol">' + esc(cur.symbol || cur.code.charAt(0)) + '</div>'
			html += '<div><div class="currency-code">' + esc(cur.code) + '</div>'
			html += '<div class="currency-name">' + esc(cur.name) + '</div></div></div>'
			html += '<div class="currency-details">'
			html += '<span>Decimals: ' + (cur.decimals != null ? cur.decimals : 'N/A') + '</span>'
			html += '<span>Countries: ' + (cur.countries ? cur.countries.length : 0) + '</span>'
			html += '</div>'
			if (cur.countries && cur.countries.length > 0) {
				html += '<div class="currency-countries">' + cur.countries.map(esc).join(', ') + '</div>'
			}
			html += '</div>'
		}
		grid.innerHTML = html
	}

	/* ===== TIMEZONES TAB ===== */
	function renderTimezones() {
		var container = document.getElementById('timezoneList')
		if (allTimezones.length === 0) {
			container.innerHTML = '<div class="empty-state">No timezones found</div>'
			return
		}

		/* group by offset extracted from timezone name */
		var groups = {}
		for (var i = 0; i < allTimezones.length; i++) {
			var tz = allTimezones[i]
			var parts = (tz.timezone || '').split('/')
			var area = parts[0] || 'Other'
			if (!groups[area]) groups[area] = []
			groups[area].push(tz)
		}

		var sortedKeys = Object.keys(groups).sort()
		var html = ''
		for (var k = 0; k < sortedKeys.length; k++) {
			var key = sortedKeys[k]
			var items = groups[key]
			html += '<div class="tz-group">'
			html += '<div class="tz-group-header">'
			html += '<span class="tz-offset">' + esc(key) + '</span>'
			html += '<span class="tz-group-count">' + items.length + ' timezone' + (items.length !== 1 ? 's' : '') + '</span>'
			html += '</div>'
			html += '<div class="tz-entries">'
			for (var j = 0; j < items.length; j++) {
				var item = items[j]
				html += '<div class="tz-entry">'
				html += '<div class="tz-entry-name">' + esc(item.timezone) + '</div>'
				html += '<div class="tz-entry-meta">'
				if (item.countryCodes && item.countryCodes.length > 0) {
					html += 'Countries: ' + item.countryCodes.map(esc).join(', ')
				}
				if (item.coordinates) html += ' &middot; ' + esc(item.coordinates)
				html += '</div></div>'
			}
			html += '</div></div>'
		}
		container.innerHTML = html
	}

	/* ===== TABS ===== */
	var tabBtns = document.querySelectorAll('.tab-btn')
	for (var i = 0; i < tabBtns.length; i++) {
		tabBtns[i].addEventListener('click', function() {
			var tab = this.getAttribute('data-tab')
			for (var j = 0; j < tabBtns.length; j++) tabBtns[j].classList.remove('active')
			this.classList.add('active')
			var panels = document.querySelectorAll('.tab-panel')
			for (var k = 0; k < panels.length; k++) panels[k].classList.remove('active')
			document.getElementById('tab-' + tab).classList.add('active')
		})
	}

	/* ===== INIT ===== */
	animateCounters()
	Promise.all([loadCountries(), loadCurrencies(), loadTimezones()])

})()
</script>

</body>
</html>`
}
