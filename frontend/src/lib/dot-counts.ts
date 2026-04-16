import type { PoolModel } from "@/lib/api";

export type DotCounts = {
  chowFloor: number;       // solid blue dots, fills left portion of pro-Chow zone
  chowCeiling: number;     // hollow dashed blue dots, fills right of floor in pro-Chow zone (toward centre)
  antiAvailable: number;   // hollow dashed red dots, nearest centre in anti-Chow zone
  antiCommitted: number;   // solid red dots, fills outward from antiAvailable
  notEngaged: number;      // grey dots in below-the-line section (cap at 20)
};

const DOTS_PER_ZONE = 50;

function toDots(fraction: number, cap = DOTS_PER_ZONE): number {
  return Math.min(Math.max(Math.round(fraction * 100), 0), cap);
}

export function computeDotCounts(model: PoolModel): DotCounts {
  const chowFloor = toDots(model.pool.chow_floor);
  const chowCeiling = toDots(
    model.pool.chow_ceiling - model.pool.chow_floor,
    DOTS_PER_ZONE - chowFloor,
  );

  const antiAvailable = toDots(model.uncaptured_anti_chow);
  const antiCommitted = toDots(
    model.pool.anti_chow_pool - model.uncaptured_anti_chow,
    DOTS_PER_ZONE - antiAvailable,
  );

  const notEngaged = toDots(model.approval.not_sure, 20);

  return { chowFloor, chowCeiling, antiAvailable, antiCommitted, notEngaged };
}
