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

## Automated GitHub Release

Repository: <https://github.com/CyrusAuyeung/OpenMark>

The release workflow runs lint, builds the renderer, packages Windows artifacts, uploads workflow artifacts, and can attach the files to a GitHub release.

### Tag-Based Release

Push a version tag that starts with `v`:

```bash
git tag v0.3.0
git push origin v0.3.0
```

The workflow publishes the GitHub release automatically and asks GitHub to generate release notes.

### Manual Release Run

Use the **Release** workflow from the Actions page when you need a manual build or draft release.

- Leave `tag` empty to build and upload Windows artifacts only.
- Enter a tag like `v0.4.0` to publish a GitHub release from the workflow run. The tag is validated as semantic version style and points at the workflow commit.
- Manual releases default to draft mode so artifacts and notes can be reviewed before publishing.
- Enable `prerelease` for preview builds such as `v0.4.0-beta.1`.

Draft notes can start from [.github/RELEASE_TEMPLATE/release-notes.md](../.github/RELEASE_TEMPLATE/release-notes.md).

Release page: <https://github.com/CyrusAuyeung/OpenMark/releases>

Actions page: <https://github.com/CyrusAuyeung/OpenMark/actions/workflows/release.yml>

## Notes

- Release signing is not configured yet. Local Windows builds set `signAndEditExecutable` to `false` so packaging works without administrator or Developer Mode symlink privileges.
- macOS and Linux packaging should be added after the Windows flow is stable.
- The first installer may show operating-system warnings until signing is configured.
