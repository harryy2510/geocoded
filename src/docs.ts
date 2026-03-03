export const docsHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Geocoded — Free Country, State, City & Location API</title>
<meta name="description" content="Free, fast REST API for country, state, city, and IP geolocation data. Powered by Cloudflare Workers with global edge caching." />
<meta name="theme-color" content="#0a0a0b" />
<link rel="canonical" href="https://geocoded.me" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://geocoded.me" />
<meta property="og:title" content="Geocoded — Free Country, State, City & Location API" />
<meta property="og:description" content="Free, fast REST API for country, state, city, and IP geolocation data. Powered by Cloudflare Workers with global edge caching." />
<meta property="og:site_name" content="Geocoded" />
<meta property="og:image" content="https://geocoded.me/logo.png" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="Geocoded — Free Country, State, City & Location API" />
<meta name="twitter:description" content="Free, fast REST API for country, state, city, and IP geolocation data. Powered by Cloudflare Workers with global edge caching." />
<meta name="twitter:image" content="https://geocoded.me/logo.png" />
<link rel="icon" type="image/png" href="/logo.png" />
<link rel="apple-touch-icon" href="/logo.png" />
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
	})
</script>
</body>
</html>`
