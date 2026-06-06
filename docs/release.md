# Release Guide

OpenMark uses Electron Builder for desktop packaging. Release targets are Windows x64, macOS x64/arm64, and Linux x64.

Packaging scripts use `electron-builder.config.cjs` so local builds and GitHub Actions share the same artifact and signing configuration.

## Local Packaging

```bash
npm run package
```

This creates an unpacked desktop app in `release/`.

```bash
npm run dist:win
npm run dist:mac
npm run dist:linux
```

These commands create platform artifacts in `release/`. Run each command on the matching operating system: Windows for `dist:win`, macOS for `dist:mac`, and Linux for `dist:linux`.

Windows artifacts are unsigned unless a signing certificate is provided through Electron Builder environment variables. See [Windows Code Signing](windows-signing.md) for setup and verification.

Expected Windows artifacts:

- `OpenMark Setup 0.3.0.exe`
- `OpenMark 0.3.0.exe`
- `OpenMark Setup 0.3.0.exe.blockmap`

Expected macOS artifacts:

- `OpenMark-0.3.0.dmg`
- `OpenMark-0.3.0-arm64.dmg`
- `OpenMark-0.3.0-mac.zip`
- `OpenMark-0.3.0-arm64-mac.zip`

Expected Linux artifacts:

- `OpenMark-0.3.0.AppImage`
- `openmark-editor_0.3.0_amd64.deb`

## Automated GitHub Release

Repository: <https://github.com/CyrusAuyeung/OpenMark>

The release workflow runs lint in the Windows job, builds the renderer on every platform, packages Windows/macOS/Linux artifacts, uploads workflow artifacts, and can attach all platform files to a GitHub release. If signing secrets are configured, Windows artifacts are signed during packaging.

Release uploads include Electron auto-update metadata files such as `latest.yml`, `latest-mac.yml`, and Linux update metadata when generated. Keep those files attached to the GitHub release so installed apps can discover new versions.

### Tag-Based Release

Push a version tag that starts with `v`:

```bash
git tag v0.3.0
git push origin v0.3.0
```

The workflow publishes the GitHub release automatically and asks GitHub to generate release notes.

### Manual Release Run

Use the **Release** workflow from the Actions page when you need a manual build or draft release.

- Leave `tag` empty to build and upload Windows, macOS, and Linux artifacts only.
- Enter a tag like `v0.4.0` to publish a GitHub release from the workflow run. The tag is validated as semantic version style and points at the workflow commit.
- Manual releases default to draft mode so artifacts and notes can be reviewed before publishing.
- Enable `prerelease` for preview builds such as `v0.4.0-beta.1`.

Draft notes can start from [.github/RELEASE_TEMPLATE/release-notes.md](../.github/RELEASE_TEMPLATE/release-notes.md).

Release page: <https://github.com/CyrusAuyeung/OpenMark/releases>

Actions page: <https://github.com/CyrusAuyeung/OpenMark/actions/workflows/release.yml>

## Signing Status

- Unsigned builds remain supported for contributors and CI dry runs.
- Signed builds require `WINDOWS_CODESIGN_CERTIFICATE` and `WINDOWS_CODESIGN_PASSWORD` repository secrets.
- Verify signed `.exe` files with `Get-AuthenticodeSignature` before publishing a non-draft release.
- macOS artifacts are currently unsigned and not notarized.

## Auto-Update Channel

OpenMark uses `electron-updater` with GitHub Releases as the update provider.

- Packaged installer builds check for updates shortly after startup.
- Users can also run **Help > Check for Updates...** or open **Settings > Updates**.
- Downloaded updates can be installed from the update section in settings.
- The update channel follows the release version: stable builds use stable releases, prerelease builds can receive prereleases.
- Auto-update is designed for installer/AppImage builds. Development builds and unsupported package formats show a disabled update state.

## Notes

- macOS first launch may require user approval until Developer ID signing and notarization are configured.
- Unsigned installers may show operating-system warnings until signed releases are published.
