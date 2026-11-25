import { createServer, type IncomingMessage } from 'node:http';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import express, { type Request, type Response, type NextFunction } from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness';

try { process.loadEnvFile(); } catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT ?? (isProduction ? 3000 : 3001));
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MAX_ROOMS = 300;
const ROOM_ID = /^[a-f0-9]{32}$/;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '256kb' }));

app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// A small per-process limiter is useful for local demos; a public deployment should also use edge controls.
const windows = new Map<string, { count: number; until: number }>();
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const now = Date.now();
  const bucket = windows.get(key);
  if (!bucket || bucket.until < now) windows.set(key, { count: 1, until: now + 60_000 });
  else if (++bucket.count > 90) return res.status(429).json({ error: 'Too many requests. Please try again in a moment.' });
  next();
});

interface Room {
  doc: Y.Doc;
  awareness: Awareness;
  title: string;
  createdAt: Date;
  connections: Set<WebSocket>;
}
const rooms = new Map<string, Room>();

function safeTitle(value: unknown): string {
  if (typeof value !== 'string') return 'Untitled board';
  const title = value.trim().replace(/[<>\x00-\x1f]/g, '').slice(0, 60);
  return title || 'Untitled board';
}

function getRoom(id: string): Room {
  let room = rooms.get(id);
  if (room) return room;
  const doc = new Y.Doc();
  const awareness = new Awareness(doc);
  room = { doc, awareness, title: 'Untitled board', createdAt: new Date(), connections: new Set() };
  doc.on('update', (update: Uint8Array, origin: unknown) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const payload = encoding.toUint8Array(encoder);
    room!.connections.forEach((client) => { if (client !== origin && client.readyState === WebSocket.OPEN) client.send(payload); });
  });
  awareness.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
    const changed = added.concat(updated, removed);
    if (!changed.length) return;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(encoder, encodeAwarenessUpdate(awareness, changed));
    const payload = encoding.toUint8Array(encoder);
    room!.connections.forEach((client) => { if (client !== origin && client.readyState === WebSocket.OPEN) client.send(payload); });
  });
  rooms.set(id, room);
  return room;
}

async function getActiveRoom(id: string): Promise<Room | null> {
  return rooms.get(id) ?? null;
}

app.get('/api/health', (_req, res) => res.json({ ok: true, persistence: 'session-memory', collaboration: 'websocket', activeRooms: rooms.size }));

app.post('/api/boards', async (req, res, next) => {
  try {
    if (rooms.size >= MAX_ROOMS) return res.status(503).json({ error: 'This room service is at capacity. Try again later.' });
    const id = randomBytes(16).toString('hex');
    const title = safeTitle(req.body?.title);
    const room = getRoom(id);
    room.title = title;
    res.status(201).json({ id, title, persistence: 'session-only' });
  } catch (error) { next(error); }
});

app.get('/api/boards/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!ROOM_ID.test(id)) return res.status(400).json({ error: 'Invalid board link.' });
    const room = await getActiveRoom(id);
    if (!room) return res.status(404).json({ error: 'This board is not available in the current session.' });
    res.json({ id, title: room.title, persistence: 'session-only' });
  } catch (error) { next(error); }
});

app.patch('/api/boards/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!ROOM_ID.test(id)) return res.status(400).json({ error: 'Invalid board link.' });
    const room = await getActiveRoom(id);
    if (!room) return res.status(404).json({ error: 'This board is not available in the current session.' });
    const title = safeTitle(req.body?.title);
    room.title = title;
    res.json({ id, title, persistence: 'session-only' });
  } catch (error) { next(error); }
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API error:', error instanceof Error ? error.message : error);
  res.status(500).json({ error: 'The server could not complete that request.' });
});

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true, maxPayload: 1_000_000 });

function getUpdatedAwarenessIds(update: Uint8Array): number[] {
  try {
    const decoder = decoding.createDecoder(update);
    const count = decoding.readVarUint(decoder);
    const ids: number[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(decoding.readVarUint(decoder));
      decoding.readVarUint(decoder);
      decoding.readVarString(decoder);
    }
    return ids;
  } catch { return []; }
}

