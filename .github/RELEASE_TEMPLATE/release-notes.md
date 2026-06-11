# Release Notes

## Summary

OpenMark 0.18.1 focuses on toolbar & preview spacing fixes. It includes fixes for Markdown formatting toolbar wrapping by keeping the controls on a single horizontal row with overflow scrolling, preserved source blank lines in the preview with dedicated spacer blocks so repeated Enter presses are visible instead of collapsing to one gap, and improvements to preview cursor alignment by using rendered source-line metadata, including preserved blank lines.

## Highlights

### Toolbar & Preview Spacing Fixes

- Fixed Markdown formatting toolbar wrapping by keeping the controls on a single horizontal row with overflow scrolling.
- Preserved source blank lines in the preview with dedicated spacer blocks so repeated Enter presses are visible instead of collapsing to one gap.
- Improved preview cursor alignment by using rendered source-line metadata, including preserved blank lines.

## Downloads

Choose the package for your operating system from the assets below.

| Platform | Asset | Notes |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.18.1.exe` | Recommended installer. |
| Windows | `OpenMark.0.18.1.exe` | Portable app. |
| macOS Intel | `OpenMark-0.18.1.dmg` | Unsigned/not notarized for now. |
| macOS Apple Silicon | `OpenMark-0.18.1-arm64.dmg` | Unsigned/not notarized for now. |
| Linux Debian/Ubuntu | `openmark-editor_0.18.1_amd64.deb` | System package install. |

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
- Tag: v0.18.1
