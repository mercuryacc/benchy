# Security

Workout logs, notes, exports, backups, passkey credentials, bootstrap links, and environment files are private. Do not include them in public issues or pull requests. Redact reproduction examples and use synthetic data.

## Reporting vulnerabilities

Use GitHub's **Security → Advisories → Report a vulnerability** private reporting feature when enabled for this repository. If private reporting is not available, ask a maintainer to enable it without posting vulnerability details or private data publicly. No separate security email address is advertised here. Do not open a public issue containing an exploitable vulnerability or secret.

Include the affected version, a minimal synthetic reproduction, expected and observed behavior, and impact. Never send live keys, enrollment URLs, health/workout records, or complete state files. Rotate any exposed secrets and assess access to backups and browser storage; deleting a file or ignoring it does not revoke leaked credentials.

## Scope and operating assumptions

This is an early single-owner project; no formal security audit or response-time guarantee is claimed. Only the current default branch is actively maintained. Deploy behind HTTPS, isolate the backend port, and trust exactly the intended reverse proxy. Passkeys bind to the configured origin and RP ID. State and backups are not encrypted by the app. There is no multi-tenant authorization model or self-service recovery. Keep Node.js and dependencies patched and restrict host/container access.

The repository boundary test checks the exact current index, not historical objects or every possible form of personal information. Review history and packaged artifacts independently before a handover or public release.
