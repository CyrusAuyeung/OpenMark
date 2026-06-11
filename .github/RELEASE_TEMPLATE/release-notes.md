# Release Notes

## Summary

OpenMark 0.15.0 focuses on document safety & recovery. It includes local recovery snapshots for unsaved document changes with a welcome-screen restore entry, support for restoring or discarding recovery snapshots without touching saved files, and visibility into recovery snapshot status in the footer while documents remain unsaved.

## Highlights

### Document Safety & Recovery

- Added local recovery snapshots for unsaved document changes with a welcome-screen restore entry.
- Supported restoring or discarding recovery snapshots without touching saved files.
- Surfaced recovery snapshot status in the footer while documents remain unsaved.
- Added save-time warnings before overwriting files changed outside OpenMark.

## Downloads

Choose the package for your operating system from the assets below.

| Platform | Asset | Notes |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.15.0.exe` | Recommended installer. |
| Windows | `OpenMark.0.15.0.exe` | Portable app. |
| macOS Intel | `OpenMark-0.15.0.dmg` | Unsigned/not notarized for now. |
| macOS Apple Silicon | `OpenMark-0.15.0-arm64.dmg` | Unsigned/not notarized for now. |
| Linux Debian/Ubuntu | `openmark-editor_0.15.0_amd64.deb` | System package install. |

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

- Release date: 2026-06-11
- Tag: v0.15.0
