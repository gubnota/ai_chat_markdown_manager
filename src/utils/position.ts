export interface Point {
  x: number;
  y: number;
}
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
export const clamp = (n: number, low: number, high: number) =>
  Math.max(low, Math.min(n, Math.max(low, high)));
export const intersects = (a: Rect, b: Rect) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
export function sendRects(): Rect[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      '#composer-submit-button,[data-testid="send-button"],[data-testid="composer-send-button"],[data-testid="composer-submit-button"],button[aria-label="Send prompt"],button[aria-label="Send message"],button[aria-label="Send"],form button[type="submit"]',
    ),
  ]
    .filter((el) => !el.closest("#__safari_md_export_root__"))
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 12 && r.height > 12)
    .map((r) => ({
      left: r.left - 14,
      right: r.right + 14,
      top: r.top - 14,
      bottom: r.bottom + 14,
    }));
}
export function safePosition(
  point: Point,
  width: number,
  height: number,
  size = 44,
  reserved: Rect[] = [],
): Point {
  let x = clamp(Number.isFinite(point.x) ? point.x : 14, 8, width - size - 8),
    y = clamp(
      Number.isFinite(point.y) ? point.y : height * 0.4,
      8,
      height - size - 8,
    );
  const box = (cx: number, cy: number) => ({
    left: cx,
    top: cy,
    right: cx + size,
    bottom: cy + size,
  });
  if (reserved.some((r) => intersects(box(x, y), r))) {
    const choices = reserved.flatMap((r) => [
      { x, y: r.top - size - 8 },
      { x: r.left - size - 8, y },
      { x: r.right + 8, y },
      { x, y: r.bottom + 8 },
    ]);
    choices.push({ x: 14, y: Math.round(height * 0.4) });
    const free = choices
      .filter(
        (p) =>
          p.x >= 8 &&
          p.y >= 8 &&
          p.x + size <= width - 8 &&
          p.y + size <= height - 8 &&
          !reserved.some((r) => intersects(box(p.x, p.y), r)),
      )
      .sort(
        (a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y),
      );
    if (free[0]) ({ x, y } = free[0]);
  }
  return { x: Math.round(x), y: Math.round(y) };
}
export function panelPosition(
  point: Point,
  panelWidth: number,
  panelHeight: number,
  size = 44,
): Point {
  const x =
    point.x + size + 14 + panelWidth <= innerWidth - 12
      ? point.x + size + 14
      : point.x - panelWidth - 14;
  return {
    x: clamp(x, 12, innerWidth - panelWidth - 12),
    y: clamp(point.y - panelHeight * 0.4, 12, innerHeight - panelHeight - 12),
  };
}
