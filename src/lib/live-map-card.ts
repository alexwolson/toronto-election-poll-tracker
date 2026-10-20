/**
 * Where the results Map's ward card sits (live-projection #130): beside its point, below and to
 * the right by preference, flipping left near the right edge, and kept inside the map's stage.
 * With no room either side it centres on the point, below it if it fits, else above.
 */

export interface Size {
  w: number;
  h: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, Math.max(lo, hi)));

export function placeCard(
  point: { x: number; y: number },
  card: Size,
  box: Size,
  gap = 14,
  margin = 8,
): { left: number; top: number } {
  const right = point.x + gap;
  const left = point.x - gap - card.w;
  if (right + card.w <= box.w - margin || left >= margin) {
    return {
      left: right + card.w <= box.w - margin ? right : left,
      top: clamp(point.y + gap, margin, box.h - margin - card.h),
    };
  }
  const below = point.y + gap + card.h <= box.h - margin;
  return {
    left: clamp(point.x - card.w / 2, margin, box.w - margin - card.w),
    top: below ? point.y + gap : clamp(point.y - gap - card.h, margin, box.h - margin - card.h),
  };
}
