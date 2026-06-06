# Download OpenMark

Get the latest desktop build from the [GitHub Releases page](https://github.com/CyrusAuyeung/OpenMark/releases/latest).

## Choose Your Package

| Platform | Recommended package | Notes |
| --- | --- | --- |
| Windows | `OpenMark Setup <version>.exe` | Installer build with desktop/start menu shortcuts and automatic update support. |
| Windows | `OpenMark <version>.exe` | Portable build for trying OpenMark without installation. |
| macOS | `OpenMark-<version>.dmg` | Intel Mac disk image. Currently unsigned and not notarized. |
| macOS | `OpenMark-<version>-arm64.dmg` | Apple Silicon disk image. Currently unsigned and not notarized. |
| Linux | `openmark-editor_<version>_amd64.deb` | Debian/Ubuntu package managed through the system package installer. |

## Before Installing

- Download OpenMark only from the official GitHub Releases page.
- Windows and macOS builds may show operating-system warnings until signed releases are published.
- Keep release metadata files such as `latest.yml` attached to the release; installed apps use them for update checks.
- Linux AppImage support is planned after the `.deb` release path is stable.

## Update Checks

Packaged builds can check GitHub Releases from **Help > Check for Updates...** or **Settings > Updates**.

If the update section is disabled, the current build does not support in-app updates. Download the latest package manually from GitHub Releases.

## Verification

Release maintainers should verify these before publishing a non-draft release:

- `npm run lint`
- `npm run build`
- Platform packaging command for every published artifact
- Release artifacts and `latest*.yml` metadata are attached to the GitHub release
