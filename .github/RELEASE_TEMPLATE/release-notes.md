# Release Notes

## Summary

OpenMark 0.7.0 focuses on workspace and localization. Upgrade for pinned recent files so important local documents stay at the top of the recent list, search for recent files by name or path, and a local workspace folder browser for Markdown files.

## Highlights

### Workspace

- Added pinned recent files so important local documents stay at the top of the recent list.
- Added search for recent files by name or path.
- Added a local workspace folder browser for Markdown files.
- Added quick open for Markdown files in the active workspace.
- Added missing-file states for unavailable recent and workspace files.

### Localization

- Added a visible English/Chinese language switcher in the toolbar, command palette, settings, and desktop menu.

## Downloads

Choose the package for your operating system from the assets below.

| Platform | Asset | Notes |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.7.0.exe` | Recommended installer. |
| Windows | `OpenMark.0.7.0.exe` | Portable app. |
| macOS Intel | `OpenMark-0.7.0.dmg` | Unsigned/not notarized for now. |
| macOS Apple Silicon | `OpenMark-0.7.0-arm64.dmg` | Unsigned/not notarized for now. |
| Linux Debian/Ubuntu | `openmark-editor_0.7.0_amd64.deb` | System package install. |

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

- Release date: 2026-06-08
- Tag: v0.7.0
