# Release Notes

## Summary

OpenMark 0.24.0 focuses on regression test foundation and security & maintenance. It includes Vitest and jsdom test coverage for the Markdown pipeline, workspace content search, Markdown formatting, and table editing helpers, CI test execution so pull requests and main-branch pushes now run lint, tests, release metadata checks, build, and build budget checks together, and split workspace search matching and Markdown formatting/table edit rules into pure helper modules so high-risk editor behavior can be tested without launching Electron or CodeMirror.

## Highlights

### Regression Test Foundation

- Added Vitest and jsdom test coverage for the Markdown pipeline, workspace content search, Markdown formatting, and table editing helpers.
- Added CI test execution so pull requests and main-branch pushes now run lint, tests, release metadata checks, build, and build budget checks together.
- Split workspace search matching and Markdown formatting/table edit rules into pure helper modules so high-risk editor behavior can be tested without launching Electron or CodeMirror.

### Security & Maintenance

- Upgraded DOMPurify and refreshed vulnerable development dependency lockfile entries so `npm audit` reports zero known vulnerabilities.

## Downloads

Choose the package for your operating system from the assets below.

| Platform | Asset | Notes |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.24.0.exe` | Recommended installer. |
| Windows | `OpenMark.0.24.0.exe` | Portable app. |
| macOS Intel | `OpenMark-0.24.0.dmg` | Unsigned/not notarized for now. |
| macOS Apple Silicon | `OpenMark-0.24.0-arm64.dmg` | Unsigned/not notarized for now. |
| Linux Debian/Ubuntu | `openmark-editor_0.24.0_amd64.deb` | System package install. |

Keep these auto-update metadata files attached when generated:

- `latest.yml`
- `latest-mac.yml`
- Linux update metadata `*.yml`

## Upgrade Notes

- Packaged builds can check for updates from **Help > Check for Updates...** or **Settings > Updates**.
- Windows and macOS builds may show operating-system warnings until signed releases are published.

## Verification Checklist

- [ ] `npm run lint`
- [ ] `npm test`
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

- Release date: 2026-06-21
- Tag: v0.24.0