server.on('upgrade', (request, socket, head) => {
  const host = request.headers.host ?? 'localhost';
  const url = new URL(request.url ?? '/', `http://${host}`);
  const id = url.searchParams.get('room') ?? '';
  if (url.pathname !== '/sync' || !ROOM_ID.test(id)) {
    socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request, id));
});

wss.on('connection', async (ws: WebSocket, _request: IncomingMessage, id: string) => {
  try {
    const room = await getActiveRoom(id) ?? (rooms.get(id) ? getRoom(id) : null);
    if (!room) { ws.close(1008, 'Board not found'); return; }
    const awarenessClients = new Set<number>();
    room.connections.add(ws);
    ws.send((() => { const encoder = encoding.createEncoder(); encoding.writeVarUint(encoder, MESSAGE_SYNC); syncProtocol.writeSyncStep1(encoder, room.doc); return encoding.toUint8Array(encoder); })());
    const existingAwareness = Array.from(room.awareness.getStates().keys());
    if (existingAwareness.length) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(encoder, encodeAwarenessUpdate(room.awareness, existingAwareness));
      ws.send(encoding.toUint8Array(encoder));
    }
    ws.on('message', (data) => {
      try {
        const bytes = Buffer.isBuffer(data) ? data : Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data as ArrayBuffer);
        const decoder = decoding.createDecoder(new Uint8Array(bytes));
        const messageType = decoding.readVarUint(decoder);
        if (messageType === MESSAGE_SYNC) {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MESSAGE_SYNC);
          syncProtocol.readSyncMessage(decoder, encoder, room.doc, ws);
          if (encoding.length(encoder) > 1 && ws.readyState === WebSocket.OPEN) ws.send(encoding.toUint8Array(encoder));
        } else if (messageType === MESSAGE_AWARENESS) {
          const update = decoding.readVarUint8Array(decoder);
          getUpdatedAwarenessIds(update).forEach((clientId) => awarenessClients.add(clientId));
          applyAwarenessUpdate(room.awareness, update, ws);
        }
      } catch (error) { console.warn('Ignored malformed sync payload:', error instanceof Error ? error.message : error); }
    });
    ws.on('close', () => {
      removeAwarenessStates(room.awareness, Array.from(awarenessClients), ws);
      room.connections.delete(ws);
    });
  } catch (error) {
    console.error('Room load failed:', error instanceof Error ? error.message : error);
    ws.close(1011, 'Room service unavailable');
  }
});

if (isProduction) {
  const dist = resolve(process.cwd(), 'dist');
  if (existsSync(dist)) {
    app.get('/canvas/:id', async (req, res, next) => {
      try {
        const id = req.params.id;
        if (!ROOM_ID.test(id) || !await getActiveRoom(id)) {
          return res.status(404).set('X-Robots-Tag', 'noindex, nofollow').type('text').send('This canvas is not available.');
        }
        const html = (await readFile(resolve(dist, 'index.html'), 'utf8'))
          .replace(/<div id="root">[\s\S]*?<\/div>/, '<div id="root"></div>')
          .replace(/<title>[\s\S]*?<\/title>/, '<title>Shared canvas — FORMA</title>')
          .replace('</head>', '<meta name="robots" content="noindex, nofollow" />\n</head>');
        res.set('X-Robots-Tag', 'noindex, nofollow').type('html').send(html);
      } catch (error) { next(error); }
    });
    app.use(express.static(dist, { index: false }));
    app.get('/', (_req, res) => res.sendFile(resolve(dist, 'index.html')));
    app.get('/{*path}', (_req, res) => res.status(404).type('text').send('Page not found.'));
  }
}

server.listen(PORT, '0.0.0.0', () => console.info(`FORMA server listening on ${PORT}; room documents are held in session memory.`));
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => { server.close(); });
