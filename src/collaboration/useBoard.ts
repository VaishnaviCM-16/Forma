import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import type { CanvasObject, Point } from '../domain/model';
import { getObjectMap, patchObject, putObject, readObjects, removeObjects, type ObjectPatch } from './document';
import { FormaProvider, LOCAL_ORIGIN } from './provider';

const cursorPalette = ['#b29aff', '#82d8c6', '#f2aa7a', '#f17d9d', '#88aafa'];

export function useBoard(boardId: string) {
  const doc = useMemo(() => new Y.Doc(), [boardId]);
  const undoRef = useRef<Y.UndoManager | null>(null);
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const [peers, setPeers] = useState<ReturnType<FormaProvider['getPeers']>>([]);
  const [provider, setProvider] = useState<FormaProvider | null>(null);

  useEffect(() => {
    const history = new Y.UndoManager(getObjectMap(doc), { trackedOrigins: new Set([null, LOCAL_ORIGIN]), captureTimeout: 500 });
    undoRef.current = history;
    const user = { name: `Guest ${Math.floor(Math.random() * 90 + 10)}`, color: cursorPalette[Math.floor(Math.random() * cursorPalette.length)] };
    const connection = new FormaProvider(doc, boardId, user);
    setProvider(connection);
    const sync = () => setObjects(readObjects(doc));
    const unsubscribe = connection.subscribe(() => { setStatus(connection.getStatus()); setPeers(connection.getPeers()); });
    getObjectMap(doc).observeDeep(sync); sync();
    return () => {
      getObjectMap(doc).unobserveDeep(sync); unsubscribe(); connection.destroy(); history.destroy();
      if (undoRef.current === history) undoRef.current = null;
      // Do not destroy `doc` here: React StrictMode replays effects against the same memoized doc.
      // With all observers/providers detached, the abandoned document is garbage-collectable on route change.
    };
  }, [boardId, doc]);

  const add = useCallback((object: CanvasObject) => { if (provider) putObject(doc, object, LOCAL_ORIGIN); }, [doc, provider]);
  const update = useCallback((id: string, patch: ObjectPatch) => { if (provider) patchObject(doc, id, patch, LOCAL_ORIGIN); }, [doc, provider]);
  const remove = useCallback((ids: string[]) => { if (provider) removeObjects(doc, ids, LOCAL_ORIGIN); }, [doc, provider]);
  const undo = useCallback(() => undoRef.current?.undo(), []);
  const redo = useCallback(() => undoRef.current?.redo(), []);
  const setCursor = useCallback((point: Point, selection: string[]) => provider?.setCursor(point.x, point.y, selection), [provider]);

  return { doc, objects, status, peers, add, update, remove, undo, redo, setCursor };
}
