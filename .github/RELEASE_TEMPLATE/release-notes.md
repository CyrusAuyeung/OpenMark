# Release Notes

## Summary

OpenMark 0.5.0 focuses on navigation inside longer Markdown documents. Upgrade for search results with context, preview-to-editor heading jumps, split-view scroll synchronization, and contextual table editing controls.

## Highlights

- Search results now show line numbers and context snippets, and each result jumps directly to the editor selection.
- Split mode keeps the Markdown editor and rendered preview aligned as either side scrolls.
- Preview headings can be clicked or keyboard-activated to jump back to their source line in the editor.
- Markdown tables can be formatted in place, with controls for adding/deleting rows and columns when the cursor is inside a table.

## Fixes

- Long documents now scroll inside the editor and preview panes instead of stretching the full app shell.

## Downloads

Choose the package for your operating system from the assets below.

| Platform | Asset | Notes |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.5.0.exe` | Recommended installer. |
| Windows | `OpenMark.0.5.0.exe` | Portable app. |
| macOS Intel | `OpenMark-0.5.0.dmg` | Unsigned/not notarized for now. |
| macOS Apple Silicon | `OpenMark-0.5.0-arm64.dmg` | Unsigned/not notarized for now. |
| Linux Debian/Ubuntu | `openmark-editor_0.5.0_amd64.deb` | System package install. |

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
