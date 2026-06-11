# Release Notes

## Summary

OpenMark 0.16.0 focuses on bundle & startup polish. It includes split renderer dependencies into stable vendor chunks and added a build budget check for JavaScript chunk sizes, lazy-loaded Markdown preview, export rendering, and editor search tooling so the first editor screen can render sooner, and preserved preview/export behavior while loading Markdown rendering dependencies on demand.

## Highlights

### Bundle & Startup Polish

- Split renderer dependencies into stable vendor chunks and added a build budget check for JavaScript chunk sizes.
- Lazy-loaded Markdown preview, export rendering, and editor search tooling so the first editor screen can render sooner.
- Preserved preview/export behavior while loading Markdown rendering dependencies on demand.
- Improved outline jumps so the sidebar, Markdown editor, and preview stay aligned on the selected heading.

## Downloads

Choose the package for your operating system from the assets below.

| Platform | Asset | Notes |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.16.0.exe` | Recommended installer. |
| Windows | `OpenMark.0.16.0.exe` | Portable app. |
| macOS Intel | `OpenMark-0.16.0.dmg` | Unsigned/not notarized for now. |
| macOS Apple Silicon | `OpenMark-0.16.0-arm64.dmg` | Unsigned/not notarized for now. |
| Linux Debian/Ubuntu | `openmark-editor_0.16.0_amd64.deb` | System package install. |

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
- Tag: v0.16.0
