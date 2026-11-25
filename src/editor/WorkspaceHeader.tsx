import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Copy, Download, MoreHorizontal, Redo2, Share2, Undo2, Users, ZoomIn, ZoomOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Peer } from '../collaboration/provider';

export default function WorkspaceHeader({ title, setTitle, status, peers, persistence, zoom, setZoom, undo, redo, onExport }: {
  title: string; setTitle: (value: string) => void; status: string; peers: Peer[]; persistence: string; zoom: number; setZoom: (value: number) => void; undo: () => void; redo: () => void; onExport: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); } catch { window.prompt('Copy this board link', window.location.href); }
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  };
  return <header className="workspace-header">
    <div className="workspace-brand"><Link to="/" className="back-link" aria-label="Back to FORMA home"><ArrowLeft size={16}/></Link><span className="brand-mark small-mark"><i/><i/><i/><i/></span><span className="brand-name">forma</span><span className="header-divider"/></div>
    <div className="document-title-area">
      {editing ? <input ref={inputRef} className="title-input" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => setEditing(false)} onKeyDown={(e) => { if (e.key === 'Enter') setEditing(false); if (e.key === 'Escape') setEditing(false); }} maxLength={60} /> : <button className="document-title" onClick={() => setEditing(true)} title="Click to rename board">{title}<ChevronDown size={13}/></button>}
      <div className={`connection-status status-${status}`}><span className="status-dot"/>{status === 'connected' ? 'Synced' : status === 'offline' ? 'Reconnecting' : 'Connecting'}</div>
    </div>
    <div className="workspace-header-actions">
      <button className="icon-button header-action" title="Undo (Ctrl/Cmd+Z)" aria-label="Undo" onClick={undo}><Undo2 size={16}/></button>
      <button className="icon-button header-action" title="Redo (Ctrl/Cmd+Shift+Z)" aria-label="Redo" onClick={redo}><Redo2 size={16}/></button>
      <span className="header-divider"/>
      <button className="zoom-chip" onClick={() => setZoom(1)} title="Reset zoom">{Math.round(zoom * 100)}%</button>
      <button className="icon-button header-action zoom-quick" aria-label="Zoom out" onClick={() => setZoom(Math.max(.18, zoom - .1))}><ZoomOut size={15}/></button>
      <button className="icon-button header-action zoom-quick" aria-label="Zoom in" onClick={() => setZoom(Math.min(4, zoom + .1))}><ZoomIn size={15}/></button>
      <span className="header-divider"/>
      <div className="avatar-stack" aria-label={`${peers.length + 1} collaborators in this session`}>
        {peers.slice(0, 2).map((peer) => <span key={peer.clientId} className="avatar peer-avatar" style={{ background: peer.color }} title={peer.name}>{peer.name.slice(0,1)}</span>)}
        <span className="avatar you-avatar" title="You">Y</span>
      </div>
      <button className="share-button" onClick={() => setShareOpen(true)}><Share2 size={15}/><span>Share</span></button>
      <button className="icon-button header-action mobile-menu" aria-label="More actions" onClick={onExport}><MoreHorizontal size={18}/></button>
    </div>
    {shareOpen && <div className="modal-scrim" onClick={() => setShareOpen(false)}>
      <div className="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top"><div><span className="eyebrow">COLLABORATE</span><h2 id="share-title">Share this canvas</h2></div><button className="icon-button" onClick={() => setShareOpen(false)} aria-label="Close">×</button></div>
        <p>Anyone with this board link can join this guest session and edit together.</p>
        <div className="share-warning"><span>Session-only: the room clears when this server restarts. Anyone with this link can edit.</span></div>
        <div className="share-link-row"><span>{window.location.href}</span><button onClick={copyLink}>{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? 'Copied' : 'Copy link'}</button></div>
        <div className="modal-note"><Users size={14}/> Guest links grant edit access. Only share with people you trust.</div>
      </div>
    </div>}
  </header>;
}
