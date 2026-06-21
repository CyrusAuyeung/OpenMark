# Release Notes

## Summary

OpenMark 0.28.0 focuses on preview source navigation hardening. It includes shared preview source navigation helpers now live in `src/previewSourceNavigation.ts` so click targeting, source range parsing, and line estimation can be tested outside `App.tsx`, regression tests now cover source range extraction for headings, preserved blank lines, blockquotes, nested lists, tables, and fenced code blocks rendered from real Markdown, and preview source navigation now rejects invalid source metadata and keeps links and native controls from being intercepted by source-jump handling.

## Highlights

### Preview Source Navigation Hardening

- Shared preview source navigation helpers now live in `src/previewSourceNavigation.ts` so click targeting, source range parsing, and line estimation can be tested outside `App.tsx`.
- Regression tests now cover source range extraction for headings, preserved blank lines, blockquotes, nested lists, tables, and fenced code blocks rendered from real Markdown.
- Preview source navigation now rejects invalid source metadata and keeps links and native controls from being intercepted by source-jump handling.

## Downloads

Choose the package for your operating system from the assets below.

| Platform | Asset | Notes |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.28.0.exe` | Recommended installer. |
| Windows | `OpenMark.0.28.0.exe` | Portable app. |
| macOS Intel | `OpenMark-0.28.0.dmg` | Unsigned/not notarized for now. |
| macOS Apple Silicon | `OpenMark-0.28.0-arm64.dmg` | Unsigned/not notarized for now. |
| Linux Debian/Ubuntu | `openmark-editor_0.28.0_amd64.deb` | System package install. |

Keep these auto-update metadata files attached when generated:

- `latest.yml`
- `latest-mac.yml`
- Linux update metadata `*.yml`

## Upgrade Notes

- Packaged builds can check for updates from **Help > Check for Updates...** or **Settings > Updates**.
- Windows and macOS builds may show operating-system warnings until signed releases are published.

## Verification Checklist

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run release:notes -- --check`
- [ ] `npm run release:check`
- [ ] `npm run build`
- [ ] Windows artifacts built and smoke checked
- [ ] macOS artifacts built and smoke checked
- [ ] Linux artifacts built and smoke checked
- [ ] `latest*.yml` update metadata attached when generated
- [ ] Draft release reviewed before publishing

## Known Limitations

- Windows code signing is optional until signing secrets are configured.
- macOS builds are currently unsigned and not notarized.
- Linux AppImage support is planned after the `.deb` release path is stable.
- The core CodeMirror editor still loads with the editing surface while deeper editor lazy-loading is evaluated.

## Full Changelog

- Release date: 2026-06-22
- Tag: v0.28.0
