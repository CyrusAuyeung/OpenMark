# Release Notes

## Summary

- One or two sentences describing who should upgrade and why.

## Highlights

- User-facing improvement 1.
- User-facing improvement 2.
- User-facing improvement 3.

## Fixes

- Bug fix or stability improvement.

## Downloads

Choose the package for your operating system from the assets below.

| Platform | Asset | Notes |
| --- | --- | --- |
| Windows | `OpenMark Setup <version>.exe` | Recommended installer. |
| Windows | `OpenMark <version>.exe` | Portable app. |
| macOS Intel | `OpenMark-<version>.dmg` | Unsigned/not notarized for now. |
| macOS Apple Silicon | `OpenMark-<version>-arm64.dmg` | Unsigned/not notarized for now. |
| Linux | `OpenMark-<version>.AppImage` | Portable AppImage. |
| Linux Debian/Ubuntu | `openmark-editor_<version>_amd64.deb` | System package install. |

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
- Large renderer bundle warning is expected while CodeMirror is bundled eagerly.
