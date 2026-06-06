# Release Guide

OpenMark uses Electron Builder for desktop packaging. The first release target is Windows x64.

## Local Packaging

```bash
npm run package
```

This creates an unpacked desktop app in `release/`.

```bash
npm run dist:win
```

This creates Windows installer and portable artifacts in `release/`.

Expected Windows artifacts:

- `OpenMark Setup 0.3.0.exe`
- `OpenMark 0.3.0.exe`
- `OpenMark Setup 0.3.0.exe.blockmap`

## GitHub Release

Repository: <https://github.com/CyrusAuyeung/OpenMark>

The release workflow runs on tags that start with `v`.

```bash
git tag v0.3.0
git push origin v0.3.0
```

The workflow runs lint, builds the renderer, packages Windows artifacts, uploads workflow artifacts, and attaches the files to the GitHub release.

Draft notes can start from [.github/RELEASE_TEMPLATE/release-notes.md](../.github/RELEASE_TEMPLATE/release-notes.md).

Release page: <https://github.com/CyrusAuyeung/OpenMark/releases>

Actions page: <https://github.com/CyrusAuyeung/OpenMark/actions/workflows/release.yml>

## Notes

- Release signing is not configured yet. Local Windows builds set `signAndEditExecutable` to `false` so packaging works without administrator or Developer Mode symlink privileges.
- macOS and Linux packaging should be added after the Windows flow is stable.
- The first installer may show operating-system warnings until signing is configured.
