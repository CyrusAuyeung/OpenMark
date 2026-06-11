# Release Notes

## Summary

OpenMark 0.18.0 focuses on preview alignment & review actions. It includes preview-side cursor alignment so split-view editing shows the corresponding preview position, refinements to the editor header and top bar with a cleaner formatting toolbar, no redundant Markdown label, and a refreshed OpenMark mark and favicon, and review marker actions in the document inspector so selected lines can be marked as TODO, FIXME, REVIEW, or NOTE without typing marker syntax manually.

## Highlights

### Preview Alignment & Review Actions

- Added preview-side cursor alignment so split-view editing shows the corresponding preview position.
- Refined the editor header and top bar with a cleaner formatting toolbar, no redundant Markdown label, and a refreshed OpenMark mark and favicon.
- Added review marker actions in the document inspector so selected lines can be marked as TODO, FIXME, REVIEW, or NOTE without typing marker syntax manually.
- Localized review marker insertion and display for Simplified Chinese, while keeping English marker compatibility.
- Improved preview cursor fallback alignment for documents without headings by matching the current editor line to rendered preview content blocks.

## Downloads

Choose the package for your operating system from the assets below.

| Platform | Asset | Notes |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.18.0.exe` | Recommended installer. |
| Windows | `OpenMark.0.18.0.exe` | Portable app. |
| macOS Intel | `OpenMark-0.18.0.dmg` | Unsigned/not notarized for now. |
| macOS Apple Silicon | `OpenMark-0.18.0-arm64.dmg` | Unsigned/not notarized for now. |
| Linux Debian/Ubuntu | `openmark-editor_0.18.0_amd64.deb` | System package install. |

Keep these auto-update metadata files attached when generated:

- `latest.yml`
- `latest-mac.yml`
- Linux update metadata `*.yml`

## Upgrade Notes

- Packaged builds can check for updates from **Help > Check for Updates...** or **Settings > Updates**.
- Windows and macOS builds may show operating-system warnings until signed releases are published.

## Verification Checklist

- [ ] `npm run lint`
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

- Release date: 2026-06-11
- Tag: v0.18.0
