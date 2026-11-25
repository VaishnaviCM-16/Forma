import assert from 'node:assert/strict';
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import { WebSocket } from 'ws';
import { getObjectMap, putObject, patchObject, readObjects } from '../src/collaboration/document';
import { createObject } from '../src/domain/model';

const base = process.env.FORMA_TEST_ORIGIN ?? 'http://127.0.0.1:3001';
const REMOTE = Symbol('remote');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(check: () => boolean, description: string, timeout = 4000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (check()) return;
    await sleep(25);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

async function createBoard() {
  const response = await fetch(`${base}/api/boards`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Transport smoke test' }) });
  assert.equal(response.status, 201, `create board HTTP ${response.status}`);
  return await response.json() as { id: string; title: string; persistence: string };
}

async function connect(roomId: string) {
  const doc = new Y.Doc();
  const socket = new WebSocket(`ws://127.0.0.1:3001/sync?room=${roomId}`);
  socket.binaryType = 'arraybuffer';
  socket.on('message', (data) => {
    try {
      const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(Buffer.concat(Array.isArray(data) ? data : [data as Buffer]));
      const decoder = decoding.createDecoder(bytes);
      if (decoding.readVarUint(decoder) !== 0) return;
      const encoder = encoding.createEncoder(); encoding.writeVarUint(encoder, 0);
      syncProtocol.readSyncMessage(decoder, encoder, doc, REMOTE);
      if (encoding.length(encoder) > 1 && socket.readyState === WebSocket.OPEN) socket.send(encoding.toUint8Array(encoder));
    } catch (error) { console.error('bad sync message', error); }
  });
  doc.on('update', (update, origin) => {
    if (origin === REMOTE || socket.readyState !== WebSocket.OPEN) return;
    const encoder = encoding.createEncoder(); encoding.writeVarUint(encoder, 0); syncProtocol.writeUpdate(encoder, update); socket.send(encoding.toUint8Array(encoder));
  });
  await new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve()); socket.once('error', reject);
  });
  const encoder = encoding.createEncoder(); encoding.writeVarUint(encoder, 0); syncProtocol.writeSyncStep1(encoder, doc); socket.send(encoding.toUint8Array(encoder));
  await sleep(120);
  return { doc, socket, close: () => { socket.close(); doc.destroy(); } };
}

async function main() {
  const firstRoom = await createBoard();
  const secondRoom = await createBoard();
  const a = await connect(firstRoom.id);
  const b = await connect(firstRoom.id);
  const isolated = await connect(secondRoom.id);
  try {
    const shape = createObject('rectangle', 100, 120, 180, 120);
    putObject(a.doc, shape, 'smoke-local');
    await waitFor(() => readObjects(b.doc).some((item) => item.id === shape.id), 'client B to receive object creation');
    patchObject(b.doc, shape.id, { x: 260, fill: '#82d8c6' }, 'smoke-local');
    await waitFor(() => readObjects(a.doc).some((item) => item.id === shape.id && item.x === 260 && item.fill === '#82d8c6'), 'client A to receive move and style changes');

    const mapA = getObjectMap(a.doc).get(shape.id)!;
    const mapB = getObjectMap(b.doc).get(shape.id)!;
    a.doc.transact(() => mapA.set('x', 350), 'smoke-concurrent');
    b.doc.transact(() => mapB.set('y', 470), 'smoke-concurrent');
    await waitFor(() => {
      const left = readObjects(a.doc).find((item) => item.id === shape.id);
      const right = readObjects(b.doc).find((item) => item.id === shape.id);
      return Boolean(left && right && left.x === right.x && left.y === right.y && left.fill === right.fill);
    }, 'clients to converge after concurrent independent field edits');
    assert.equal(readObjects(a.doc).find((item) => item.id === shape.id)?.y, 470);
    assert.equal(readObjects(isolated.doc).length, 0, 'updates must remain isolated to their room');
    console.log(JSON.stringify({ ok: true, roomIdLength: firstRoom.id.length, persistence: firstRoom.persistence, clients: 3, synchronizedObject: shape.id, independentFieldsConverged: true, crossRoomIsolation: true }, null, 2));
  } finally { a.close(); b.close(); isolated.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
