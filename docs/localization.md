# Localization

OpenMark now has a small localization foundation for app-shell UI strings. The first supported locales are English and Simplified Chinese.

## Runtime Behavior

- The language preference is stored in `localStorage` under `openmark:locale`.
- Users can choose System, English, or Simplified Chinese from Appearance settings.
- System language resolves Chinese browser languages to `zh-CN`; all other languages fall back to English.
- The document root `lang` attribute follows the active app locale.
- Exported HTML uses the active app locale in its `<html lang="...">` attribute.

## Source Files

- `src/i18n.ts` stores the typed translation catalog, supported locale preferences, and system language resolver.
- `src/App.tsx` consumes the active catalog for core shell labels, command palette items, search controls, status text, settings, and alerts.

## Adding A Locale

1. Add the locale code to `AppLocale` in `src/i18n.ts`.
2. Add the preference value to `localePreferenceValues`.
3. Create a complete translation catalog matching the English catalog shape.
4. Add the locale to `translations`.
5. Add a language option in `src/App.tsx` if it should be user-selectable.
6. Run `npm run lint` and `npm run build`.

## Translation Rules

- Keep command labels short enough for the command palette and toolbar.
- Preserve product names such as OpenMark.
- Keep keyboard shortcut text unchanged.
- Do not translate Markdown syntax examples or file extensions.
- Prefer concise UI labels over explanatory sentences.

## Next Localization Targets

- Electron application menu labels.
- Release notes and issue template guidance.
- Remaining editor formatting tooltips and sample Markdown snippets.
- Locale-aware plural handling for word counts.
