import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import {
  applyAwarenessUpdate, Awareness, encodeAwarenessUpdate, removeAwarenessStates,
} from 'y-protocols/awareness';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const REMOTE_ORIGIN = Symbol('remote-update');
export const LOCAL_ORIGIN = Symbol('local-update');

export interface Peer {
  clientId: number;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  selection?: string[];
}

export class FormaProvider {
  readonly awareness: Awareness;
  private socket: WebSocket | null = null;
  private destroyed = false;
  private reconnectTimer: number | undefined;
  private cursorTimer: number | undefined;
  private pendingCursor: { x: number; y: number; selection: string[] } | undefined;
  private lastCursorAt = 0;
  private backoff = 500;
  private listeners = new Set<() => void>();
  private currentPeers: Peer[] = [];
  private state: 'connecting' | 'connected' | 'offline' = 'connecting';
  private readonly updateHandler: (update: Uint8Array, origin: unknown) => void;
  private readonly awarenessHandler: (changes: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => void;

  constructor(readonly doc: Y.Doc, readonly roomId: string, user: { name: string; color: string }) {
    this.awareness = new Awareness(doc);
    this.awareness.setLocalStateField('user', user);
    this.updateHandler = (update, origin) => {
      if (origin === REMOTE_ORIGIN || this.socket?.readyState !== WebSocket.OPEN) return;
      const encoder = encoding.createEncoder(); encoding.writeVarUint(encoder, MESSAGE_SYNC); syncProtocol.writeUpdate(encoder, update);
      this.socket.send(encoding.toUint8Array(encoder));
    };
    this.awarenessHandler = ({ added, updated, removed }, origin) => {
      if (origin === this.socket || this.socket?.readyState !== WebSocket.OPEN) return;
      const changed = added.concat(updated, removed); if (!changed.length) return;
      const encoder = encoding.createEncoder(); encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(encoder, encodeAwarenessUpdate(this.awareness, changed)); this.socket.send(encoding.toUint8Array(encoder));
    };
    doc.on('update', this.updateHandler); this.awareness.on('update', this.awarenessHandler); this.connect();
  }

  getStatus() { return this.state; }
  getPeers() { return this.currentPeers; }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private emit() { this.listeners.forEach((listener) => listener()); }

  setCursor(x: number, y: number, selection: string[]) {
    this.pendingCursor = { x, y, selection };
    const elapsed = Date.now() - this.lastCursorAt;
    if (elapsed >= 35) { this.flushCursor(); return; }
    if (this.cursorTimer) return;
    this.cursorTimer = window.setTimeout(() => { this.cursorTimer = undefined; this.flushCursor(); }, 35 - elapsed);
  }

  private flushCursor() {
    if (!this.pendingCursor || this.destroyed) return;
    const { x, y, selection } = this.pendingCursor; this.pendingCursor = undefined; this.lastCursorAt = Date.now();
    this.awareness.setLocalState({ ...this.awareness.getLocalState(), cursor: { x, y }, selection });
  }

  private connect() {
    if (this.destroyed) return;
    this.state = 'connecting'; this.emit();
    const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = new URL(import.meta.env?.VITE_BACKEND_URL || location.origin);
    socketUrl.protocol = scheme;
    socketUrl.pathname = '/sync';
    socketUrl.search = '';
    socketUrl.searchParams.set('room', this.roomId);
    const socket = new WebSocket(socketUrl);
    this.socket = socket; socket.binaryType = 'arraybuffer';
    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.backoff = 500; this.state = 'connected'; this.emit();
      const encoder = encoding.createEncoder(); encoding.writeVarUint(encoder, MESSAGE_SYNC); syncProtocol.writeSyncStep1(encoder, this.doc); socket.send(encoding.toUint8Array(encoder));
      const states = Array.from(this.awareness.getStates().keys());
      if (states.length) {
        const awarenessEncoder = encoding.createEncoder(); encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(awarenessEncoder, encodeAwarenessUpdate(this.awareness, states)); socket.send(encoding.toUint8Array(awarenessEncoder));
      }
    };
    socket.onmessage = (event) => {
      try {
        const decoder = decoding.createDecoder(new Uint8Array(event.data as ArrayBuffer)); const type = decoding.readVarUint(decoder);
        if (type === MESSAGE_SYNC) {
          const encoder = encoding.createEncoder(); encoding.writeVarUint(encoder, MESSAGE_SYNC);
          syncProtocol.readSyncMessage(decoder, encoder, this.doc, REMOTE_ORIGIN);
          if (encoding.length(encoder) > 1 && socket.readyState === WebSocket.OPEN) socket.send(encoding.toUint8Array(encoder));
        } else if (type === MESSAGE_AWARENESS) applyAwarenessUpdate(this.awareness, decoding.readVarUint8Array(decoder), socket);
        this.refreshPeers();
      } catch (error) { console.warn('Ignored malformed collaboration message', error); }
    };
    socket.onclose = () => {
      if (this.socket !== socket || this.destroyed) return;
      this.state = 'offline'; this.currentPeers = []; this.emit();
      this.reconnectTimer = window.setTimeout(() => this.connect(), this.backoff); this.backoff = Math.min(this.backoff * 2, 10_000);
    };
    socket.onerror = () => socket.close();
  }

  private refreshPeers() {
    this.currentPeers = Array.from(this.awareness.getStates().entries())
      .filter(([clientId, state]) => clientId !== this.doc.clientID && Boolean((state as { user?: unknown }).user))
      .map(([clientId, state]) => {
        const item = state as { user: { name: string; color: string }; cursor?: { x: number; y: number }; selection?: string[] };
        return { clientId, name: item.user.name, color: item.user.color, cursor: item.cursor, selection: item.selection };
      });
    this.emit();
  }

  destroy() {
    this.destroyed = true;
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    if (this.cursorTimer) window.clearTimeout(this.cursorTimer);
    this.doc.off('update', this.updateHandler); this.awareness.off('update', this.awarenessHandler);
    removeAwarenessStates(this.awareness, [this.doc.clientID], 'destroy'); this.socket?.close(); this.awareness.destroy(); this.listeners.clear();
  }
}
