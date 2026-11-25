import { MousePointer2, Square, Circle, Minus, ArrowUpRight, Type, Hand, Frame, type LucideIcon } from 'lucide-react';
import type { Tool } from '../domain/model';

const groups: { tool: Tool; label: string; shortcut: string; icon: LucideIcon }[][] = [
  [
    { tool: 'select', label: 'Select', shortcut: 'V', icon: MousePointer2 },
    { tool: 'hand', label: 'Pan canvas', shortcut: 'H', icon: Hand },
  ],
  [
    { tool: 'frame', label: 'Frame', shortcut: 'F', icon: Frame },
    { tool: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: Square },
    { tool: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: Circle },
    { tool: 'line', label: 'Line', shortcut: 'L', icon: Minus },
    { tool: 'arrow', label: 'Arrow', shortcut: 'A', icon: ArrowUpRight },
    { tool: 'text', label: 'Text', shortcut: 'T', icon: Type },
  ],
];

export default function ToolRail({ active, setActive }: { active: Tool; setActive: (tool: Tool) => void }) {
  return <aside className="tool-rail" aria-label="Canvas tools">
    {groups.map((group, i) => <div className="tool-group" key={i}>
      {group.map(({ tool, label, shortcut, icon: Icon }) => <button
        key={tool}
        className={`tool-button ${active === tool ? 'active' : ''}`}
        onClick={() => setActive(tool)}
        title={`${label} (${shortcut})`}
        aria-label={`${label} tool, shortcut ${shortcut}`}
        aria-pressed={active === tool}
      ><Icon size={17} strokeWidth={1.7} /><kbd>{shortcut}</kbd></button>)}
    </div>)}
    <div className="tool-rail-bottom"><span className="keyboard-hint">?</span></div>
  </aside>;
}
