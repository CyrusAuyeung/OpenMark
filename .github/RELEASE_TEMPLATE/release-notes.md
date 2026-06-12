# Release Notes

## Summary

OpenMark 0.19.0 focuses on document asset management. It includes Copied inserted desktop images into a document-local `assets/` folder when the Markdown file has a saved path, Inserted portable relative image paths like `assets/image.png` so Markdown documents can move with their images, and Kept preview and PDF export reliable by using copied image data URLs immediately after insertion.

## Highlights

### Document Asset Management

- Copied inserted desktop images into a document-local `assets/` folder when the Markdown file has a saved path.
- Inserted portable relative image paths like `assets/image.png` so Markdown documents can move with their images.
- Kept preview and PDF export reliable by using copied image data URLs immediately after insertion.

## Downloads

Choose the package for your operating system from the assets below.

| Platform | Asset | Notes |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.19.0.exe` | Recommended installer. |
| Windows | `OpenMark.0.19.0.exe` | Portable app. |
| macOS Intel | `OpenMark-0.19.0.dmg` | Unsigned/not notarized for now. |
| macOS Apple Silicon | `OpenMark-0.19.0-arm64.dmg` | Unsigned/not notarized for now. |
| Linux Debian/Ubuntu | `openmark-editor_0.19.0_amd64.deb` | System package install. |

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
- Tag: v0.19.0
