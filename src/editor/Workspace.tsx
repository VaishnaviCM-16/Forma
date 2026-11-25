import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowDownLeft, Download, LoaderCircle, Plus, SlidersHorizontal, Wifi, ZoomIn, ZoomOut } from 'lucide-react';
import { useBoard } from '../collaboration/useBoard';
import { api, type BoardInfo } from '../domain/api';
import { createObject, type Camera, type Tool } from '../domain/model';
import CanvasStage from './CanvasStage';
import Inspector from './Inspector';
import ToolRail from './ToolRail';
import WorkspaceHeader from './WorkspaceHeader';
import { exportBoard } from './export';
import ImageLibrary, { type InsertedImage } from './ImageLibrary';
import ThemeMenu from '../themes/ThemeMenu';

const toolShortcuts: Record<string, Tool> = { v: 'select', f: 'frame', r: 'rectangle', o: 'ellipse', l: 'line', a: 'arrow', t: 'text', h: 'hand' };

export default function Workspace() {
  const { boardId = '' } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState<BoardInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(true);
  const [title, setTitle] = useState('Untitled board');
  const [tool, setTool] = useState<Tool>('select');
  const [selection, setSelection] = useState<string[]>([]);
  const [camera, setCamera] = useState<Camera>({ x: Math.max(24, window.innerWidth * .43 - 120), y: Math.max(80, window.innerHeight * .39 - 100), zoom: 1 });
  const [fps, setFps] = useState(0);
  const [toast, setToast] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const { objects, status, peers, add, update, remove, undo, redo, setCursor } = useBoard(boardId);

  useEffect(() => {
    let active = true;
    api.getBoard(boardId).then((result) => {
      if (!active) return;
      setBoard(result); setTitle(result.title); setBusy(false);
    }).catch((error: Error) => {
      if (!active) return;
      setLoadError(error.message || 'This board could not be opened.'); setBusy(false);
    });
    return () => { active = false; };
  }, [boardId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!board || title.trim() === board.title) return;
      setSavingTitle(true);
      api.renameBoard(boardId, title).then((updated) => { setBoard(updated); setTitle(updated.title); })
        .catch((error: Error) => showToast(error.message))
        .finally(() => setSavingTitle(false));
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [title, board, boardId]);

  const showToast = useCallback((message: string) => {
    setToast(message); window.setTimeout(() => setToast(''), 2600);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const editing = target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (editing) return;
      const key = event.key.toLowerCase();
      const mod = event.metaKey || event.ctrlKey;
      if (mod && key === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); return; }
      if (mod && key === 'd') { event.preventDefault(); duplicateSelection(); return; }
      if (event.key === 'Delete' || event.key === 'Backspace') { if (selection.length) { event.preventDefault(); remove(selection); setSelection([]); } return; }
      if (!mod && !event.altKey && toolShortcuts[key]) setTool(toolShortcuts[key]);
      if (event.key === 'Escape') { setSelection([]); setTool('select'); }
    };
    const duplicateSelection = () => {
      const copies = objects.filter((object) => selection.includes(object.id)).map((object) => ({ ...object, id: crypto.randomUUID(), name: `${object.name} copy`, x: object.x + 24, y: object.y + 24 }));
      copies.forEach(add); setSelection(copies.map((object) => object.id));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selection, objects, remove, add, undo, redo]);

  const updateTitle = useCallback((value: string) => setTitle(value), []);
  const onFps = useCallback((value: number) => setFps(value), []);
  const activeObject = objects.find((object) => selection.includes(object.id));
  const selectedIds = useMemo(() => selection.filter((id) => objects.some((object) => object.id === id)), [selection, objects]);
  const insertImage = useCallback((image: InsertedImage) => {
    if (objects.filter((object) => object.type === 'image').length >= 20) { showToast('This room already has 20 images. Remove an image before adding another.'); return; }
    const x = (window.innerWidth / 2 - camera.x) / camera.zoom - 160;
    const y = (window.innerHeight / 2 - camera.y) / camera.zoom - 110;
    const object = createObject('image', x, y, 320, 220);
    object.imageData = image.dataUrl; object.name = image.name.slice(0, 90); object.source = image.source;
    object.creator = image.creator; object.license = image.license; object.licenseUrl = image.licenseUrl;
    add(object); setSelection([object.id]);
    showToast('Image added to this live session.');
  }, [add, camera, objects, showToast]);
  const exportPng = useCallback(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.canvas-surface');
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) { showToast('PNG export failed.'); return; }
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `${title.trim().replace(/[^a-z0-9_-]+/gi, '-') || 'forma-canvas'}.png`; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }, [title, showToast]);

  if (busy) return <main className="workspace-loading"><span className="brand-mark"><i/><i/><i/><i/></span><LoaderCircle className="spin" size={19}/><span>Opening your canvas…</span></main>;
  if (loadError || !board) return <main className="workspace-error"><div className="error-mark"><AlertTriangle size={24}/></div><span className="eyebrow">CANVAS UNAVAILABLE</span><h1>We can’t open this board.</h1><p>{loadError || 'This board may not exist or its guest session has ended.'}</p><button className="button-primary" onClick={() => navigate('/')}>Return to FORMA</button></main>;

  return <main className="workspace-shell">
    <WorkspaceHeader title={title} setTitle={updateTitle} status={status} peers={peers} persistence={board.persistence} zoom={camera.zoom} setZoom={(zoom) => setCamera({ ...camera, zoom })} undo={undo} redo={redo} onExport={() => exportBoard(title, objects)} />
    <div className="editor-main">
      <ToolRail active={tool} setActive={setTool} />
      <section className="canvas-column">
        <div className="canvas-context-bar"><span className="session-pill">SESSION-ONLY · RESTART CLEARS THIS ROOM</span><div className="canvas-context-actions"><ThemeMenu/><ImageLibrary onInsert={insertImage}/></div></div>
        <CanvasStage objects={objects} selection={selectedIds} setSelection={setSelection} tool={tool} camera={camera} setCamera={setCamera} add={add} update={update} peers={peers} setCursor={setCursor} onFps={onFps} />
        {!objects.length && <div className="canvas-onboarding"><span className="onboarding-kicker">YOUR SPACE, YOURS TO SHAPE</span><h2>Start with a thought.</h2><p>Choose a tool, then click and drag anywhere on the canvas.</p><div className="onboarding-shortcuts"><span><kbd>R</kbd> rectangle</span><span><kbd>O</kbd> ellipse</span><span><kbd>T</kbd> text</span></div></div>}
        <div className="canvas-coordinate"><span className="coordinate-dot"/>{Math.round((0 - camera.x) / camera.zoom)} , {Math.round((0 - camera.y) / camera.zoom)}</div>
        <div className="canvas-controls">
          <button className="icon-button" aria-label="Zoom out" onClick={() => setCamera({ ...camera, zoom: Math.max(.18, camera.zoom - .1) })}><ZoomOut size={15}/></button>
          <button className="canvas-zoom-label" title="Reset zoom" onClick={() => setCamera({ ...camera, zoom: 1 })}>{Math.round(camera.zoom * 100)}%</button>
          <button className="icon-button" aria-label="Zoom in" onClick={() => setCamera({ ...camera, zoom: Math.min(4, camera.zoom + .1) })}><ZoomIn size={15}/></button>
          <span className="bottom-divider"/><button className="fit-button" onClick={() => setCamera({ x: Math.max(30, window.innerWidth * .42 - 120), y: 150, zoom: .9 })}><ArrowDownLeft size={13}/> Fit</button><span className="bottom-divider"/><button className="fit-button" onClick={exportPng}>PNG</button>
        </div>
      </section>
      <Inspector mobileOpen={mobileInspectorOpen} objects={objects} selection={selectedIds} onSelect={setSelection} update={update} />
    </div>
    <footer className="workspace-statusbar"><span className="status-left"><span className={`status-dot ${status === 'connected' ? 'online' : ''}`}/>{status === 'connected' ? 'Live collaboration' : status === 'offline' ? 'Reconnecting…' : 'Connecting…'}<span className="status-separator"/>{peers.length + 1} {peers.length === 0 ? 'you' : 'people'} here</span><span className="status-center"><Wifi size={12}/> Live session · in-memory only</span><span className="status-right">{fps} FPS <small>live · target 60</small></span></footer>
    {toast && <div className="toast-message" role="status">{toast}</div>}
    <button className="quick-add" aria-label="Add a rectangle" title="Add rectangle (R)" onClick={() => { const object = createObject('rectangle', (window.innerWidth / 2 - camera.x) / camera.zoom, (window.innerHeight / 2 - camera.y) / camera.zoom); add(object); setSelection([object.id]); }}><Plus size={20}/></button>
    <button className="mobile-inspector-toggle" aria-label="Toggle properties inspector" aria-controls="workspace-inspector" aria-expanded={mobileInspectorOpen} onClick={() => setMobileInspectorOpen(!mobileInspectorOpen)}><SlidersHorizontal size={15}/></button>
    <button className="export-fab" title="Export board JSON" aria-label="Export board" onClick={() => { exportBoard(title, objects); showToast('Board exported as JSON.'); }}><Download size={16}/></button>
    {savingTitle && <span className="rename-saving">Saving title…</span>}
    {activeObject && <span className="sr-only select-none">Selected {activeObject.name}</span>}
  </main>;
}
