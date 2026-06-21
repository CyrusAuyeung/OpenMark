# Release Notes

## Summary

OpenMark 0.23.0 focuses on workspace content search. It includes desktop workspace content search for Markdown and text files with file, line, and highlighted context results, click-to-open search results so matching workspace files open and jump to the matched source line, and bounded result, file-size, and existing workspace file-count limits so local folders stay responsive.

## Highlights

### Workspace Content Search

- Added desktop workspace content search for Markdown and text files with file, line, and highlighted context results.
- Added click-to-open search results so matching workspace files open and jump to the matched source line.
- Added bounded result, file-size, and existing workspace file-count limits so local folders stay responsive.

## Downloads

Choose the package for your operating system from the assets below.

| Platform | Asset | Notes |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.23.0.exe` | Recommended installer. |
| Windows | `OpenMark.0.23.0.exe` | Portable app. |
| macOS Intel | `OpenMark-0.23.0.dmg` | Unsigned/not notarized for now. |
| macOS Apple Silicon | `OpenMark-0.23.0-arm64.dmg` | Unsigned/not notarized for now. |
| Linux Debian/Ubuntu | `openmark-editor_0.23.0_amd64.deb` | System package install. |

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

- Release date: 2026-06-21
- Tag: v0.23.0
