# Release Notes

## Summary

OpenMark 0.18.3 focuses on local image preview fixes. It includes fixes for local `file:///` image links rendering as raw Markdown instead of preview images, preserved selected local images as data URLs so preview and PDF export can load them reliably, and Sanitized inserted image alt text so bracketed local file names do not break Markdown image syntax.

## Highlights

### Local Image Preview Fixes

- Fixed local `file:///` image links rendering as raw Markdown instead of preview images.
- Preserved selected local images as data URLs so preview and PDF export can load them reliably.
- Sanitized inserted image alt text so bracketed local file names do not break Markdown image syntax.

## Downloads

Choose the package for your operating system from the assets below.

| Platform | Asset | Notes |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.18.3.exe` | Recommended installer. |
| Windows | `OpenMark.0.18.3.exe` | Portable app. |
| macOS Intel | `OpenMark-0.18.3.dmg` | Unsigned/not notarized for now. |
| macOS Apple Silicon | `OpenMark-0.18.3-arm64.dmg` | Unsigned/not notarized for now. |
| Linux Debian/Ubuntu | `openmark-editor_0.18.3_amd64.deb` | System package install. |

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
- Tag: v0.18.3
