# Geocoded Site

Astro documentation site for the Geocoded Worker API.

## Project Structure

Inside `apps/site/`:

```text
apps/site/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## Commands

Run site commands from the repo root through the Bun workspace:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `bun install`             | Installs all workspace dependencies              |
| `bun dev:site`            | Starts the site dev server                       |
| `bun build:site`          | Builds the production site to `apps/site/dist/`  |
| `bun preview:site`        | Previews the built site locally                  |
| `bun run --filter @geocoded/site dev`     | Starts the site dev server directly              |
| `bun run --filter @geocoded/site build`   | Builds the production site directly              |
| `bun run --filter @geocoded/site preview` | Previews the built site locally                  |
| `bun run --filter @geocoded/site astro -- --help` | Shows Astro CLI help                  |
