# FORMA delivery outcomes

## Marketing site and responsive product identity — complete
- Preserve the FORMA identity, responsive editorial design, clear product explanation, working canvas launch CTA, engineering/architecture story, reduced-motion behavior, meaningful links and authentic screenshots. Do not fabricate customers, testimonials, user counts or benchmarks.

## Anonymous collaborative canvas and room link — implemented
- Keep high-entropy room IDs, create/rename/join flows, Yjs document updates, Awareness cursors, connection/reconnect behavior and cross-room isolation.
- Preserve tools: select, frame, rectangle, ellipse, line, arrow, text and hand/pan. Support create/select/multiselect/move/resize/rotate; fill/stroke/width/opacity/radius and text edits; delete/duplicate; undo/redo; zoom/pan; layer selection; keyboard shortcuts; JSON export.
- Anyone with a room link may view/edit. This is a bearer-link guest experience with no accounts, no owner/editor/viewer authorization and no private-board ACL. State this clearly before sharing.
- Keep room documents and uploaded image payloads in server process memory only; server restarts/replacements clear them. Never label rooms durable, saved, private or SaaS-ready.

## Themes and readable typography — implemented
- Provide nine palettes: Electric Violet, Night Sky, Obsidian, Aurora, Forest, Ember, Paper, Naruto-inspired and Demon Slayer. The two anime-inspired choices have original full-canvas background artwork, not character images or logos.
- Include Comfortable/Large/Extra-large text controls and increase undersized UI labels. Persist appearance only in browser localStorage. Keep keyboard access, contrast, responsive controls and reduced-motion behavior.
- Add the credited Night Sky image and original anime-inspired backdrops to the canvas and preview artwork in theme swatches. Keep the theme dialog above page sections, allow it to scroll within the viewport, close on Escape/outside click, and keep the mobile canvas/header controls visible.

## Device and internet image tools — implemented
- Upload local JPEG/PNG/WebP images with size/MIME validation and client compression; do not persist on disk or use an unbounded payload.
- Offer user-invoked Wikimedia Commons search/import; show thumbnails, titles, creators, licenses and source when metadata exists. Attach attribution to the canvas object, link to source/license, and remind users to verify rights.
- Provide image-object selection, move/resize/rotation, crop margins, fit, brightness, contrast, saturation, opacity, download, board JSON export and visible PNG export. Keep embedded payload safely below the WebSocket frame cap. Mark media as volatile session content.

## No-account engineering and delivery — implemented; final checkpoint/publication pending
- Remove PostgreSQL pool/schema/snapshot persistence, account/auth/sign-in routes and database credentials. Do not ask the user for credentials. Keep the platform badge hidden through the project branding setting.
- Keep strict TypeScript, pinned dependencies, unit/integration checks, production Docker build and GitHub-ready documentation. Correct README/marketing/architecture claims, show the actual restart/loss behavior, and update `/manus-routes.json`.
- Verify production build, server health, source-accurate routes, two/three-client WebSocket integration and website preview. Never claim SaaS readiness for a public bearer-link process-memory demo.
