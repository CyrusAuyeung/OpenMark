# Release Notes

## Summary

OpenMark 0.22.0 focuses on preview-to-editor navigation. It includes source-aware preview clicks so headings, paragraphs, lists, code blocks, tables, and preserved blank lines can jump back to their Markdown source lines, Estimated the target source line inside multi-line preview blocks from the click position for more precise navigation, and Kept preview links and native controls working normally while adding keyboard focus support for source-mapped preview blocks.

## Highlights

### Preview-to-Editor Navigation

- Added source-aware preview clicks so headings, paragraphs, lists, code blocks, tables, and preserved blank lines can jump back to their Markdown source lines.
- Estimated the target source line inside multi-line preview blocks from the click position for more precise navigation.
- Kept preview links and native controls working normally while adding keyboard focus support for source-mapped preview blocks.

## Downloads

Choose the package for your operating system from the assets below.

| Platform | Asset | Notes |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.22.0.exe` | Recommended installer. |
| Windows | `OpenMark.0.22.0.exe` | Portable app. |
| macOS Intel | `OpenMark-0.22.0.dmg` | Unsigned/not notarized for now. |
| macOS Apple Silicon | `OpenMark-0.22.0-arm64.dmg` | Unsigned/not notarized for now. |
| Linux Debian/Ubuntu | `openmark-editor_0.22.0_amd64.deb` | System package install. |

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

- Release date: 2026-06-14
- Tag: v0.22.0
