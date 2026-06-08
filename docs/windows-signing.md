# Windows Code Signing

OpenMark can build unsigned Windows artifacts by default and can sign them when a certificate is provided through environment variables or GitHub Actions secrets.

## GitHub Actions Secrets

Add these repository secrets before publishing signed releases:

| Secret | Purpose |
| --- | --- |
| `WINDOWS_CODESIGN_CERTIFICATE` | Base64-encoded `.pfx` certificate content or a secure URL supported by Electron Builder. |
| `WINDOWS_CODESIGN_PASSWORD` | Password for the `.pfx` certificate. |

The release workflow maps these to Electron Builder's `CSC_LINK` and `CSC_KEY_PASSWORD` variables. If `WINDOWS_CODESIGN_CERTIFICATE` is missing, the workflow still builds unsigned installer and portable artifacts.

## Local Signing

For a local signed build, set Electron Builder's signing environment variables before packaging:

```powershell
$env:CSC_LINK="C:\certificates\openmark-signing.pfx"
$env:CSC_KEY_PASSWORD="<certificate-password>"
npm run dist:win
```

Do not commit certificates, passwords, or generated private-key material.

## Verification

After a signed build, verify each `.exe` artifact on Windows:

```powershell
Get-AuthenticodeSignature "release\OpenMark.Setup.0.9.0.exe" | Format-List
Get-AuthenticodeSignature "release\OpenMark.0.9.0.exe" | Format-List
```

Expected result for a valid signed build:

- `Status` is `Valid`.
- `SignerCertificate.Subject` matches the OpenMark signing identity.
- The timestamp is present when the certificate provider supports timestamping.

## Configuration Notes

- `electron-builder.config.cjs` enables `win.signAndEditExecutable` only when `CSC_LINK` or `WIN_CSC_LINK` exists.
- `forceCodeSigning` stays `false` so contributors can keep building unsigned local artifacts.
- Unsigned builds may still trigger SmartScreen or operating-system trust warnings.
