# Download OpenMark

<p>
  <a href="#english">English</a> · <a href="#zh-cn">简体中文</a>
</p>

<a id="english"></a>

Get the latest desktop build from the [GitHub Releases page](https://github.com/CyrusAuyeung/OpenMark/releases/latest).

## Choose Your Package

| Platform | Recommended package | Notes |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.26.0.exe` | Installer build with desktop/start menu shortcuts and update support. |
| Windows | `OpenMark.0.26.0.exe` | Portable build for trying OpenMark without installation. |
| macOS | `OpenMark-0.26.0.dmg` | Intel Mac disk image. Currently unsigned and not notarized. |
| macOS | `OpenMark-0.26.0-arm64.dmg` | Apple Silicon disk image. Currently unsigned and not notarized. |
| Linux | `openmark-editor_0.26.0_amd64.deb` | Debian/Ubuntu package managed through the system package installer. |

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

<a id="zh-cn"></a>

## 简体中文

请从 [GitHub Releases 页面](https://github.com/CyrusAuyeung/OpenMark/releases/latest) 下载最新桌面版本。

| 平台 | 推荐安装包 | 说明 |
| --- | --- | --- |
| Windows | `OpenMark.Setup.0.26.0.exe` | 安装版，包含桌面/开始菜单快捷方式和更新支持。 |
| Windows | `OpenMark.0.26.0.exe` | 便携版，适合不安装直接试用。 |
| macOS | `OpenMark-0.26.0.dmg` | Intel Mac 磁盘镜像，当前未签名、未公证。 |
| macOS | `OpenMark-0.26.0-arm64.dmg` | Apple Silicon 磁盘镜像，当前未签名、未公证。 |
| Linux | `openmark-editor_0.26.0_amd64.deb` | Debian/Ubuntu 安装包，通过系统包管理器安装。 |

安装前请注意：

- 只从官方 GitHub Releases 页面下载 OpenMark。
- Windows 和 macOS 构建在签名版本发布前可能出现系统安全提示。
- Release 页面上的 `latest.yml`、`latest-mac.yml` 等元数据需要保留，安装器更新检查会用到它们。
- Linux AppImage 会在 `.deb` 发布路径稳定后继续推进。

打包版本可通过 **帮助 > 检查更新** 或 **设置 > 更新** 检查 GitHub Releases 更新。如果更新区域不可用，请从 Releases 页面手动下载最新版本。
