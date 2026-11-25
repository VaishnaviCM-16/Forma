import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  Minus,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { THEMES, useTheme, type TextScale } from "./ThemeProvider";

const SCALES: { id: TextScale; label: string }[] = [
  { id: "comfortable", label: "Comfortable" },
  { id: "large", label: "Large" },
  { id: "extra-large", label: "Extra large" },
];

export default function ThemeMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const { theme, textScale, setTheme, setTextScale } = useTheme();

  const changeScale = (direction: number) => {
    const index = SCALES.findIndex((item) => item.id === textScale);
    setTextScale(
      SCALES[Math.max(0, Math.min(SCALES.length - 1, index + direction))].id,
    );
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !rootRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  let popoverStyle: CSSProperties | undefined;
  if (open && typeof window !== "undefined") {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const maxHeight = Math.max(240, Math.min(window.innerHeight - 24, 680));
      popoverStyle = {
        position: "fixed",
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 387)),
        right: "auto",
        top: Math.max(
          12,
          Math.min(rect.bottom + 8, window.innerHeight - maxHeight - 12),
        ),
        maxHeight: `min(82vh, ${maxHeight}px)`,
        overflowY: "auto",
        zIndex: 20000,
      };
    }
  }

  return (
    <div className="theme-menu-root" ref={rootRef}>
      <button
        ref={triggerRef}
        className="theme-trigger"
        title="Change canvas background and reading size"
        aria-label="Themes and reading size"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="forma-theme-popover"
        onClick={() => setOpen((value) => !value)}
      >
        <SlidersHorizontal size={16} />
        <span>Themes</span>
        <ChevronDown size={14} />
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <section
            ref={popoverRef}
            id="forma-theme-popover"
            className="theme-popover"
            style={popoverStyle}
            role="dialog"
            aria-label="Appearance settings"
          >
            <header className="theme-popover-head">
              <div>
                <span>MAKE IT YOURS</span>
                <strong>Themes &amp; type</strong>
              </div>
              <button
                className="icon-button subtle"
                onClick={() => setOpen(false)}
                aria-label="Close appearance settings"
              >
                ×
              </button>
            </header>
            <div className="theme-grid">
              {THEMES.map((item) => (
                <button
                  key={item.id}
                  className={`theme-choice ${theme === item.id ? "selected" : ""}`}
                  title={item.description}
                  aria-pressed={theme === item.id}
                  onClick={() => setTheme(item.id)}
                >
                  <span
                    className={`theme-swatch swatch-${item.id}`}
                    style={{
                      background: `linear-gradient(145deg,${item.canvas},${item.accent}a0)`,
                    }}
                  >
                    {theme === item.id && <Check size={14} />}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            <div className="font-size-control">
              <div>
                <span>READING SIZE</span>
                <strong>
                  {SCALES.find((item) => item.id === textScale)?.label}
                </strong>
              </div>
              <div className="font-size-actions">
                <button
                  onClick={() => changeScale(-1)}
                  disabled={textScale === "comfortable"}
                  aria-label="Decrease reading size"
                >
                  <Minus size={16} />
                </button>
                <span>Aa</span>
                <button
                  onClick={() => changeScale(1)}
                  disabled={textScale === "extra-large"}
                  aria-label="Increase reading size"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <p className="theme-credits">
              Naruto- and Demon Slayer-inspired themes include original canvas
              background art, not character images or logos. Night Sky photo
              credit is in project documentation.
            </p>
          </section>,
          document.body,
        )}
    </div>
  );
}
