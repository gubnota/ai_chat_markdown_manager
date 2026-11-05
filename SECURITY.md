# Security policy

Security fixes target the current v2.1 release. Historical standalone versions are retained for provenance and are not maintained separately.

## Report privately when possible

Use the repository's GitHub **Security → Report a vulnerability** control if private reporting is enabled. No separate security email is published by this project. If private reporting is unavailable, open a minimal issue asking the maintainer for a private reporting channel; do not post an exploit, account data or secrets publicly.

Provide script version, browser/extension versions, affected module/capability, a synthetic reproduction and likely impact. Include only redacted DOM fragments from a disposable fixture. Never attach conversation exports, cookies, tokens, account URLs/IDs, browser profiles or unredacted traces. Agree on a private channel before supplying sensitive detail.

## Threat and safety boundaries

This userscript can read rendered page content and runs with ordinary page permissions. Shadow DOM is CSS isolation, not a security boundary; same-origin scripts can access preferences/selection IDs in localStorage. Downloads and clipboard text intentionally contain exported content. Reports may contain IDs/errors and need review before sharing.

No backend, telemetry, remote runtime code or credential storage is implemented. The metadata preserves explicit site rules and uses no privileged grants. External image references can be fetched later by a Markdown viewer. Host sites and extensions have their own permissions and traffic.

Production native archive is unsupported and Gemini deletion remains disabled pending authenticated validation. Do not bypass these gates or test destruction on personal history. Native UI ambiguity must fail closed; uncertain deletion cannot safely be retried automatically. If platform controls change, stop the operation and report a redacted reproduction.

See [privacy handling](docs/PRIVACY.md) and [verification limits](docs/VERIFICATION.md).
