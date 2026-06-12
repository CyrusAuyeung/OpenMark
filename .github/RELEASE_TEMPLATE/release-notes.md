# Release Notes

## Summary

OpenMark 0.20.0 focuses on resource health & menu polish. It includes desktop image resource checks for missing local images and absolute local image paths in document diagnostics, one-click copy-to-assets repair for existing absolute local image references so saved documents become portable, and Replaced the plain native menu row with a styled in-app File/Edit/View/Help menu and localized native menu role labels for Chinese users.

## Highlights

### Resource Health & Menu Polish

- Added desktop image resource checks for missing local images and absolute local image paths in document diagnostics.
- Added one-click copy-to-assets repair for existing absolute local image references so saved documents become portable.
- Replaced the plain native menu row with a styled in-app File/Edit/View/Help menu and localized native menu role labels for Chinese users.

## Downloads

Choose the package for your operating system from the assets below.

| Platform | Asset | Notes |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.20.0.exe` | Recommended installer. |
| Windows | `OpenMark.0.20.0.exe` | Portable app. |
| macOS Intel | `OpenMark-0.20.0.dmg` | Unsigned/not notarized for now. |
| macOS Apple Silicon | `OpenMark-0.20.0-arm64.dmg` | Unsigned/not notarized for now. |
| Linux Debian/Ubuntu | `openmark-editor_0.20.0_amd64.deb` | System package install. |

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

- Release date: 2026-06-12
- Tag: v0.20.0
