# Release Notes

## Summary

OpenMark 0.7.0 focuses on workspace polish and localization. Upgrade for pinned recent files, recent-file search, a local workspace browser, quick open, missing-file states, and visible English/Simplified Chinese switching.

## Highlights

- Pin important recent files and search the recent list by name or path.
- Browse Markdown files from a local workspace folder and open them with quick open.
- Keep unavailable recent and workspace files visible with a clear missing-file state.
- Switch between English and Simplified Chinese from the toolbar, command palette, settings, or desktop menu.

## Fixes

- Workspace and recent-file open failures now mark missing files instead of silently removing entries.

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
