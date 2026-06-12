# Release Notes

## Summary

OpenMark 0.21.0 focuses on markdown fidelity & editing parity. It includes Synchronized the editor and preview caret blink animations so split-view cursor feedback feels visually unified, Replaced the green editor selection and active-line accents with neutral blue-gray highlighting in light and dark themes, and Made bold and italic toolbar actions toggle Markdown delimiters off when the selected text is already formatted.

## Highlights

### Markdown Fidelity & Editing Parity

- Synchronized the editor and preview caret blink animations so split-view cursor feedback feels visually unified.
- Replaced the green editor selection and active-line accents with neutral blue-gray highlighting in light and dark themes.
- Made bold and italic toolbar actions toggle Markdown delimiters off when the selected text is already formatted.

## Downloads

Choose the package for your operating system from the assets below.

| Platform | Asset | Notes |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.21.0.exe` | Recommended installer. |
| Windows | `OpenMark.0.21.0.exe` | Portable app. |
| macOS Intel | `OpenMark-0.21.0.dmg` | Unsigned/not notarized for now. |
| macOS Apple Silicon | `OpenMark-0.21.0-arm64.dmg` | Unsigned/not notarized for now. |
| Linux Debian/Ubuntu | `openmark-editor_0.21.0_amd64.deb` | System package install. |

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
- Tag: v0.21.0
