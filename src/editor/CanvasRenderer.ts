import type { Camera, CanvasObject, Point } from "../domain/model";
import type { Peer } from "../collaboration/provider";

export interface RenderState {
  objects: CanvasObject[];
  camera: Camera;
  selection: string[];
  peers: Peer[];
  preview?: { type: CanvasObject["type"]; start: Point; end: Point };
  onFps?: (fps: number) => void;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
}

function drawObject(
  ctx: CanvasRenderingContext2D,
  object: CanvasObject,
  getImage: (data: string) => HTMLImageElement | undefined,
) {
  ctx.save();
  ctx.globalAlpha = object.opacity;
  const cx = object.x + object.width / 2;
  const cy = object.y + object.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate((object.rotation * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  ctx.lineWidth = object.strokeWidth;
  ctx.strokeStyle = object.stroke;
  ctx.fillStyle = object.fill;
  if (object.type === "image") {
    const image = object.imageData ? getImage(object.imageData) : undefined;
    roundedRect(ctx, object.x, object.y, object.width, object.height, 8);
    ctx.clip();
    if (image?.complete && image.naturalWidth) {
      let sx = (object.cropLeft ?? 0) * image.naturalWidth;
      let sy = (object.cropTop ?? 0) * image.naturalHeight;
      let sw =
        (1 - (object.cropLeft ?? 0) - (object.cropRight ?? 0)) *
        image.naturalWidth;
      let sh =
        (1 - (object.cropTop ?? 0) - (object.cropBottom ?? 0)) *
        image.naturalHeight;
      if (object.imageFit === "cover") {
        const ratio = object.width / object.height;
        const sourceRatio = sw / sh;
        if (sourceRatio > ratio) {
          const next = sh * ratio;
          sx += (sw - next) / 2;
          sw = next;
        } else {
          const next = sw / ratio;
          sy += (sh - next) / 2;
          sh = next;
        }
      }
      ctx.filter = `brightness(${object.brightness ?? 100}%) contrast(${object.contrast ?? 100}%) saturate(${object.saturation ?? 100}%)`;
      if (object.imageFit === "contain") {
        const scale = Math.min(object.width / sw, object.height / sh);
        const dw = sw * scale;
        const dh = sh * scale;
        ctx.drawImage(
          image,
          sx,
          sy,
          sw,
          sh,
          object.x + (object.width - dw) / 2,
          object.y + (object.height - dh) / 2,
          dw,
          dh,
        );
      } else
        ctx.drawImage(
          image,
          sx,
          sy,
          sw,
          sh,
          object.x,
          object.y,
          object.width,
          object.height,
        );
    } else {
      ctx.fillStyle = "#292731";
      ctx.fillRect(object.x, object.y, object.width, object.height);
      ctx.fillStyle = "#ebe7f1";
      ctx.font = "500 14px Manrope";
      ctx.fillText(
        "Loading image…",
        object.x + 12,
        object.y + 24,
        object.width - 24,
      );
    }
  } else if (object.type === "text") {
    ctx.fillStyle = object.fill;
    ctx.font = `600 ${object.fontSize ?? 26}px Manrope, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(
      object.text ?? "",
      object.x,
      object.y,
      Math.max(20, object.width),
    );
  } else if (object.type === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(
      object.x + object.width / 2,
      object.y + object.height / 2,
      Math.max(1, object.width / 2),
      Math.max(1, object.height / 2),
      0,
      0,
      Math.PI * 2,
    );
    if (object.fill !== "transparent") ctx.fill();
    if (object.stroke !== "transparent" && object.strokeWidth > 0) ctx.stroke();
  } else if (object.type === "line" || object.type === "arrow") {
    const x2 = object.x + object.width;
    const y2 = object.y + object.height;
    ctx.beginPath();
    ctx.moveTo(object.x, object.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    if (object.type === "arrow") {
      const angle = Math.atan2(object.height, object.width);
      const head = Math.max(
        9,
        Math.min(16, 11 / Math.max(0.6, Math.abs(object.width) / 100)),
      );
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - head * Math.cos(angle - 0.45),
        y2 - head * Math.sin(angle - 0.45),
      );
      ctx.lineTo(
        x2 - head * Math.cos(angle + 0.45),
        y2 - head * Math.sin(angle + 0.45),
      );
      ctx.closePath();
      ctx.fillStyle = object.stroke;
      ctx.fill();
    }
  } else {
    roundedRect(
      ctx,
      object.x,
      object.y,
      object.width,
      object.height,
      object.type === "frame" ? 10 : object.radius,
    );
    if (object.fill !== "transparent") ctx.fill();
    if (object.stroke !== "transparent" && object.strokeWidth > 0) ctx.stroke();
    if (object.type === "frame") {
      ctx.save();
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = "#77727d";
      ctx.stroke();
      ctx.restore();
      ctx.font = '500 12px "DM Mono", monospace';
      ctx.fillStyle = "#a5a0ac";
      ctx.textBaseline = "bottom";
      ctx.fillText(object.name.toUpperCase(), object.x, object.y - 8);
    }
  }
  ctx.restore();
}

export class CanvasRenderer {
  private raf = 0;
  private dirty = true;
  private peerDirty = true;
  private state: RenderState = {
    objects: [],
    camera: { x: 0, y: 0, zoom: 1 },
    selection: [],
    peers: [],
  };
  private lastFrames = 0;
  private lastFpsTime = performance.now();
  private imageCache = new Map<string, HTMLImageElement>();
  private backgroundImage = new Image();
  private backgroundUrl = "";
  constructor(
    private canvas: HTMLCanvasElement,
    private peerCanvas: HTMLCanvasElement,
  ) {
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  setState(state: RenderState) {
    const previous = this.state;
    if (
      previous.objects !== state.objects ||
      previous.camera !== state.camera ||
      previous.selection !== state.selection ||
      previous.preview !== state.preview
    )
      this.dirty = true;
    if (
      previous.peers !== state.peers ||
      previous.camera !== state.camera ||
      previous.objects !== state.objects
    )
      this.peerDirty = true;
    this.state = state;
  }
  invalidate() {
    this.dirty = true;
    this.peerDirty = true;
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    this.imageCache.clear();
  }

  private getImage(data: string) {
    let image = this.imageCache.get(data);
    if (!image) {
      image = new Image();
      image.onload = () => this.invalidate();
      image.src = data;
      this.imageCache.set(data, image);
      while (this.imageCache.size > 30) {
        const first = this.imageCache.keys().next().value;
        if (!first) break;
        this.imageCache.delete(first);
      }
    }
    return image;
  }

  private loop() {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    this.lastFrames++;
    if (now - this.lastFpsTime > 1000) {
      this.state.onFps?.(
        Math.round((this.lastFrames * 1000) / (now - this.lastFpsTime)),
      );
      this.lastFrames = 0;
      this.lastFpsTime = now;
    }
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);
    if (
      this.canvas.width !== width ||
      this.canvas.height !== height ||
      this.peerCanvas.width !== width ||
      this.peerCanvas.height !== height
    ) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.peerCanvas.width = width;
      this.peerCanvas.height = height;
      this.dirty = true;
      this.peerDirty = true;
    }
    if (rect.width < 1 || rect.height < 1) return;
    if (this.dirty) this.drawDocument(rect.width, rect.height, dpr);
    if (this.peerDirty) this.drawPresence(rect.width, rect.height, dpr);
  }

  private drawDocument(width: number, height: number, dpr: number) {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    this.dirty = false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const styles = getComputedStyle(document.documentElement);
    const backgroundColor =
      styles.getPropertyValue("--canvas-bg").trim() || "#101014";
    const gridColor =
      styles.getPropertyValue("--canvas-grid").trim() ||
      "rgba(178,154,255,.26)";
    const accent =
      styles.getPropertyValue("--canvas-accent").trim() || "#b29aff";
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    const declaration = styles
      .getPropertyValue("--canvas-background-image")
      .trim();
    const backgroundUrl =
      declaration.match(/^url\([\"']?(.+?)[\"']?\)$/)?.[1] ?? "";
    if (backgroundUrl && backgroundUrl !== this.backgroundUrl) {
      this.backgroundUrl = backgroundUrl;
      this.backgroundImage.onload = () => this.invalidate();
      this.backgroundImage.src = backgroundUrl;
    }
    if (
      backgroundUrl &&
      this.backgroundImage.complete &&
      this.backgroundImage.naturalWidth
    ) {
      ctx.save();
      ctx.globalAlpha =
        Number(styles.getPropertyValue("--canvas-background-opacity").trim()) ||
        0.28;
      const scale = Math.max(
        width / this.backgroundImage.naturalWidth,
        height / this.backgroundImage.naturalHeight,
      );
      const w = this.backgroundImage.naturalWidth * scale;
      const h = this.backgroundImage.naturalHeight * scale;
      ctx.drawImage(
        this.backgroundImage,
        (width - w) / 2,
        (height - h) / 2,
        w,
        h,
      );
      ctx.restore();
    }
    const { camera } = this.state;
    ctx.fillStyle = gridColor;
    const grid = Math.max(8, 24 * camera.zoom);
    const offsetX = ((camera.x % grid) + grid) % grid;
    const offsetY = ((camera.y % grid) + grid) % grid;
    for (let x = offsetX; x < width; x += grid)
      for (let y = offsetY; y < height; y += grid) ctx.fillRect(x, y, 0.8, 0.8);
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);
    this.state.objects.forEach((object) =>
      drawObject(ctx, object, (data) => this.getImage(data)),
    );
    if (this.state.preview) {
      const { type, start, end } = this.state.preview;
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = accent;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5 / camera.zoom;
      if (type === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (type === "line" || type === "arrow") {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      } else if (type === "text") {
        ctx.font = `${26 / camera.zoom}px Manrope`;
        ctx.fillText("Text", x, y);
      } else {
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      }
      ctx.restore();
    }
    const selected = this.state.objects.filter((object) =>
      this.state.selection.includes(object.id),
    );
    if (selected.length) {
      const minX = Math.min(...selected.map((o) => o.x));
      const minY = Math.min(...selected.map((o) => o.y));
      const maxX = Math.max(...selected.map((o) => o.x + o.width));
      const maxY = Math.max(...selected.map((o) => o.y + o.height));
      ctx.save();
      ctx.strokeStyle = accent;
      ctx.fillStyle =
        styles.getPropertyValue("--canvas-selection").trim() || "#f4f1f7";
      ctx.lineWidth = 1 / camera.zoom;
      ctx.setLineDash([5 / camera.zoom, 3 / camera.zoom]);
      ctx.strokeRect(
        minX - 4 / camera.zoom,
        minY - 4 / camera.zoom,
        maxX - minX + 8 / camera.zoom,
        maxY - minY + 8 / camera.zoom,
      );
      ctx.setLineDash([]);
      const handle = 7 / camera.zoom;
      [
        [minX, minY],
        [maxX, minY],
        [minX, maxY],
        [maxX, maxY],
      ].forEach(([x, y]) => {
        ctx.fillRect(x - handle / 2, y - handle / 2, handle, handle);
      });
      const rotateX = (minX + maxX) / 2;
      const rotateY = minY - 20 / camera.zoom;
      ctx.beginPath();
      ctx.moveTo(rotateX, minY);
      ctx.lineTo(rotateX, rotateY);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rotateX, rotateY, 4 / camera.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // Ephemeral awareness changes repaint only this lightweight overlay, not the document/grid canvas.
  private drawPresence(width: number, height: number, dpr: number) {
    const ctx = this.peerCanvas.getContext("2d");
    if (!ctx) return;
    this.peerDirty = false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const { camera, peers, objects } = this.state;
    for (const peer of peers) {
      ctx.save();
      ctx.strokeStyle = peer.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      for (const id of peer.selection ?? []) {
        const object = objects.find((candidate) => candidate.id === id);
        if (!object) continue;
        const x = object.x * camera.zoom + camera.x;
        const y = object.y * camera.zoom + camera.y;
        ctx.strokeRect(
          x - 4,
          y - 4,
          object.width * camera.zoom + 8,
          object.height * camera.zoom + 8,
        );
      }
      ctx.setLineDash([]);
      if (peer.cursor) {
        const x = peer.cursor.x * camera.zoom + camera.x;
        const y = peer.cursor.y * camera.zoom + camera.y;
        ctx.translate(x, y);
        ctx.fillStyle = peer.color;
        ctx.strokeStyle =
          getComputedStyle(document.documentElement)
            .getPropertyValue("--canvas-bg")
            .trim() || "#101014";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 16);
        ctx.lineTo(4, 12);
        ctx.lineTo(8, 19);
        ctx.lineTo(11, 17);
        ctx.lineTo(7, 10);
        ctx.lineTo(13, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.font = "600 11px Manrope";
        const labelWidth = ctx.measureText(peer.name).width + 12;
        ctx.fillStyle = peer.color;
        ctx.beginPath();
        ctx.roundRect(9, 16, labelWidth, 20, 5);
        ctx.fill();
        ctx.fillStyle = "#17151d";
        ctx.fillText(peer.name, 15, 30);
      }
      ctx.restore();
    }
  }
}
