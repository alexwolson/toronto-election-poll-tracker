/**
 * Deterministic LOESS smoother (local linear regression, tricube weights) for the
 * polling trend chart. One fixed configuration, applied identically to every
 * candidate — a descriptive smoother over raw polls, not a polling average and
 * not the forecast. Pure and side-effect free (tested in loess.test.ts).
 */

export interface LoessPoint {
  x: number;
  y: number;
}

/** The single fixed configuration (documented, not tuned to any chart output). */
export const LOESS_CONFIG = {
  /** fraction of observations in each local window */
  span: 0.6,
  /** distinct x-values needed for a defensible fit; fewer → no curve */
  minPoints: 5,
  /** points on the output curve, evenly spaced across the observed x-range */
  gridSize: 40,
} as const;

function tricube(u: number): number {
  if (u >= 1) return 0;
  const t = 1 - u * u * u;
  return t * t * t;
}

/**
 * Fit a LOESS curve to `points`, evaluated on an even grid across the observed
 * x-range (no extrapolation). Returns null when there are too few distinct
 * x-values for a defensible fit.
 */
export function loessCurve(
  points: LoessPoint[],
  config: typeof LOESS_CONFIG = LOESS_CONFIG,
): LoessPoint[] | null {
  const distinctX = new Set(points.map((p) => p.x));
  if (distinctX.size < config.minPoints) return null;

  const pts = [...points].sort((a, b) => a.x - b.x);
  const n = pts.length;
  const minX = pts[0].x;
  const maxX = pts[n - 1].x;
  if (maxX === minX) return null;

  // Local window size: at least 2 points, at most all of them.
  const window = Math.max(2, Math.min(n, Math.ceil(config.span * n)));

  const curve: LoessPoint[] = [];
  for (let g = 0; g < config.gridSize; g++) {
    const x0 = minX + ((maxX - minX) * g) / (config.gridSize - 1);
    // Bandwidth = distance to the window-th nearest observation.
    const distances = pts.map((p) => Math.abs(p.x - x0)).sort((a, b) => a - b);
    const h = distances[window - 1] || 1e-9;

    let sw = 0;
    let swx = 0;
    let swy = 0;
    let swxx = 0;
    let swxy = 0;
    for (const p of pts) {
      const w = tricube(Math.abs(p.x - x0) / h);
      if (w === 0) continue;
      sw += w;
      swx += w * p.x;
      swy += w * p.y;
      swxx += w * p.x * p.x;
      swxy += w * p.x * p.y;
    }

    const denom = sw * swxx - swx * swx;
    let yhat: number;
    if (Math.abs(denom) < 1e-12) {
      yhat = sw > 0 ? swy / sw : 0; // degenerate window → weighted mean
    } else {
      const slope = (sw * swxy - swx * swy) / denom;
      const intercept = (swy - slope * swx) / sw;
      yhat = intercept + slope * x0;
    }
    curve.push({ x: x0, y: yhat });
  }
  return curve;
}
