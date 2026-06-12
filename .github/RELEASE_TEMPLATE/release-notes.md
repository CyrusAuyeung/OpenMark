# Release Notes

## Summary

OpenMark 0.21.1 focuses on editing parity hotfix. It includes Hid the active-line background while text is selected so selecting one line no longer makes another line look highlighted and Normalized bold and italic toggles for combined or repeated asterisk markers, including `***text***` and long marker runs.

## Highlights

### Editing Parity Hotfix

- Hid the active-line background while text is selected so selecting one line no longer makes another line look highlighted.
- Normalized bold and italic toggles for combined or repeated asterisk markers, including `***text***` and long marker runs.

## Downloads

Choose the package for your operating system from the assets below.

| Platform | Asset | Notes |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.21.1.exe` | Recommended installer. |
| Windows | `OpenMark.0.21.1.exe` | Portable app. |
| macOS Intel | `OpenMark-0.21.1.dmg` | Unsigned/not notarized for now. |
| macOS Apple Silicon | `OpenMark-0.21.1-arm64.dmg` | Unsigned/not notarized for now. |
| Linux Debian/Ubuntu | `openmark-editor_0.21.1_amd64.deb` | System package install. |

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
- Tag: v0.21.1
