import * as Y from 'yjs';
import type { CanvasObject } from '../domain/model';

export type ObjectPatch = Partial<Omit<CanvasObject, 'id'>>;

export function getObjectMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap<Y.Map<unknown>>('objects');
}

export function readObjects(doc: Y.Doc): CanvasObject[] {
  return Array.from(getObjectMap(doc).values()).map((item) => Object.fromEntries(item.entries()) as unknown as CanvasObject);
}

export function putObject(doc: Y.Doc, object: CanvasObject, origin: unknown) {
  doc.transact(() => {
    const objects = getObjectMap(doc);
    let item = objects.get(object.id);
    if (!item) {
      item = new Y.Map<unknown>();
      objects.set(object.id, item);
    }
    for (const [key, value] of Object.entries(object)) item.set(key, value);
  }, origin);
}

export function patchObject(doc: Y.Doc, id: string, patch: ObjectPatch, origin: unknown) {
  doc.transact(() => {
    const item = getObjectMap(doc).get(id);
    if (!item) return;
    for (const [key, value] of Object.entries(patch)) item.set(key, value);
  }, origin);
}

export function removeObjects(doc: Y.Doc, ids: string[], origin: unknown) {
  doc.transact(() => ids.forEach((id) => getObjectMap(doc).delete(id)), origin);
}

export function snapshotObjects(objects: CanvasObject[]) {
  return JSON.stringify(objects);
}
