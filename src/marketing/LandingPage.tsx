import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, ChevronDown, Command, MousePointer2, MoveUpRight, Radio, Sparkles, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemeMenu from '../themes/ThemeMenu';
import { api } from '../domain/api';

const enter = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } };

export default function LandingPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [activeDemo, setActiveDemo] = useState('purple');
  const [demoSelection, setDemoSelection] = useState<CSSProperties>({ left: '10%', top: '12%', width: 147, height: 195 });
  const demoCanvas = useRef<HTMLDivElement>(null);
  const demoCards = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    const measureSelection = () => {
      const stage = demoCanvas.current?.getBoundingClientRect();
      const card = demoCards.current[activeDemo]?.getBoundingClientRect();
      if (stage && card) setDemoSelection({ left: card.left - stage.left, top: card.top - stage.top, width: card.width, height: card.height });
    };
    measureSelection();
    window.addEventListener('resize', measureSelection);
    return () => window.removeEventListener('resize', measureSelection);
  }, [activeDemo]);
  const openCanvas = async () => {
    if (creating) return;
    setCreating(true); setError('');
    try { const board = await api.createBoard(); navigate(`/canvas/${board.id}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create a board.'); setCreating(false); }
  };
  const navItems = [['Product', '#product'], ['Features', '#features'], ['How it works', '#how-it-works'], ['Technology', '#technology']];
  return <div className="site-shell">
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/><div className="grain-overlay"/>
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <a href="#top" className="wordmark" aria-label="FORMA home"><span className="brand-mark"><i/><i/><i/><i/></span><span>forma</span></a>
      <nav className={`site-nav ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
        {navItems.map(([label, href]) => <a key={label} href={href} onClick={() => setMenuOpen(false)}>{label}<span className="nav-underline"/></a>)}
      </nav>
      <div className="header-cta"><ThemeMenu/><a className="sign-in-link" href="#technology">Engineering notes</a><button className="nav-launch" onClick={openCanvas}>{creating ? 'Opening…' : 'Launch canvas'}<ArrowUpRight size={14}/></button></div>
      <button className={`mobile-nav-toggle ${menuOpen ? 'open' : ''}`} aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><span/><span/></button>
    </header>
    <main id="top">
      <section className="hero-section">
        <div className="hero-grid-line"/>
        <div className="hero-copy">
          <motion.div className="hero-eyebrow" initial="hidden" animate="visible" variants={enter} transition={{ duration: .5 }}><span className="eyebrow-pulse"/> A SHARED SPACE FOR WHAT’S NEXT <span className="eyebrow-index">001—∞</span></motion.div>
          <motion.h1 initial="hidden" animate="visible" variants={enter} transition={{ duration: .68, delay: .08 }}>Design together.<br/><em>Think without limits.</em></motion.h1>
          <motion.p className="hero-subtitle" initial="hidden" animate="visible" variants={enter} transition={{ duration: .6, delay: .19 }}>An infinite creative canvas where ideas evolve in real time. Draw, explore, and collaborate with your team — powered by conflict-free synchronization.</motion.p>
          <motion.div className="hero-actions" initial="hidden" animate="visible" variants={enter} transition={{ duration: .6, delay: .28 }}>
            <button className="button-primary hero-primary" onClick={openCanvas} disabled={creating}>{creating ? <><span className="tiny-loader"/>Opening canvas</> : <>Open your canvas <ArrowUpRight size={16}/></>}</button>
            <a className="button-quiet" href="#technology">Explore the technology <ArrowDownRight size={15}/></a>
          </motion.div>
          {error && <p className="hero-error" role="alert">{error}</p>}
          <motion.div className="hero-note" initial="hidden" animate="visible" variants={enter} transition={{ duration: .6, delay: .4 }}><span className="micro-shape"/> No account required for a guest room <span className="hero-note-separator">·</span> Shared links are editable by anyone who has them</motion.div>
        </div>
        <motion.div className="hero-visual" initial={reduceMotion ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, delay: .18 }}>
          <div className="visual-orbit orbit-a"/><div className="visual-orbit orbit-b"/>
          <div className="product-window">
            <div className="product-window-top"><span className="window-brand"><span className="brand-mark tiny-mark"><i/><i/><i/><i/></span>FORMA <small>/ Field notes</small></span><span className="demo-label"><i/> WORKSPACE PREVIEW</span><div className="window-dots"><i/><i/><i/></div></div>
            <div className="product-window-body">
              <div className="demo-toolbar"><span className="demo-tool is-active"><MousePointer2 size={14}/></span><span className="demo-tool"><span className="demo-square"/></span><span className="demo-tool"><span className="demo-circle"/></span><span className="demo-tool"><span className="demo-type">T</span></span><span className="toolbar-sep"/><span className="demo-tool"><span className="demo-hand">✣</span></span></div>
              <div className="demo-canvas" ref={demoCanvas}>
                <button ref={(el) => { demoCards.current.purple = el; }} onClick={() => setActiveDemo('purple')} aria-label="Select Form follows feeling card" aria-pressed={activeDemo === 'purple'} className="demo-card card-purple"><i/><i/><i/><b>FORM<br/>FOLLOWS<br/>FEELING.</b><small>STUDY 04 / 26</small></button>
                <button ref={(el) => { demoCards.current.green = el; }} onClick={() => setActiveDemo('green')} aria-label="Select Soft systems card" aria-pressed={activeDemo === 'green'} className="demo-card card-green"><b>soft<br/>systems</b><small>— 01 / explore</small></button>
                <button ref={(el) => { demoCards.current.outline = el; }} onClick={() => setActiveDemo('outline')} aria-label="Select Make room for wonder card" aria-pressed={activeDemo === 'outline'} className="demo-card card-outline"><b>Make room<br/>for wonder.</b><i/></button>
                <span className="demo-selection" style={demoSelection}><i/><i/><i/><i/><span>{activeDemo === 'purple' ? 'Untitled / 03' : activeDemo === 'green' ? 'Brand thought' : 'Frame 01'}</span></span>
                <span className="demo-cursor cursor-violet"><MousePointer2 size={17} fill="currentColor"/><i>You</i></span>
                <span className="demo-cursor cursor-peach"><MousePointer2 size={17} fill="currentColor"/><i>Guest</i></span>
                <span className="canvas-coordinates">— 01 / 06&nbsp;&nbsp; • &nbsp;&nbsp;80%</span>
              </div>
              <div className="demo-inspector"><div className="demo-inspector-title">LAYERS <span>03</span></div><span className="demo-layer active"><i/> Untitled / 03</span><span className="demo-layer"><i/> Brand thought</span><span className="demo-layer"><i/> Frame 01</span><div className="demo-inspector-title demo-props-title">APPEARANCE <ChevronDown size={12}/></div><div className="demo-fill"><i/><span>Fill</span><small>#B29AFF</small></div><div className="demo-fill"><i/><span>Stroke</span><small>#D1C4FF</small></div></div>
            </div>
            <div className="demo-status"><span><i/> Live room</span><span>1200 × ∞</span><span>V · Select</span></div>
          </div>
          <div className="floating-badge badge-sync"><span><Radio size={13}/></span><b>CRDT synced</b><i>just now</i></div>
          <div className="floating-badge badge-presence"><span className="presence-dot"/><b>2 sample cursors</b><i>preview state</i></div>
          <div className="hero-visual-caption"><span>FIG. 01</span><span>One canvas. A thousand directions.</span><span>FORMA / 2026</span></div>
        </motion.div>
        <div className="hero-side-note"><span>DESIGN IN MOTION</span><i/></div>
      </section>

      <section className="principles-strip" id="product">
        <div className="strip-intro"><span className="section-index">[ 01 / PRINCIPLES ]</span><p>A creative tool should disappear into the work.</p></div>
        <div className="principle"><span className="principle-number">01</span><b>Realtime by design</b><small>Yjs · WebSocket sync</small></div>
        <div className="principle"><span className="principle-number">02</span><b>One shared document</b><small>Convergent edit state</small></div>
        <div className="principle"><span className="principle-number">03</span><b>60 fps rendering target</b><small>Target, not benchmarked</small></div>
        <span className="strip-side-label">ENGINEERING FIRST — ALWAYS</span>
      </section>

      <section className="features-section section-pad" id="features">
        <div className="section-heading"><div><span className="section-index">[ 02 / MADE TO MOVE ]</span><h2>Room to think.<br/><em>Tools to make.</em></h2></div><p>Ideas don’t arrive in neat little boxes. FORMA gives them the space to wander — and a clear path to take shape.</p></div>
        <div className="feature-row feature-row-canvas">
          <div className="feature-text"><span className="feature-index">01 — THE CANVAS</span><h3>One space.<br/>Unlimited possibilities.</h3><p>Pan out when the idea gets big. Zoom in for the detail. A coordinate world that gets out of the way and leaves room for the unexpected.</p><div className="feature-spec"><span>01</span><span>Direct manipulation</span><i/><span>Canvas 2D / DPR aware</span></div></div>
          <div className="feature-art art-infinite"><div className="art-grid"/><div className="art-crosshair cross-one"/><div className="art-crosshair cross-two"/><div className="art-shape art-frame"><span>FRAME / 01</span></div><div className="art-shape art-circle"/><div className="art-shape art-card"><span>FIELD<br/>NOTES</span><small>COLOUR STUDY — 04</small></div><div className="art-zoom"><span>−</span><b>80%</b><span>+</span></div><div className="art-coordinate">X 0840 &nbsp; Y 1200</div></div>
        </div>
        <div className="feature-row feature-row-collab reverse-row">
          <div className="feature-art art-collab"><div className="collab-board"><div className="collab-panel panel-a"><span className="panel-line wide"/><span className="panel-line"/><span className="panel-line short"/><i className="panel-bubble">A</i></div><div className="collab-panel panel-b"><div className="panel-orbit"><i/><i/><i/><b/></div><span className="panel-caption">A thought in progress</span></div><div className="collab-cursor c-a"><MousePointer2 size={17} fill="currentColor"/><span>You</span></div><div className="collab-cursor c-b"><MousePointer2 size={17} fill="currentColor"/><span>Guest</span></div><div className="collab-active">2 connected <span/></div></div><div className="art-note">MOVING TOGETHER<br/>WITHOUT STEPPING<br/>ON EACH OTHER.</div></div>
          <div className="feature-text"><span className="feature-index">02 — LIVE COLLABORATION</span><h3>Every change.<br/>Every collaborator.<br/><em>Instantly.</em></h3><p>Each browser keeps its own responsive document. WebSocket updates carry edits; Yjs merges concurrent work so everyone converges on a shared state.</p><div className="feature-spec"><span>02</span><span>Yjs awareness</span><i/><span>Presence stays ephemeral</span></div></div>
        </div>
        <div className="feature-row feature-row-crdt">
          <div className="feature-text"><span className="feature-index">03 — CONFLICT-FREE SYNC</span><h3>Simultaneous edits.<br/><em>Consistent outcomes.</em></h3><p>Design is a conversation, not a lock. CRDT operations merge across clients. If two people write the same field at once, Yjs deterministically resolves that field while independent properties remain independent.</p><a className="text-link" href="#technology">How the sync works <ArrowUpRight size={14}/></a></div>
          <div className="feature-art art-crdt"><div className="crdt-column"><span className="crdt-label">CLIENT A</span><div className="crdt-atom atom-a"><i/> Position <b>x: 160</b></div><div className="crdt-atom atom-a"><i/> Fill <b>violet</b></div></div><div className="crdt-center"><span>MERGE</span><div className="merge-pulse"><i/><i/><i/></div><ArrowRight size={19}/><small>YJS</small></div><div className="crdt-column"><span className="crdt-label">CLIENT B</span><div className="crdt-atom atom-b"><i/> Position <b>x: 240</b></div><div className="crdt-atom atom-b"><i/> Opacity <b>50%</b></div></div><div className="crdt-result"><Check size={14}/> converged state <span>same document · separate fields preserved</span></div></div>
        </div>
        <div className="feature-row feature-row-performance reverse-row">
          <div className="feature-art art-performance"><div className="perf-window"><div className="perf-top"><span>RENDER LOOP</span><span>REQUEST ANIMATION FRAME</span></div><div className="perf-code"><span><i>01</i> const frame = () =&gt; {`{`}</span><span><i>02</i> &nbsp; if (dirty) draw(ctx, state)</span><span><i>03</i> &nbsp; requestAnimationFrame(frame)</span><span><i>04</i> {`}`}</span><span className="perf-cursor"/></div><div className="perf-footer"><span>PIXEL RATIO</span><b>2×</b><span>CANVAS</span><b>2D</b><span>FPS TARGET</span><b>60</b></div></div><div className="performance-orb"/></div>
          <div className="feature-text"><span className="feature-index">04 — PERFORMANCE FIRST</span><h3>Every interaction<br/>should feel <em>immediate.</em></h3><p>A dedicated Canvas 2D render loop, device-pixel-ratio scaling, and event-driven redraws keep high-frequency pointer work out of React’s render path. The 60 fps figure is a target until measured on representative devices.</p><div className="feature-spec"><span>04</span><span>requestAnimationFrame</span><i/><span>Measured FPS indicator in editor</span></div></div>
        </div>
        <div className="feature-row feature-row-presence">
          <div className="feature-text"><span className="feature-index">05 — PRESENCE & AWARENESS</span><h3>See where ideas<br/>are <em>happening.</em></h3><p>Find your collaborators by color and cursor, not by asking “where are you?” Awareness updates stay ephemeral in the live room. This no-account demo runs in memory rather than saving board history.</p><div className="feature-spec"><span>05</span><span>Ephemeral presence</span><i/><span>Ephemeral in-memory presence</span></div></div>
          <div className="feature-art art-presence"><div className="presence-canvas"><span className="presence-window p-window-one"><b>What if we leave<br/>more space?</b><i/><small>THOUGHT / 01</small></span><span className="presence-window p-window-two"><span className="window-flower">✳</span><small>FORM STUDY</small></span><span className="presence-cursor pc-one"><MousePointer2 size={17} fill="currentColor"/><i>Guest</i></span><span className="presence-cursor pc-two"><MousePointer2 size={17} fill="currentColor"/><i>You</i></span><span className="presence-tag">LIVE AWARENESS <b>●</b></span></div></div>
        </div>
      </section>

      <section className="workflow-section" id="how-it-works"><div className="workflow-heading"><span className="section-index">[ 03 / A SMALLER DISTANCE ]</span><h2>From thought<br/>to <em>together.</em></h2><p>No setup theatre. Give an idea a room — and invite others into it.</p></div><div className="workflow-steps"><div className="flow-step"><span className="flow-number">01</span><span className="flow-glyph glyph-create"><i/><i/><i/></span><h3>Create a board.</h3><p>Open a new canvas. Start with a shape, a sentence, or the edges of an idea.</p><span className="flow-link">A blank space, ready</span></div><div className="flow-connector"><span/><ArrowRight size={16}/></div><div className="flow-step"><span className="flow-number">02</span><span className="flow-glyph glyph-invite"><span/><span/><i/></span><h3>Invite collaborators.</h3><p>Copy a room link and send it to your team. Guests join without creating an account.</p><span className="flow-link">One link to the room</span></div><div className="flow-connector"><span/><ArrowRight size={16}/></div><div className="flow-step"><span className="flow-number">03</span><span className="flow-glyph glyph-create-together"><i/><i/><b/></span><h3>Create together.</h3><p>Move, sketch, and rearrange. Every connected canvas follows the same conversation.</p><span className="flow-link">Edits arrive as they happen</span></div></div></section>

      <section className="technology-section section-pad" id="technology"><div className="section-heading tech-heading"><div><span className="section-index">[ 04 / UNDER THE SURFACE ]</span><h2>Small surface.<br/><em>Serious engineering.</em></h2></div><p>A canvas is only as calm as the system underneath it. Here’s the shape of this one — and why this demo is session-only.</p></div>
        <div className="architecture-shell"><div className="architecture-head"><span className="arch-tag"><span/> SYSTEM MAP / LIVE DESIGN</span><span>WHAT HAPPENS WHEN YOU DRAW?</span></div><div className="architecture-flow"><div className="arch-clients"><div className="arch-client"><span className="client-dot violet-dot"/><div><b>Client A</b><small>React · Canvas 2D</small></div><span className="client-cursor">⌁</span></div><div className="arch-client"><span className="client-dot mint-dot"/><div><b>Client B</b><small>React · Canvas 2D</small></div><span className="client-cursor">⌁</span></div></div><div className="arch-wire"><span/><i/><span/></div><div className="arch-server"><span className="server-icon"><Radio size={16}/></span><b>WebSocket</b><small>Node.js · room relay</small></div><div className="arch-wire"><span/><i/><span/></div><div className="arch-crdt"><span className="crdt-icon">↗</span><b>Yjs / CRDT</b><small>Updates converge</small></div><div className="arch-wire persistence-wire"><span/><i/><span/></div><div className="arch-db"><span className="db-icon">◉</span><b>Room memory</b><small>In-process · session-only</small></div></div><div className="arch-foot"><span><i className="key-solid"/> Yjs updates relayed live</span><span><i className="key-dashed"/> Room state ends on restart</span></div><div className="arch-details"><div><b>01 / Document updates</b><p>Yjs shared types encode edits as CRDT updates. A WebSocket room relays those updates; clients converge without a central editor lock.</p></div><div><b>02 / Awareness</b><p>Cursor and selection state travel as ephemeral awareness. It’s kept out of persistent board snapshots.</p></div><div><b>03 / Durability</b><p>This portfolio demo intentionally has no account or database layer; room documents live only in the running server process and are cleared on restart.</p></div></div></div>
        <div className="stack-strip"><span>BUILT WITH</span><b>TypeScript</b><i/><b>React</b><i/><b>Canvas 2D</b><i/><b>WebSockets</b><i/><b>Yjs</b><i/><b>Node.js</b><i/><b>In-memory rooms</b></div>
      </section>

      <section className="closing-section" id="about"><div className="closing-grid"/><div className="closing-glow"/><span className="section-index">[ 05 / YOUR NEXT IDEA ]</span><h2>Great ideas deserve<br/>a <em>shared space.</em></h2><p>Start with a blank canvas. Build something together.</p><button className="button-primary closing-cta" onClick={openCanvas} disabled={creating}>{creating ? 'Opening canvas…' : <>Launch FORMA <ArrowUpRight size={16}/></>}</button><div className="closing-stamp"><span className="brand-mark"><i/><i/><i/><i/></span><span>IDEAS TAKE SHAPE.<br/>TOGETHER.</span></div></section>
    </main>
    <footer className="site-footer"><a href="#top" className="wordmark footer-wordmark"><span className="brand-mark"><i/><i/><i/><i/></span><span>forma</span></a><span className="footer-tagline">A shared canvas, in progress.</span><nav><a href="#features">Product</a><a href="#technology">Technology</a><a href="#how-it-works">How it works</a><a href="#about">About</a></nav><span className="footer-copy">© 2026 FORMA / built to take shape</span><span className="footer-note">Source and contribution guide are included with the project.</span></footer>
    {error && <div className="toast-message landing-toast" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
  </div>;
}
