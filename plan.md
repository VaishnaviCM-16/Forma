# FORMA no-account demo implementation plan

## Product scope

Preserve FORMA's public editorial landing page and its real guest-canvas workflow. Deliver a polished collaborative canvas that needs no account, database installation, external credential, or paid service. Boards are random-link rooms held only in the Node process. A server restart or replacement clears active rooms. The user specifically selected the no-account/no-database demo. This release is a deployable portfolio demo, not SaaS-ready private-workspace software; never simulate authentication or durable saved boards.

## Implementation approach

- **Frontend:** Existing React, TypeScript, Vite, Tailwind and Framer Motion app; retain modular landing/editor routes and a dedicated Canvas 2D renderer.
- **Collaboration:** Existing Yjs shared object maps, WebSocket room relay and ephemeral Awareness; keep high-entropy room IDs, in-process room cap, reconnect behavior and cross-room isolation.
- **Storage boundary:** Remove PostgreSQL pool/schema/snapshot code and the account/auth/database routes from the shipped project. Keep only volatile in-process room documents; disclose that deploy/restart loses rooms. Do not use the provisioned database or pretend to be durable.
- **Appearance:** Browser-only `localStorage` theme and text-size preferences; nine palettes (Violet, Night Sky, Obsidian, Aurora, Forest, Ember, Paper, Naruto-inspired, Demon Slayer). Anime-inspired canvas backgrounds use original SVG artwork, not character art/logos. Put a portal-based picker in the landing header and canvas action bar; bound its height to the viewport, allow internal scrolling, and close on Escape/outside click.
- **Images:** Local image upload with MIME validation and compression to a bounded embedded Yjs payload; browser-side Wikimedia Commons search/import with creator/license/source metadata; image move/resize/rotate/crop/fit/brightness/contrast/saturation; download and PNG/JSON export. The image payload is shared only through the current room and disappears on server restart. Reject unsupported formats and keep image payloads within the WebSocket frame bound.
- **Quality:** Strict TypeScript, existing unit/live integration tests and benchmark tooling; accurate source architecture/README, stable route manifest, production build and CI.

## Project structure

`src/marketing` remains the public product story; `src/editor` contains workspace, tool rail, CanvasStage, renderer, inspector, image picker and exports; `src/domain` defines shared objects and API; `src/collaboration` owns Yjs document/provider/undo; `src/themes` owns local appearance preferences and its top-layer scrollable picker; `server/index.ts` offers room APIs and WebSocket relay with volatile rooms; `public/themes` contains the Night Sky photo and original anime-inspired canvas artwork; scripts/docs/architecture/CI remain repository support.

## Visual design

Swiss-editorial typography meets premium creative software. Near-black surfaces and warm white provide focus; violet is FORMA's functional accent, while the picker offers blue, neutral black, teal, green, ember, warm paper, and original anime-inspired treatments. Raise undersized UI labels and provide comfortable/large/extra-large reading scale. Keep the asymmetric editorial landing page and compact but precise editor. Use deliberate transitions, visible focus, mobile adaptation and `prefers-reduced-motion` support.

## Delivery truth

Room links are bearer capabilities and anyone with the link may edit. There are no accounts, roles, private board access controls, database or durable storage. Mark the experience as a no-account ephemeral demo, not production SaaS or SaaS-ready.


## Design contract

- **Movement:** Swiss editorial typography and premium creative-software surfaces; sparse, purposeful, and technically candid.
- **Principles:** 1) hierarchy before decoration; 2) canvas-first direct manipulation; 3) explicit session/security truth; 4) accessible controls at desktop and mobile.
- **Color:** Charcoal/warm-white keeps work central; Electric Violet `#b29aff` is the ownable FORMA accent. Theme choices are user-controlled; semantic contrast and canvas readability remain primary.
- **Layout:** An asymmetric editorial landing page opens into a full-viewport, tool-dense canvas rather than a centered SaaS card grid.
- **Signature elements:** Fine coordinate grids, precise object frames, and small collaboration/session status indicators.
- **Interaction and motion:** Direct manipulation, visible focus, keyboard shortcuts, obvious undo/redo, theme preference persistence, restrained short transitions, and `prefers-reduced-motion` handling.
- **Typography:** Manrope for readable interface/body hierarchy; DM Mono for technical metadata; italic display accents for editorial emphasis. Use the user-selectable Comfort/Large/Extra-large scale.
- **Brand essence and voice:** A candid collaborative canvas for people shaping early ideas; precise, exploratory, warm. Example lines: “Design together. Think without limits.” and “Ideas take shape. Together.”
- **Wordmark:** The FORMA logotype paired with the custom four-loop geometric mark (`public/forma-mark.svg`), not a default text-only brand.
