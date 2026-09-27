# Publishing packages

Packages publish from CI through GitHub OIDC (npm trusted publishing). No npm token is stored.
The release job is `.github/workflows/publish.yml`, which calls Utilities Studio Infra's shared
`npm-publish.yml`. Lerna-Lite versions changed packages from conventional commits, commits the
versions and changelogs to `main` with `[skip ci]`, tags them, and publishes versions missing from npm.

## Every release

Merge to `main` with conventional commits (`fix:` patch, `feat:` minor, `!` major). Nothing else.

Before merging, `bun run check` must pass: lint, format, package build (tsdown, with publint and
attw), tests, size budgets, and knip.

## One-time setup (owner)

1. GitHub: create the `npm-publish` environment, restricted to `main`, with no reviewers or wait
   timers. Allow GitHub Actions to push commits and tags to `main`.
2. npm: publish the first version of each package once, locally, because trust can only be set on a
   package that exists:

   ```bash
   npm login
   bun install
   bun run build:packages
   bun run release:publish
   ```

   `react-country-state-city-picker` already exists on npm (0.2.1); its first release from here is
   0.3.0 and needs your publish access to that package.

3. Register this repo as the trusted publisher for every package:

   ```bash
   bunx @utilities-studio/npm-trust@latest
   ```

   Defaults match this repo: workflow `publish.yml`, environment `npm-publish`.

After that, releases are automatic from `main`.
