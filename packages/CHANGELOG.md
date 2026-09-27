# Changelog

## 0.1.0

- First public workspace release of the Geocoded client, pickers, and formatters.
- `@geocoded/client` talks to `/v2` collections and get-one lookups through ofetch.
- Get-one country, state, and city methods accept name or ISO code.
- Shared identifiers throw `GeocodedAmbiguousError` with `matches`.
- Search remains the v1 `/search` route.
