import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { createObject, normalizeRect } from '../domain/model';
import { getObjectMap, readObjects, putObject } from './document';

const originA = Symbol('A');
const originB = Symbol('B');

describe('canvas object helpers', () => {
  it('normalizes a drag in every direction into a positive rectangle', () => {
    expect(normalizeRect({ x: 12, y: 20 }, { x: -8, y: 5 })).toEqual({ x: -8, y: 5, width: 20, height: 15 });
  });
  it('creates typed objects with editable styling defaults', () => {
    const rect = createObject('rectangle', 10, 20);
    expect(rect).toMatchObject({ type: 'rectangle', x: 10, y: 20, width: 180, height: 120, opacity: 1, radius: 14 });
  });
});

describe('Yjs document semantics', () => {
  it('converges after concurrent writes and retains independent properties', () => {
    const initial = new Y.Doc();
    putObject(initial, createObject('rectangle', 0, 0), null);
    const initialState = Y.encodeStateAsUpdate(initial);
    const a = new Y.Doc(); const b = new Y.Doc();
    Y.applyUpdate(a, initialState); Y.applyUpdate(b, initialState);
    const id = readObjects(a)[0].id;
    const firstA = Y.encodeStateVector(a); const firstB = Y.encodeStateVector(b);
    a.transact(() => { const item = getObjectMap(a).get(id)!; item.set('x', 100); item.set('fill', '#ffffff'); }, originA);
    b.transact(() => { const item = getObjectMap(b).get(id)!; item.set('x', 260); item.set('opacity', .5); }, originB);
    const updateA = Y.encodeStateAsUpdate(a, firstA); const updateB = Y.encodeStateAsUpdate(b, firstB);
    Y.applyUpdate(a, updateB); Y.applyUpdate(b, updateA);
    expect(Y.encodeStateAsUpdate(a)).toEqual(Y.encodeStateAsUpdate(b));
    const merged = readObjects(a)[0];
    expect([100, 260]).toContain(merged.x);
    expect(merged.fill).toBe('#ffffff');
    expect(merged.opacity).toBe(.5);
    initial.destroy(); a.destroy(); b.destroy();
  });
});
