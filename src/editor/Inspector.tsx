import { useEffect, useState } from "react";
import { ChevronDown, Eye, Layers3 } from "lucide-react";
import type { CanvasObject } from "../domain/model";
import type { ObjectPatch } from "../collaboration/document";

function Field({
  label,
  value,
  onChange,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="inspector-field">
      <span>{label}</span>
      <div className="number-field">
        <input
          type="number"
          value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <small>{suffix}</small>
      </div>
    </label>
  );
}
function ImageSlider({
  label,
  value,
  max = 200,
  onChange,
}: {
  label: string;
  value: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="image-slider-field">
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <small>{Math.round(value)}%</small>
    </label>
  );
}
export default function Inspector({
  objects,
  selection,
  onSelect,
  update,
  mobileOpen = false,
}: {
  objects: CanvasObject[];
  selection: string[];
  onSelect: (ids: string[]) => void;
  update: (id: string, patch: ObjectPatch) => void;
  mobileOpen?: boolean;
}) {
  const selected = objects.find((object) => object.id === selection[0]);
  const [layersOpen, setLayersOpen] = useState(true);
  const [positionOpen, setPositionOpen] = useState(true);
  const [appearanceOpen, setAppearanceOpen] = useState(true);
  useEffect(() => {
    if (selected)
      document.documentElement.style.setProperty(
        "--selected-accent",
        selected.stroke || "var(--accent-main)",
      );
  }, [selected]);
  const set = (patch: ObjectPatch) => selected && update(selected.id, patch);
  return (
    <aside
      id="workspace-inspector"
      className={`inspector ${mobileOpen ? "mobile-open" : ""}`}
      aria-label="Properties inspector"
    >
      <div className="inspector-heading">
        <span>INSPECTOR</span>
        <button className="icon-button subtle" aria-label="Inspector options">
          <span className="dot-menu">···</span>
        </button>
      </div>
      {selected ? (
        <>
          <div className="inspector-object">
            <span className={`object-type-chip type-${selected.type}`}>
              {selected.type.slice(0, 1).toUpperCase()}
            </span>
            <div className="object-title">
              <strong>{selected.name}</strong>
              <small>{selected.type} · selected</small>
            </div>
            <button
              className="icon-button subtle"
              aria-label="Toggle object visibility"
            >
              <Eye size={15} />
            </button>
          </div>
          <section className="inspector-section">
            <button
              className="section-title"
              onClick={() => setPositionOpen(!positionOpen)}
            >
              <span>POSITION</span>
              <ChevronDown
                size={14}
                className={positionOpen ? "" : "rotated"}
              />
            </button>
            {positionOpen && (
              <div className="field-grid">
                <Field
                  label="X"
                  value={selected.x}
                  onChange={(x) => set({ x })}
                />
                <Field
                  label="Y"
                  value={selected.y}
                  onChange={(y) => set({ y })}
                />
                <Field
                  label="W"
                  value={selected.width}
                  onChange={(width) => set({ width: Math.max(1, width) })}
                />
                <Field
                  label="H"
                  value={selected.height}
                  onChange={(height) => set({ height: Math.max(1, height) })}
                />
                <Field
                  label="Rotation"
                  value={selected.rotation}
                  onChange={(rotation) => set({ rotation })}
                  suffix="°"
                />
                {selected.type === "rectangle" && (
                  <Field
                    label="Radius"
                    value={selected.radius}
                    onChange={(radius) => set({ radius: Math.max(0, radius) })}
                  />
                )}
                {selected.type === "text" && (
                  <Field
                    label="Font size"
                    value={selected.fontSize ?? 28}
                    onChange={(fontSize) =>
                      set({ fontSize: Math.max(8, Math.min(160, fontSize)) })
                    }
                    suffix="px"
                  />
                )}
              </div>
            )}
            {selected.type === "text" && positionOpen && (
              <label className="text-content-field">
                <span>Content</span>
                <textarea
                  maxLength={300}
                  value={selected.text ?? ""}
                  onChange={(event) => set({ text: event.target.value })}
                />
              </label>
            )}
          </section>
          {selected.type === "image" && selected.imageData && (
            <section className="inspector-section image-adjustments">
              <div className="section-title">
                <span>IMAGE ADJUSTMENTS</span>
                <span>NON-DESTRUCTIVE</span>
              </div>
              <img
                className="inspector-image-preview"
                src={selected.imageData}
                alt="Selected canvas image"
              />
              <label className="image-fit-select">
                <span>FIT</span>
                <select
                  value={selected.imageFit ?? "cover"}
                  onChange={(event) =>
                    set({
                      imageFit: event.target.value as CanvasObject["imageFit"],
                    })
                  }
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                  <option value="fill">Fill</option>
                </select>
              </label>
              <ImageSlider
                label="Brightness"
                value={selected.brightness ?? 100}
                onChange={(brightness) => set({ brightness })}
              />
              <ImageSlider
                label="Contrast"
                value={selected.contrast ?? 100}
                onChange={(contrast) => set({ contrast })}
              />
              <ImageSlider
                label="Saturation"
                value={selected.saturation ?? 100}
                onChange={(saturation) => set({ saturation })}
              />
              <span className="crop-heading">CROP MARGINS</span>
              <ImageSlider
                label="Left"
                value={(selected.cropLeft ?? 0) * 100}
                max={45}
                onChange={(value) => set({ cropLeft: value / 100 })}
              />
              <ImageSlider
                label="Top"
                value={(selected.cropTop ?? 0) * 100}
                max={45}
                onChange={(value) => set({ cropTop: value / 100 })}
              />
              <ImageSlider
                label="Right"
                value={(selected.cropRight ?? 0) * 100}
                max={45}
                onChange={(value) => set({ cropRight: value / 100 })}
              />
              <ImageSlider
                label="Bottom"
                value={(selected.cropBottom ?? 0) * 100}
                max={45}
                onChange={(value) => set({ cropBottom: value / 100 })}
              />
              <a
                className="button-secondary image-download-button"
                href={selected.imageData}
                download={selected.name || "forma-image"}
              >
                Download image
              </a>
              <div className="image-credit">
                <strong>{selected.name}</strong>
                {selected.creator && <span>By {selected.creator}</span>}
                {selected.license && <span>License: {selected.license}</span>}
                {selected.source && (
                  <a
                    href={selected.source}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View image source
                  </a>
                )}
                {selected.licenseUrl && (
                  <a
                    href={selected.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Review license terms
                  </a>
                )}
              </div>
            </section>
          )}
          <section className="inspector-section">
            <button
              className="section-title"
              onClick={() => setAppearanceOpen(!appearanceOpen)}
            >
              <span>APPEARANCE</span>
              <ChevronDown
                size={14}
                className={appearanceOpen ? "" : "rotated"}
              />
            </button>
            {appearanceOpen && (
              <>
                {selected.type !== "line" &&
                  selected.type !== "arrow" &&
                  selected.type !== "frame" &&
                  selected.type !== "image" && (
                    <div className="color-row">
                      <span>Fill</span>
                      <label className="color-picker">
                        <span
                          className="color-swatch"
                          style={{
                            background:
                              selected.fill === "transparent"
                                ? "repeating-conic-gradient(#777 0 25%, #333 0 50%) 50% / 8px 8px"
                                : selected.fill,
                          }}
                        />
                        <input
                          aria-label="Fill color"
                          type="color"
                          value={
                            selected.fill === "transparent"
                              ? "#101014"
                              : selected.fill
                          }
                          onChange={(event) =>
                            set({ fill: event.target.value })
                          }
                        />
                      </label>
                      <input
                        className="hex-input"
                        value={selected.fill}
                        onChange={(event) => set({ fill: event.target.value })}
                        aria-label="Fill hex value"
                      />
                    </div>
                  )}
                {selected.type !== "image" && (
                  <div className="color-row">
                    <span>Stroke</span>
                    <label className="color-picker">
                      <span
                        className="color-swatch"
                        style={{ background: selected.stroke }}
                      />
                      <input
                        aria-label="Stroke color"
                        type="color"
                        value={
                          selected.stroke.startsWith("#")
                            ? selected.stroke
                            : "#000000"
                        }
                        onChange={(event) =>
                          set({ stroke: event.target.value })
                        }
                      />
                    </label>
                    <input
                      className="hex-input"
                      value={selected.stroke}
                      onChange={(event) => set({ stroke: event.target.value })}
                      aria-label="Stroke hex value"
                    />
                  </div>
                )}
                {selected.type !== "image" && (
                  <Field
                    label="Stroke width"
                    value={selected.strokeWidth}
                    onChange={(strokeWidth) =>
                      set({ strokeWidth: Math.max(0, strokeWidth) })
                    }
                  />
                )}
                <label className="opacity-row">
                  <span>Opacity</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selected.opacity}
                    onChange={(event) =>
                      set({ opacity: Number(event.target.value) })
                    }
                  />
                  <span>{Math.round(selected.opacity * 100)}%</span>
                </label>
              </>
            )}
          </section>
        </>
      ) : (
        <div className="inspector-empty">
          <div className="empty-cross">⌖</div>
          <strong>Nothing selected</strong>
          <span>Select an object to edit its properties.</span>
        </div>
      )}
      <section className="layers-section">
        <button
          className="section-title"
          onClick={() => setLayersOpen(!layersOpen)}
        >
          <span>
            <Layers3 size={14} /> LAYERS <small>{objects.length}</small>
          </span>
          <ChevronDown size={14} className={layersOpen ? "" : "rotated"} />
        </button>
        {layersOpen && (
          <div className="layer-list">
            {[...objects].reverse().map((object) => (
              <button
                key={object.id}
                className={`layer-row ${selection.includes(object.id) ? "selected" : ""}`}
                onClick={() => onSelect([object.id])}
              >
                <span className={`layer-glyph glyph-${object.type}`}>
                  {object.type === "ellipse"
                    ? "◯"
                    : object.type === "text"
                      ? "T"
                      : object.type === "line"
                        ? "╱"
                        : object.type === "arrow"
                          ? "↗"
                          : object.type === "frame"
                            ? "▣"
                            : object.type === "image"
                              ? "▧"
                              : "□"}
                </span>
                <span className="layer-name">{object.name}</span>
                <span className="layer-visible">·</span>
              </button>
            ))}
            {!objects.length && (
              <p className="layers-empty">Your objects will appear here.</p>
            )}
          </div>
        )}
      </section>
    </aside>
  );
}
