# Contributing to FORMA

Thanks for helping shape FORMA. Keep changes focused, preserve the editorial creative-tool design, and prefer small modules over a monolithic editor component.

## Development

1. Use Node.js 22+ and pnpm 11.
2. Run `pnpm install --frozen-lockfile`.
3. No account service, database, API secret, or paid external service is required. Copy `.env.example` only if you want the documented local port.
4. Run `pnpm dev`, then `pnpm typecheck`, `pnpm test`, `pnpm build`, and the WebSocket integration script before opening a pull request.

## Change expectations

Keep Yjs mutations in shared document helpers and make transaction origins/merge semantics explicit. Keep Awareness ephemeral. Do not describe process-memory rooms as saved/durable or claim SaaS security. Anyone with a room URL can edit; avoid posting full private room links in issues or committing real board payloads. Room images are in-memory Yjs payloads, not cloud storage. Validate and bound network input and image decoding. Test geometry/collaboration changes and document any limits. Keep performance claims tied to actual measurements; the 60 FPS number is only a target until benchmarked on representative devices.

Respect `prefers-reduced-motion`, keyboard access and visible focus. Do not commit `.env`, credentials, private room links, private screenshots, dependencies or build output. Keep source, architecture, README and routes synchronized.

## Pull requests

Describe the user-facing change, technical/CRDT implications, validation performed and known limits. Update documentation when behavior changes; avoid broad unrelated formatting edits.
