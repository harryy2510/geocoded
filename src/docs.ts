const BASE = 'https://geo.harryy.me'

export const docsHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Geo API</title>
<style>
	*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
	:root{
		--bg:#0a0a0b;--surface:#131316;--border:#1e1e24;
		--text:#e4e4e7;--muted:#71717a;--accent:#3b82f6;--accent-dim:#1d4ed8;
		--green:#22c55e;--orange:#f59e0b;--pink:#ec4899;
		--radius:8px;--font-mono:'SF Mono',Menlo,Consolas,monospace;
	}
	body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased}
	a{color:var(--accent);text-decoration:none}
	a:hover{text-decoration:underline}

	.container{max-width:800px;margin:0 auto;padding:48px 24px 96px}
	.hero{text-align:center;padding:64px 0 48px}
	.hero h1{font-size:2.5rem;font-weight:700;letter-spacing:-0.03em;margin-bottom:8px}
	.hero p{color:var(--muted);font-size:1.1rem;margin-bottom:24px}
	.hero .base-url{display:inline-block;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:8px 20px;font-family:var(--font-mono);font-size:0.95rem;color:var(--accent);user-select:all}

	.section{margin-top:56px}
	.section h2{font-size:1.35rem;font-weight:600;letter-spacing:-0.02em;margin-bottom:16px;display:flex;align-items:center;gap:10px}
	.section h2 .icon{font-size:1.1rem}
	.section>p{color:var(--muted);font-size:0.95rem;margin-bottom:20px}

	.endpoint-group{border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:12px}
	.endpoint-header{display:flex;align-items:center;gap:12px;padding:14px 18px;cursor:pointer;user-select:none;transition:background 0.15s}
	.endpoint-header:hover{background:var(--surface)}
	.endpoint-header .method{font-family:var(--font-mono);font-size:0.75rem;font-weight:700;padding:3px 8px;border-radius:4px;background:var(--accent-dim);color:#fff;flex-shrink:0}
	.endpoint-header .path{font-family:var(--font-mono);font-size:0.9rem;flex:1}
	.endpoint-header .path .param{color:var(--orange)}
	.endpoint-header .desc{color:var(--muted);font-size:0.85rem;flex-shrink:0}
	.endpoint-header .chevron{color:var(--muted);font-size:0.75rem;transition:transform 0.2s;flex-shrink:0}
	.endpoint-group.open .chevron{transform:rotate(90deg)}

	.endpoint-body{display:none;border-top:1px solid var(--border);padding:18px;background:var(--surface)}
	.endpoint-group.open .endpoint-body{display:block}

	.endpoint-body h4{font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);margin-bottom:8px;margin-top:16px}
	.endpoint-body h4:first-child{margin-top:0}

	.fields{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px}
	.fields .field{font-family:var(--font-mono);font-size:0.8rem;padding:2px 8px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text)}

	.example{position:relative;margin-bottom:8px}
	.example pre{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:12px 16px;font-family:var(--font-mono);font-size:0.85rem;overflow-x:auto;line-height:1.5}
	.example .comment{color:var(--muted)}
	.example .url{color:var(--green)}
	.example .qs{color:var(--orange)}
	.example .try-link{position:absolute;top:8px;right:8px;font-size:0.75rem;padding:3px 10px;border-radius:4px;background:var(--border);color:var(--muted);transition:all 0.15s;cursor:pointer;text-decoration:none}
	.example .try-link:hover{background:var(--accent-dim);color:#fff;text-decoration:none}

	.tip{background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:var(--radius);padding:16px 18px;margin-top:24px;font-size:0.9rem;color:var(--muted)}
	.tip code{font-family:var(--font-mono);font-size:0.85rem;color:var(--text);background:var(--bg);padding:1px 5px;border-radius:3px}

	.response-preview{margin-top:8px}
	.response-preview pre{font-size:0.8rem;color:var(--muted)}
	.response-preview .key{color:var(--pink)}
	.response-preview .str{color:var(--green)}
	.response-preview .num{color:var(--orange)}

	@media(max-width:640px){
		.hero h1{font-size:1.8rem}
		.endpoint-header{flex-wrap:wrap;gap:8px}
		.endpoint-header .desc{display:none}
	}
</style>
</head>
<body>
<div class="container">
	<div class="hero">
		<h1>Geo API</h1>
		<p>Free country, state, city, and location data. Fast, cached, and filterable.</p>
		<div class="base-url">${BASE}</div>
	</div>

	<!-- Authentication -->
	<div class="section">
		<h2><span class="icon">&#128274;</span> Authentication</h2>
		<p>All API endpoints require an API key passed via the <code style="font-family:var(--font-mono);background:var(--surface);padding:2px 6px;border-radius:3px">Authorization</code> header using the Bearer scheme.</p>
		<div class="example">
			<pre><span class="comment"># include your API key in every request</span>
curl -H <span class="str">"Authorization: Bearer YOUR_API_KEY"</span> <span class="url">${BASE}/countries</span></pre>
		</div>
		<div class="tip">
			<strong style="color:var(--text)">Need an API key?</strong> Send a request to <a href="mailto:contact@harryy.me">contact@harryy.me</a> to get one.
		</div>
	</div>

	<!-- Field Selection -->
	<div class="section">
		<h2><span class="icon">&#9881;</span> Field Selection</h2>
		<p>Add <code style="font-family:var(--font-mono);background:var(--surface);padding:2px 6px;border-radius:3px">?fields=</code> to any endpoint to return only the fields you need. Comma-separated, case-sensitive.</p>
		<div class="example">
			<pre><span class="comment"># returns only name, iso2, and emoji for each country</span>
<span class="url">${BASE}/countries</span><span class="qs">?fields=name,iso2,emoji</span></pre>
		</div>
		<div class="tip">When <code>fields</code> is omitted, all fields are returned. Unknown field names are silently ignored.</div>
	</div>

	<!-- Location -->
	<div class="section">
		<h2><span class="icon">&#128205;</span> Location</h2>

		<div class="endpoint-group">
			<div class="endpoint-header" onclick="this.parentElement.classList.toggle('open')">
				<span class="method">GET</span>
				<span class="path">/location</span>
				<span class="desc">Get caller's geo info</span>
				<span class="chevron">&#9654;</span>
			</div>
			<div class="endpoint-body">
				<h4>Fields</h4>
				<div class="fields">
					<span class="field">asn</span><span class="field">asOrganization</span><span class="field">city</span><span class="field">colo</span><span class="field">continent</span><span class="field">country</span><span class="field">ip</span><span class="field">isEU</span><span class="field">latitude</span><span class="field">longitude</span><span class="field">postalCode</span><span class="field">region</span><span class="field">regionCode</span><span class="field">timezone</span>
				</div>
				<p style="color:var(--muted);font-size:0.9rem;margin-top:12px;margin-bottom:12px">Returns geographic information about the caller based on their IP address, using Cloudflare's edge network data.</p>

				<h4>Examples</h4>
				<div class="example">
					<pre><span class="comment"># get your full location info</span>
curl <span class="url">${BASE}/location</span></pre>
					<a class="try-link" href="${BASE}/location" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># just your IP and country</span>
curl <span class="url">${BASE}/location</span><span class="qs">?fields=ip,country,city</span></pre>
					<a class="try-link" href="${BASE}/location?fields=ip,country,city" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># coordinates and timezone</span>
curl <span class="url">${BASE}/location</span><span class="qs">?fields=latitude,longitude,timezone</span></pre>
					<a class="try-link" href="${BASE}/location?fields=latitude,longitude,timezone" target="_blank">Try it</a>
				</div>
			</div>
		</div>
	</div>

	<!-- Countries -->
	<div class="section">
		<h2><span class="icon">&#127758;</span> Countries</h2>

		<div class="endpoint-group">
			<div class="endpoint-header" onclick="this.parentElement.classList.toggle('open')">
				<span class="method">GET</span>
				<span class="path">/countries</span>
				<span class="desc">List all countries</span>
				<span class="chevron">&#9654;</span>
			</div>
			<div class="endpoint-body">
				<h4>Fields</h4>
				<div class="fields">
					<span class="field">areaSqKm</span><span class="field">capital</span><span class="field">currency</span><span class="field">currencyName</span><span class="field">currencySymbol</span><span class="field">emoji</span><span class="field">emojiU</span><span class="field">gdp</span><span class="field">iso2</span><span class="field">iso3</span><span class="field">latitude</span><span class="field">longitude</span><span class="field">name</span><span class="field">nationality</span><span class="field">native</span><span class="field">numericCode</span><span class="field">phoneCode</span><span class="field">population</span><span class="field">postalCodeFormat</span><span class="field">postalCodeRegex</span><span class="field">region</span><span class="field">subregion</span><span class="field">timezones</span><span class="field">tld</span><span class="field">translations</span><span class="field">wikiDataId</span>
				</div>

				<h4>Examples</h4>
				<div class="example">
					<pre><span class="comment"># all countries with name and flag</span>
curl <span class="url">${BASE}/countries</span><span class="qs">?fields=name,emoji</span></pre>
					<a class="try-link" href="${BASE}/countries?fields=name,emoji" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># country names, codes, and phone codes</span>
curl <span class="url">${BASE}/countries</span><span class="qs">?fields=name,iso2,phoneCode</span></pre>
					<a class="try-link" href="${BASE}/countries?fields=name,iso2,phoneCode" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># all countries with region info</span>
curl <span class="url">${BASE}/countries</span><span class="qs">?fields=name,region,subregion</span></pre>
					<a class="try-link" href="${BASE}/countries?fields=name,region,subregion" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># country list for a dropdown</span>
curl <span class="url">${BASE}/countries</span><span class="qs">?fields=name,iso2,emoji,phoneCode</span></pre>
					<a class="try-link" href="${BASE}/countries?fields=name,iso2,emoji,phoneCode" target="_blank">Try it</a>
				</div>
			</div>
		</div>

		<div class="endpoint-group">
			<div class="endpoint-header" onclick="this.parentElement.classList.toggle('open')">
				<span class="method">GET</span>
				<span class="path">/countries/<span class="param">:id</span></span>
				<span class="desc">Get one country</span>
				<span class="chevron">&#9654;</span>
			</div>
			<div class="endpoint-body">
				<h4>Lookup by</h4>
				<p style="color:var(--muted);font-size:0.9rem;margin-bottom:12px">iso2 code, iso3 code, or country name (case-insensitive)</p>

				<h4>Examples</h4>
				<div class="example">
					<pre><span class="comment"># by ISO 2 code</span>
curl <span class="url">${BASE}/countries/US</span></pre>
					<a class="try-link" href="${BASE}/countries/US" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># by ISO 3 code</span>
curl <span class="url">${BASE}/countries/USA</span></pre>
					<a class="try-link" href="${BASE}/countries/USA" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># by name</span>
curl <span class="url">${BASE}/countries/japan</span></pre>
					<a class="try-link" href="${BASE}/countries/japan" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># with field selection</span>
curl <span class="url">${BASE}/countries/DE</span><span class="qs">?fields=name,capital,currency,phoneCode</span></pre>
					<a class="try-link" href="${BASE}/countries/DE?fields=name,capital,currency,phoneCode" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># just the coordinates</span>
curl <span class="url">${BASE}/countries/BR</span><span class="qs">?fields=name,latitude,longitude</span></pre>
					<a class="try-link" href="${BASE}/countries/BR?fields=name,latitude,longitude" target="_blank">Try it</a>
				</div>
			</div>
		</div>
	</div>

	<!-- States -->
	<div class="section">
		<h2><span class="icon">&#127963;</span> States</h2>

		<div class="endpoint-group">
			<div class="endpoint-header" onclick="this.parentElement.classList.toggle('open')">
				<span class="method">GET</span>
				<span class="path">/countries/<span class="param">:country</span>/states</span>
				<span class="desc">List states for a country</span>
				<span class="chevron">&#9654;</span>
			</div>
			<div class="endpoint-body">
				<h4>Fields</h4>
				<div class="fields">
					<span class="field">countryCode</span><span class="field">countryName</span><span class="field">fipsCode</span><span class="field">iso2</span><span class="field">iso31662</span><span class="field">latitude</span><span class="field">level</span><span class="field">longitude</span><span class="field">name</span><span class="field">native</span><span class="field">parentId</span><span class="field">population</span><span class="field">timezone</span><span class="field">translations</span><span class="field">type</span><span class="field">wikiDataId</span>
				</div>

				<h4>Examples</h4>
				<div class="example">
					<pre><span class="comment"># all US states</span>
curl <span class="url">${BASE}/countries/US/states</span><span class="qs">?fields=name,iso2</span></pre>
					<a class="try-link" href="${BASE}/countries/US/states?fields=name,iso2" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># Indian states with coordinates</span>
curl <span class="url">${BASE}/countries/IN/states</span><span class="qs">?fields=name,latitude,longitude</span></pre>
					<a class="try-link" href="${BASE}/countries/IN/states?fields=name,latitude,longitude" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># German states with type info</span>
curl <span class="url">${BASE}/countries/DE/states</span><span class="qs">?fields=name,type,population</span></pre>
					<a class="try-link" href="${BASE}/countries/DE/states?fields=name,type,population" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># Canadian provinces for a dropdown</span>
curl <span class="url">${BASE}/countries/CA/states</span><span class="qs">?fields=name,iso2</span></pre>
					<a class="try-link" href="${BASE}/countries/CA/states?fields=name,iso2" target="_blank">Try it</a>
				</div>
			</div>
		</div>

		<div class="endpoint-group">
			<div class="endpoint-header" onclick="this.parentElement.classList.toggle('open')">
				<span class="method">GET</span>
				<span class="path">/countries/<span class="param">:country</span>/states/<span class="param">:state</span></span>
				<span class="desc">Get one state</span>
				<span class="chevron">&#9654;</span>
			</div>
			<div class="endpoint-body">
				<h4>Lookup by</h4>
				<p style="color:var(--muted);font-size:0.9rem;margin-bottom:12px">iso2 code or state name (case-insensitive)</p>

				<h4>Examples</h4>
				<div class="example">
					<pre><span class="comment"># by code</span>
curl <span class="url">${BASE}/countries/US/states/CA</span></pre>
					<a class="try-link" href="${BASE}/countries/US/states/CA" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># by name</span>
curl <span class="url">${BASE}/countries/US/states/texas</span></pre>
					<a class="try-link" href="${BASE}/countries/US/states/texas" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># with field selection</span>
curl <span class="url">${BASE}/countries/AU/states/NSW</span><span class="qs">?fields=name,latitude,longitude,timezone</span></pre>
					<a class="try-link" href="${BASE}/countries/AU/states/NSW?fields=name,latitude,longitude,timezone" target="_blank">Try it</a>
				</div>
			</div>
		</div>
	</div>

	<!-- Cities -->
	<div class="section">
		<h2><span class="icon">&#127961;</span> Cities</h2>

		<div class="endpoint-group">
			<div class="endpoint-header" onclick="this.parentElement.classList.toggle('open')">
				<span class="method">GET</span>
				<span class="path">/countries/<span class="param">:country</span>/states/<span class="param">:state</span>/cities</span>
				<span class="desc">List cities for a state</span>
				<span class="chevron">&#9654;</span>
			</div>
			<div class="endpoint-body">
				<h4>Fields</h4>
				<div class="fields">
					<span class="field">countryCode</span><span class="field">countryName</span><span class="field">latitude</span><span class="field">level</span><span class="field">longitude</span><span class="field">name</span><span class="field">native</span><span class="field">parentId</span><span class="field">population</span><span class="field">stateCode</span><span class="field">stateName</span><span class="field">timezone</span><span class="field">translations</span><span class="field">type</span><span class="field">wikiDataId</span>
				</div>

				<h4>Examples</h4>
				<div class="example">
					<pre><span class="comment"># cities in California</span>
curl <span class="url">${BASE}/countries/US/states/CA/cities</span><span class="qs">?fields=name,population</span></pre>
					<a class="try-link" href="${BASE}/countries/US/states/CA/cities?fields=name,population" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># cities in Tokyo with coordinates</span>
curl <span class="url">${BASE}/countries/JP/states/13/cities</span><span class="qs">?fields=name,latitude,longitude</span></pre>
					<a class="try-link" href="${BASE}/countries/JP/states/13/cities?fields=name,latitude,longitude" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># cities in England</span>
curl <span class="url">${BASE}/countries/GB/states/ENG/cities</span><span class="qs">?fields=name,population</span></pre>
					<a class="try-link" href="${BASE}/countries/GB/states/ENG/cities?fields=name,population" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># Brazilian cities in S&#227;o Paulo</span>
curl <span class="url">${BASE}/countries/BR/states/SP/cities</span><span class="qs">?fields=name,timezone</span></pre>
					<a class="try-link" href="${BASE}/countries/BR/states/SP/cities?fields=name,timezone" target="_blank">Try it</a>
				</div>
			</div>
		</div>

		<div class="endpoint-group">
			<div class="endpoint-header" onclick="this.parentElement.classList.toggle('open')">
				<span class="method">GET</span>
				<span class="path">/countries/<span class="param">:country</span>/states/<span class="param">:state</span>/cities/<span class="param">:city</span></span>
				<span class="desc">Get one city</span>
				<span class="chevron">&#9654;</span>
			</div>
			<div class="endpoint-body">
				<h4>Lookup by</h4>
				<p style="color:var(--muted);font-size:0.9rem;margin-bottom:12px">City name (case-insensitive)</p>

				<h4>Examples</h4>
				<div class="example">
					<pre><span class="comment"># Los Angeles</span>
curl <span class="url">${BASE}/countries/US/states/CA/cities/los angeles</span></pre>
					<a class="try-link" href="${BASE}/countries/US/states/CA/cities/los angeles" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># Toronto</span>
curl <span class="url">${BASE}/countries/CA/states/ON/cities/toronto</span></pre>
					<a class="try-link" href="${BASE}/countries/CA/states/ON/cities/toronto" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># Mumbai with selected fields</span>
curl <span class="url">${BASE}/countries/IN/states/MH/cities/mumbai</span><span class="qs">?fields=name,population,latitude,longitude</span></pre>
					<a class="try-link" href="${BASE}/countries/IN/states/MH/cities/mumbai?fields=name,population,latitude,longitude" target="_blank">Try it</a>
				</div>
				<div class="example">
					<pre><span class="comment"># Berlin</span>
curl <span class="url">${BASE}/countries/DE/states/BE/cities/berlin</span></pre>
					<a class="try-link" href="${BASE}/countries/DE/states/BE/cities/berlin" target="_blank">Try it</a>
				</div>
			</div>
		</div>
	</div>

	<!-- Usage Tips -->
	<div class="section">
		<h2><span class="icon">&#128161;</span> Tips</h2>
		<div class="tip" style="margin-top:0">
			<strong style="color:var(--text)">Responses are cached for 1 year.</strong> Data changes infrequently, so aggressive caching is safe.
		</div>
		<div class="tip">
			<strong style="color:var(--text)">Use <code>fields</code> to keep payloads small.</strong> A full country list is ~250 KB. With <code>?fields=name,iso2</code> it drops to ~8 KB.
		</div>
		<div class="tip">
			<strong style="color:var(--text)">CORS is enabled.</strong> Call directly from the browser &mdash; no proxy needed.
		</div>
		<div class="tip">
			<strong style="color:var(--text)">Lookups are case-insensitive.</strong> <code>/countries/us</code>, <code>/countries/US</code>, and <code>/countries/united states</code> all work.
		</div>
	</div>

	<div style="text-align:center;margin-top:64px;color:var(--muted);font-size:0.85rem">
		Data from <a href="https://github.com/dr5hn/countries-states-cities-database">dr5hn/countries-states-cities-database</a>
	</div>
</div>
</body>
</html>`
