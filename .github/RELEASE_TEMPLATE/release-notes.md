# Release Notes

## Summary

OpenMark 0.26.0 focuses on CodeMirror editing integration tests. It includes shared CodeMirror list continuation, task checkbox, and paste command wiring now lives in `src/markdownEditorCommands.ts`, regression tests now run the configured CodeMirror Enter and task-toggle keybindings against real `EditorView` state, and paste integration tests now dispatch DOM paste events through the configured CodeMirror handler for selected-text URL links, paste cleanup, and normal plain-text fallback.

## Highlights

### CodeMirror Editing Integration Tests

- Shared CodeMirror list continuation, task checkbox, and paste command wiring now lives in `src/markdownEditorCommands.ts`.
- Regression tests now run the configured CodeMirror Enter and task-toggle keybindings against real `EditorView` state.
- Paste integration tests now dispatch DOM paste events through the configured CodeMirror handler for selected-text URL links, paste cleanup, and normal plain-text fallback.

## Downloads

Choose the package for your operating system from the assets below.

| Platform | Asset | Notes |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.26.0.exe` | Recommended installer. |
| Windows | `OpenMark.0.26.0.exe` | Portable app. |
| macOS Intel | `OpenMark-0.26.0.dmg` | Unsigned/not notarized for now. |
| macOS Apple Silicon | `OpenMark-0.26.0-arm64.dmg` | Unsigned/not notarized for now. |
| Linux Debian/Ubuntu | `openmark-editor_0.26.0_amd64.deb` | System package install. |

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
- Tag: v0.26.0
