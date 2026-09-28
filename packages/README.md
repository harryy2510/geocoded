# Packages

Reusable packages live here at `0.1.0`. The public packages are intentionally source-first,
tree-shakeable, and data-light: package code fetches from the Geocoded API or
accepts caller-provided rows instead of bundling country, city, timezone, phone,
or currency datasets.

- `@geocoded/client`: shared TypeScript API client on ofetch. Collection methods use `/v2`. Get-one methods accept name or ISO code (`getCountry`, `getState`, `getCity`) and throw `GeocodedAmbiguousError` on collisions.
- `picker-core`: private shared pagination, filtering, formatter, debounce, and cache helpers.
- `react-picker-core`: private headless React picker primitive.
- `react-native-picker-core`: private headless React Native hook primitive.
- `react-country-region-picker`: country, region, and city pickers.
- `react-native-country-region-picker`: React Native country, region, and city hooks.
- `react-country-state-city-picker`: compatibility exports for the older package name.
- `react-currency-code-picker`: ISO 4217 currency code picker.
- `react-native-currency-code-picker`: React Native currency code hook.
- `currency-code-formatters`: framework-agnostic currency option and label helpers.
- `react-phone-number-field`: full phone-number input with country calling code selection.
- `react-native-phone-number-field`: React Native phone-number field hook.
- `phone-number-formatters`: framework-agnostic phone parsing, formatting, and validation helpers.
- `react-iana-timezone-picker`: IANA timezone picker.
- `react-native-iana-timezone-picker`: React Native timezone hook.
- `use-timezones`: framework-agnostic timezone options, grouping, and data source helpers.

Shared behavior across picker packages:

- Default page limit is `100`.
- Autocomplete is debounced and accent-insensitive.
- Async data sources support scroll/load-more pagination.
- React components are controlled or uncontrolled and expose render slots.
- React Native packages export headless hooks so any UI kit can render the controls.
- Form libraries can bind through `value`, `defaultValue`, `onValueChange`, and `name` where a DOM field is rendered.
