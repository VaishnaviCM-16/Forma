import type { CanvasObject } from '../domain/model';

export function exportBoard(title: string, objects: CanvasObject[]) {
  const payload = { format: 'forma-board-v1', title, exportedAt: new Date().toISOString(), objects };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'forma-board'}.json`;
  anchor.click(); URL.revokeObjectURL(url);
}
