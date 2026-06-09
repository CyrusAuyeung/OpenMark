# Release Notes

## Summary

OpenMark 0.10.0 focuses on editor workflow polish. It includes restoring the active desktop file path between sessions so saved documents reopen with their local identity intact, restoring editor cursor and scroll position between sessions for the active document, and improvements to save and open error visibility with clearer document status and footer feedback.

## Highlights

### Editor Workflow Polish

- Restored the active desktop file path between sessions so saved documents reopen with their local identity intact.
- Restored editor cursor and scroll position between sessions for the active document.
- Improved save and open error visibility with clearer document status and footer feedback.
- Refined quick open ranking and grouping across recent and workspace files.

## Downloads

Choose the package for your operating system from the assets below.

| Platform | Asset | Notes |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.10.0.exe` | Recommended installer. |
| Windows | `OpenMark.0.10.0.exe` | Portable app. |
| macOS Intel | `OpenMark-0.10.0.dmg` | Unsigned/not notarized for now. |
| macOS Apple Silicon | `OpenMark-0.10.0-arm64.dmg` | Unsigned/not notarized for now. |
| Linux Debian/Ubuntu | `openmark-editor_0.10.0_amd64.deb` | System package install. |

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
- Large renderer bundle warning is expected while CodeMirror is bundled eagerly.

## Full Changelog

- Release date: 2026-06-09
- Tag: v0.10.0
