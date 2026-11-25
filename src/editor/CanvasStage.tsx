import { useCallback, useEffect, useRef, useState } from 'react';
import { CanvasRenderer } from './CanvasRenderer';
import type { Camera, CanvasObject, Point, Tool } from '../domain/model';
import { createObject, normalizeRect, pointInObject } from '../domain/model';
import type { Peer } from '../collaboration/provider';
import type { ObjectPatch } from '../collaboration/document';

interface Props {
  objects: CanvasObject[];
  selection: string[];
  setSelection: (selection: string[]) => void;
  tool: Tool;
  camera: Camera;
  setCamera: (camera: Camera) => void;
  add: (object: CanvasObject) => void;
  update: (id: string, patch: ObjectPatch) => void;
  peers: Peer[];
  setCursor: (point: Point, selection: string[]) => void;
  onFps: (fps: number) => void;
}
interface Gesture {
  kind: 'draw' | 'drag' | 'pan' | 'resize' | 'rotate' | 'marquee';
  pointer: Point;
  screen: Point;
  camera?: Camera;
  target?: CanvasObject;
  initial?: CanvasObject[];
  handle?: string;
  marqueeEnd?: Point;
}

export default function CanvasStage(props: Props) {
  const { objects, selection, setSelection, tool, camera, setCamera, add, update, peers, setCursor, onFps } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peerCanvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const [preview, setPreview] = useState<Gesture | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !peerCanvasRef.current) return;
    const renderer = new CanvasRenderer(canvasRef.current, peerCanvasRef.current);
    rendererRef.current = renderer;
    const observer = new ResizeObserver(() => renderer.invalidate());
    observer.observe(canvasRef.current);
    observer.observe(peerCanvasRef.current);
    const themeChange = () => renderer.invalidate();
    window.addEventListener('forma-theme-change', themeChange);
    return () => { observer.disconnect(); window.removeEventListener('forma-theme-change', themeChange); renderer.destroy(); rendererRef.current = null; };
  }, []);

  useEffect(() => {
    rendererRef.current?.setState({
      objects, camera, selection, peers,
      preview: preview?.kind === 'draw' ? { type: tool === 'frame' ? 'frame' : tool as CanvasObject['type'], start: preview.pointer, end: preview.marqueeEnd ?? preview.pointer } : undefined,
      onFps,
    });
  }, [objects, camera, selection, peers, preview, tool, onFps]);

  const toWorld = useCallback((event: React.PointerEvent<HTMLCanvasElement> | React.WheelEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left - camera.x) / camera.zoom, y: (event.clientY - rect.top - camera.y) / camera.zoom };
  }, [camera]);
  const toScreen = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 && event.button !== 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const world = toWorld(event); const screen = toScreen(event);
    if (tool === 'hand' || event.button === 1) {
      gesture.current = { kind: 'pan', pointer: world, screen, camera };
      return;
    }
    if (tool === 'rectangle' || tool === 'ellipse' || tool === 'line' || tool === 'arrow' || tool === 'frame') {
      gesture.current = { kind: 'draw', pointer: world, screen, marqueeEnd: world };
      setPreview(gesture.current); return;
    }
    if (tool === 'text') {
      const text = window.prompt('Text for your canvas', 'A thought taking shape');
      if (text?.trim()) {
        const object = createObject('text', world.x, world.y, Math.max(100, text.length * 16), 46);
        object.text = text.trim().slice(0, 300); add(object); setSelection([object.id]);
      }
      return;
    }
    const selectedObjects = objects.filter((object) => selection.includes(object.id));
    if (selectedObjects.length === 1) {
      const object = selectedObjects[0];
      const handle = getHandleAt(screen, object, camera);
      if (handle === 'rotate') { gesture.current = { kind: 'rotate', pointer: world, screen, target: object }; return; }
      if (handle) { gesture.current = { kind: 'resize', pointer: world, screen, target: object, handle, initial: [object] }; return; }
    }
    const hit = [...objects].reverse().find((object) => pointInObject(world, object, 5 / camera.zoom));
    if (hit) {
      const nextSelection = event.shiftKey
        ? selection.includes(hit.id) ? selection.filter((id) => id !== hit.id) : [...selection, hit.id]
        : selection.includes(hit.id) ? selection : [hit.id];
      setSelection(nextSelection);
      const dragObjects = objects.filter((object) => nextSelection.includes(object.id));
      gesture.current = { kind: 'drag', pointer: world, screen, initial: dragObjects };
    } else {
      setSelection([]);
      gesture.current = { kind: 'marquee', pointer: world, screen, marqueeEnd: world };
      setPreview(gesture.current);
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const world = toWorld(event); setCursor(world, selection);
    const active = gesture.current;
    if (!active) return;
    if (active.kind === 'draw' || active.kind === 'marquee') {
      const moved = { ...active, marqueeEnd: world };
      gesture.current = moved; setPreview(moved); return;
    }
    if (active.kind === 'pan' && active.camera) {
      setCamera({ ...active.camera, x: active.camera.x + (event.clientX - (active.screen.x + event.currentTarget.getBoundingClientRect().left)), y: active.camera.y + (event.clientY - (active.screen.y + event.currentTarget.getBoundingClientRect().top)) });
      return;
    }
    if (active.kind === 'drag' && active.initial) {
      const dx = world.x - active.pointer.x; const dy = world.y - active.pointer.y;
      active.initial.forEach((object) => update(object.id, { x: object.x + dx, y: object.y + dy }));
      active.initial = active.initial.map((object) => ({ ...object, x: object.x + dx, y: object.y + dy }));
      active.pointer = world;
      return;
    }
    if (active.kind === 'resize' && active.target && active.handle && active.initial?.[0]) {
      const original = active.initial[0];
      const dx = world.x - active.pointer.x; const dy = world.y - active.pointer.y;
      const left = active.handle.includes('w'); const top = active.handle.includes('n');
      const x = left ? original.x + dx : original.x;
      const y = top ? original.y + dy : original.y;
      const width = Math.max(16, original.width + (left ? -dx : dx));
      const height = Math.max(16, original.height + (top ? -dy : dy));
      update(original.id, { x, y, width, height });
      active.initial = [{ ...original, x, y, width, height }]; active.pointer = world;
      return;
    }
    if (active.kind === 'rotate' && active.target) {
      const object = objects.find((item) => item.id === active.target?.id);
      if (!object) return;
      const angle = Math.atan2(world.y - (object.y + object.height / 2), world.x - (object.x + object.width / 2)) * 180 / Math.PI + 90;
      update(object.id, { rotation: Math.round(angle) });
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const active = gesture.current;
    if (active?.kind === 'draw' && active.marqueeEnd) {
      const rect = normalizeRect(active.pointer, active.marqueeEnd);
      const type = tool === 'frame' ? 'frame' : tool as CanvasObject['type'];
      if (type === 'line' || type === 'arrow') {
        const object = createObject(type, active.pointer.x, active.pointer.y, active.marqueeEnd.x - active.pointer.x, active.marqueeEnd.y - active.pointer.y);
        add(object); setSelection([object.id]);
      } else if (rect.width > 5 || rect.height > 5) {
        const object = createObject(type, rect.x, rect.y, Math.max(18, rect.width), Math.max(18, rect.height));
        add(object); setSelection([object.id]);
      } else {
        const object = createObject(type, active.pointer.x, active.pointer.y);
        add(object); setSelection([object.id]);
      }
    } else if (active?.kind === 'marquee' && active.marqueeEnd) {
      const box = normalizeRect(active.pointer, active.marqueeEnd);
      const found = objects.filter((object) => object.x < box.x + box.width && object.x + object.width > box.x && object.y < box.y + box.height && object.y + object.height > box.y).map((object) => object.id);
      setSelection(found);
    }
    gesture.current = null; setPreview(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (event.shiftKey) { setCamera({ ...camera, x: camera.x - event.deltaY }); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const factor = Math.exp(-event.deltaY * .0012);
    const zoom = Math.max(.18, Math.min(4, camera.zoom * factor));
    setCamera({ zoom, x: anchor.x - (anchor.x - camera.x) * zoom / camera.zoom, y: anchor.y - (anchor.y - camera.y) * zoom / camera.zoom });
  };

  return <div className="canvas-stack">
    <canvas
      ref={canvasRef}
      className={`canvas-surface cursor-${tool}`}
      aria-label="FORMA infinite design canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    />
    <canvas ref={peerCanvasRef} className="canvas-peer-layer" aria-hidden="true" />
  </div>;
}

function getHandleAt(screen: Point, object: CanvasObject, camera: Camera) {
  const box = {
    left: object.x * camera.zoom + camera.x,
    top: object.y * camera.zoom + camera.y,
    right: (object.x + object.width) * camera.zoom + camera.x,
    bottom: (object.y + object.height) * camera.zoom + camera.y,
  };
  const near = (x: number, y: number) => Math.abs(screen.x - x) < 10 && Math.abs(screen.y - y) < 10;
  if (near((box.left + box.right) / 2, box.top - 20)) return 'rotate';
  if (near(box.left, box.top)) return 'nw'; if (near(box.right, box.top)) return 'ne';
  if (near(box.left, box.bottom)) return 'sw'; if (near(box.right, box.bottom)) return 'se';
  return undefined;
}
