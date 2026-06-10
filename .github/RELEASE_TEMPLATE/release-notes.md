# Release Notes

## Summary

OpenMark 0.13.0 focuses on product UI polish. It includes refinements to the app shell visual hierarchy with more consistent desktop-product surfaces, borders, shadows, and density, polished toolbar, panel, inspector, and library active states for clearer interaction feedback, and improvements to empty, loading, warning, error, and update states with product-grade state panels and clearer status presentation.

## Highlights

### Product UI Polish

- Refined the app shell visual hierarchy with more consistent desktop-product surfaces, borders, shadows, and density.
- Polished toolbar, panel, inspector, and library active states for clearer interaction feedback.
- Improved empty, loading, warning, error, and update states with product-grade state panels and clearer status presentation.
- Fixed Windows auto-update metadata so installer builds download the published GitHub Release asset, and tightened release verification for update metadata references.

## Downloads

Choose the package for your operating system from the assets below.

| Platform | Asset | Notes |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.13.0.exe` | Recommended installer. |
| Windows | `OpenMark.0.13.0.exe` | Portable app. |
| macOS Intel | `OpenMark-0.13.0.dmg` | Unsigned/not notarized for now. |
| macOS Apple Silicon | `OpenMark-0.13.0-arm64.dmg` | Unsigned/not notarized for now. |
| Linux Debian/Ubuntu | `openmark-editor_0.13.0_amd64.deb` | System package install. |

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

- Release date: 2026-06-10
- Tag: v0.13.0
