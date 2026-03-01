export const registerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Register — Geo API</title>
<style>
	*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
	:root{
		--bg:#0a0a0b;--surface:#131316;--border:#1e1e24;
		--text:#e4e4e7;--muted:#71717a;--accent:#3b82f6;--accent-hover:#2563eb;
		--green:#22c55e;--red:#ef4444;
		--radius:8px;--font-mono:'SF Mono',Menlo,Consolas,monospace;
	}
	body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased;min-height:100vh;display:flex;align-items:center;justify-content:center}
	a{color:var(--accent);text-decoration:none}
	a:hover{text-decoration:underline}

	.card{width:100%;max-width:420px;margin:24px;padding:40px;background:var(--surface);border:1px solid var(--border);border-radius:12px}
	.card h1{font-size:1.5rem;font-weight:700;letter-spacing:-0.02em;margin-bottom:4px}
	.card p{color:var(--muted);font-size:0.9rem;margin-bottom:28px}
	.card .back{display:inline-block;margin-bottom:20px;font-size:0.85rem;color:var(--muted)}
	.card .back:hover{color:var(--text)}

	label{display:block;font-size:0.85rem;font-weight:500;margin-bottom:6px;color:var(--muted)}
	input{width:100%;padding:10px 14px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:0.95rem;outline:none;transition:border-color 0.15s}
	input:focus{border-color:var(--accent)}
	input::placeholder{color:#52525b}
	.field{margin-bottom:18px}

	button{width:100%;padding:11px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius);font-size:0.95rem;font-weight:600;cursor:pointer;transition:background 0.15s}
	button:hover{background:var(--accent-hover)}
	button:disabled{opacity:0.6;cursor:not-allowed}

	.message{margin-top:16px;padding:12px 16px;border-radius:var(--radius);font-size:0.9rem;display:none}
	.message.success{display:block;background:#052e16;border:1px solid #14532d;color:var(--green)}
	.message.error{display:block;background:#2a0a0a;border:1px solid #7f1d1d;color:var(--red)}
</style>
</head>
<body>
<div class="card">
	<a href="/" class="back">&larr; Back to docs</a>
	<h1>Get an API Key</h1>
	<p>Enter your name and email to receive a free API key.</p>
	<form id="register-form">
		<div class="field">
			<label for="name">Name</label>
			<input type="text" id="name" name="name" placeholder="Jane Doe" required />
		</div>
		<div class="field">
			<label for="email">Email</label>
			<input type="email" id="email" name="email" placeholder="jane@example.com" required />
		</div>
		<button type="submit" id="submit-btn">Get API Key</button>
	</form>
	<div id="message" class="message"></div>
</div>
<script>
	const form = document.getElementById('register-form')
	const msg = document.getElementById('message')
	const btn = document.getElementById('submit-btn')
	form.addEventListener('submit', async (e) => {
		e.preventDefault()
		msg.className = 'message'
		btn.disabled = true
		btn.textContent = 'Sending...'
		try {
			const res = await fetch('/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: form.name.value.trim(),
					email: form.email.value.trim(),
				}),
			})
			const data = await res.json()
			if (res.ok && data.success) {
				msg.textContent = data.message
				msg.className = 'message success'
				form.reset()
			} else {
				msg.textContent = data.error || 'Something went wrong'
				msg.className = 'message error'
			}
		} catch {
			msg.textContent = 'Network error. Please try again.'
			msg.className = 'message error'
		}
		btn.disabled = false
		btn.textContent = 'Get API Key'
	})
</script>
</body>
</html>`
