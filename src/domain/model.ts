export type Tool =
  | "select"
  | "frame"
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "hand";
export type ShapeType =
  "frame" | "rectangle" | "ellipse" | "line" | "arrow" | "text" | "image";

export interface CanvasObject {
  id: string;
  type: ShapeType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  radius: number;
  text?: string;
  fontSize?: number;
  imageData?: string;
  imageFit?: "cover" | "contain" | "fill";
  creator?: string;
  license?: string;
  licenseUrl?: string;
  source?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  cropLeft?: number;
  cropTop?: number;
  cropRight?: number;
  cropBottom?: number;
}

export interface Point {
  x: number;
  y: number;
}
export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export const DEFAULT_FILL = "#b29aff";
export const DEFAULT_STROKE = "#d1c4ff";

export function normalizeRect(start: Point, end: Point) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function createObject(
  type: ShapeType,
  x: number,
  y: number,
  width = 180,
  height = 120,
): CanvasObject {
  const id = crypto.randomUUID();
  const names: Record<ShapeType, string> = {
    frame: "Frame",
    rectangle: "Rectangle",
    ellipse: "Ellipse",
    line: "Line",
    arrow: "Arrow",
    text: "Text",
    image: "Image",
  };
  return {
    id,
    type,
    name: `${names[type]} ${id.slice(0, 4)}`,
    x,
    y,
    width,
    height,
    rotation: 0,
    fill:
      type === "line" || type === "arrow" || type === "frame"
        ? "transparent"
        : DEFAULT_FILL,
    stroke: type === "frame" ? "#85818c" : DEFAULT_STROKE,
    strokeWidth: type === "frame" ? 1 : 2,
    opacity: 1,
    radius: type === "rectangle" ? 14 : 0,
    ...(type === "text"
      ? {
          text: "Ideas take shape",
          fontSize: 28,
          fill: "#f4f1f7",
          stroke: "transparent",
        }
      : {}),
    ...(type === "image"
      ? {
          imageFit: "cover" as const,
          brightness: 100,
          contrast: 100,
          saturation: 100,
          fill: "transparent",
          stroke: "transparent",
          strokeWidth: 0,
        }
      : {}),
  };
}

export function pointInObject(
  point: Point,
  object: CanvasObject,
  padding = 7,
): boolean {
  const cx = object.x + object.width / 2;
  const cy = object.y + object.height / 2;
  const angle = (-object.rotation * Math.PI) / 180;
  const dx = point.x - cx;
  const dy = point.y - cy;
  const x = dx * Math.cos(angle) - dy * Math.sin(angle) + cx;
  const y = dx * Math.sin(angle) + dy * Math.cos(angle) + cy;
  return (
    x >= object.x - padding &&
    x <= object.x + object.width + padding &&
    y >= object.y - padding &&
    y <= object.y + object.height + padding
  );
}
