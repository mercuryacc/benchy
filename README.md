# Benchy

A small self-hosted workout notebook, protected by a passkey. Create your own workouts and record what you actually did. The default installation has **no workouts, accounts, sources, or training history**. Test fixtures are entirely synthetic and are never loaded by the application.

## Features

- Mobile-friendly workout editor with single exercises, supersets, and circuits.
- Per-set reps, load (including zero), distance, duration, effort, and notes.
- Uneven exercise rounds without invented sets; independent historical snapshots.
- Rest timers with pause/resume and saved deadlines; configurable block rest.
- Session history and date editing, reviewed JSON import/export and duplicate detection.
- Passkey-only owner enrollment and login; no password or cloud account service.
- Local pending-write outbox, operation idempotency, conflict detection, and atomic server-side JSON persistence.

## Requirements

Node.js 22 or later, npm, and a browser with passkey support. Production needs an HTTPS origin with a stable hostname. Your passkey is bound to that hostname. Use a synced passkey or keep a secure recovery strategy: this version has no self-service account recovery or additional-device enrollment screen. Losing your only passkey can lock you out. Do not reset an existing installation casually.

## First run: Node

```sh
npm ci
npm run setup -- --origin https://benchy.example.com
npm start
```

Replace the example origin with your own domain and configure an HTTPS reverse proxy to port 3000. The setup helper infers the RP ID from that hostname; `--rp-id` is optional and must match it. It creates independent random session and bootstrap secrets in `.env`, and a fragment-based enrollment URL in `private-setup-link.txt`. Both files are owner-readable/writable only, and existing files are **never overwritten**. `npm start` uses Node's built-in `--env-file=.env`; dotenv is not needed.

Open the private link file locally in a trusted editor and visit its URL in your own browser, then create your passkey. Do not paste the link or environment into chat, issue reports, CI output, or logs. The fragment is removed from the address bar during setup. Enrollment closes permanently after the first passkey is registered. Delete the link file once enrollment succeeds; keep `.env` private. The bootstrap token alone cannot reopen enrollment.

For local-only development, create a separate installation:

```sh
npm run setup -- --origin http://localhost:3000 --development
npm start
```

This explicitly sets `NODE_ENV=test` to allow localhost HTTP cookies and disables production HTTPS-only browser policy. Never use this mode on a public server. The application server binds all interfaces; firewall it or use the loopback-only Docker publishing below. Do not reuse development secrets for production.

## Docker

```sh
npm run setup -- --origin https://benchy.example.com --docker
docker compose up -d --build
```

Run setup before Compose so the bind-mounted `data` directory exists. The image runs as UID/GID 1000, with a read-only root filesystem, dropped capabilities, and only its data mount writable. When setup runs as root, `--docker` gives the newly prepared data directory to UID 1000; a host user already using UID 1000 needs no change. Other host users must have an administrator prepare the directory ownership for UID 1000 before Docker use. Do not recursively change ownership of existing private data without reviewing it. Rootless Docker/user-namespace remapping may require different host ownership. For direct Node use, run setup as the same non-root user that runs the server, without `--docker`.

Compose publishes only `127.0.0.1:3000`. Configure your own TLS reverse proxy on the host to forward to that address and set correct forwarded client/protocol headers. The app trusts one proxy hop; do not expose port 3000 directly to untrusted clients or put it behind an arbitrary chain of proxies. No shared infrastructure, external network, automatic deployment, or domain-specific middleware is configured. Compose passes `.env` as container environment; the container command does not depend on an environment file inside the image. Avoid expanded Compose configuration in logs because it contains secrets.

## Privacy, storage, and backups

This is a single-owner application, not a multi-user coaching service. Workout data and the enrolled credential live in `data/state.json`; sources are empty in this release. The source API remains authenticated and returns 404 for unknown sources. Application shell assets are public, but private workout APIs and exports require authentication.

Data is not encrypted at rest. Restrict filesystem and backup access, use encrypted storage as appropriate, keep `.env` separate and private, and back up the entire data directory consistently while writes are stopped. JSON exports contain private workout data and finished sessions, not account recovery credentials. Protect exports as sensitive documents. Changing hostname/RP ID breaks existing passkey usability; restore to the same origin when recovering an installation.

Browser local storage holds pending changes and a cached view. Use a trusted device; logging out does not promise forensic erasure of local browser storage. No external analytics or hosted AI service is required by this app. A passkey avoids sharing your device's biometric data with Benchy; the server stores the public credential, not the biometric.

## Limitations

- Screenshot import, OCR, and AI-generated plans are **not implemented**.
- The outbox helps retry already-open application writes; this is **not full offline support** or an offline-installable service worker.
- Timer deadlines survive reloads, but audible alarms while the phone is locked or the browser is suspended are **not guaranteed**. Use a dedicated alarm when required.
- JSON storage is designed for a small single-owner installation, not multiple server replicas sharing a file. There is no distributed database or multi-tenant isolation.
- Workout fixtures are software tests, not exercise advice. There is no commercial affiliation or endorsement by any training platform.

## Style playground

Visit `/design` for a standalone component lab with ten styles selected from the dropdown at the top. The lab uses synthetic examples only and is publicly viewable; no personal records or account/session information are rendered. Its interactions do not call workout or authentication APIs, and its appearance preference uses a separate browser-storage namespace. Switching styles does not change the main application's appearance or saved workouts. The component board includes logging, supersets/circuits, timers, library/history, editor forms, dialogs, account previews, and error/empty/sync states.

## Development and verification

```sh
npm ci
npx playwright-core install --with-deps chromium
npm run check
npm test
npm audit --omit=dev
docker build -t benchy-public-check .
```

Browser tests use Playwright's installed Chromium by default. Set `BENCHY_CHROMIUM_PATH` (or `CHROMIUM_PATH`) to use a compatible existing executable. Tests run disposable localhost servers and temporary private data, with real virtual-authenticator passkey enrollment/login. They cover authorization, challenges, timers, uneven rounds, persistence, concurrent writes, import integrity, responsive layout, and pending-write recovery. They do not access a live deployment. Screenshots are temporary and deleted with test state.

The boundary test inspects exact Git index blobs after staging (including already tracked files), or the explicit source filesystem before Git exists. It rejects unapproved paths, common credential patterns, and deployment-path markers; it is not a complete PII detector or Git-history audit. Ignore rules do not remove previously committed secrets. Review the exact staged tree and history before publishing, and independently compare against any private source material. Docker has a separate allowlisted context and explicit source copies. CI runs tests/builds only, with read-only repository permission and no deployment credentials.

## License and security

MIT, copyright Benchy contributors. See [LICENSE](LICENSE) and [SECURITY.md](SECURITY.md). Dependency licenses remain their own.
