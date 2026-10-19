/**
 * Review builds only (`NEXT_PUBLIC_REVIEW_STEPS=1`, the `review/count-steps` branch, never
 * merged): the results pages read fixed snapshots of a clean mock night from
 * `public/review/<step>/store.json` instead of `/live/`, so the design can be seen at each
 * point in the count. Each snapshot holds the store's raw values, and the page serves them
 * through the route's own `serveLive` and `serveHistory`, with a heartbeat of now.
 */

export const REVIEW = process.env.NEXT_PUBLIC_REVIEW_STEPS === "1";

export const REVIEW_STEPS = [
  { id: "before", label: "Before 8 p.m." },
  { id: "0", label: "0%" },
  { id: "10", label: "13%" },
  { id: "25", label: "26%" },
  { id: "50", label: "52%" },
  { id: "75", label: "77%" },
  { id: "100", label: "100%" },
  { id: "closed", label: "Night Close" },
] as const;

const KEY = "review-step";

/** The step in the URL's `?step=`, else the last one chosen this session, else 52%. */
export function reviewStep(): string {
  const ids: readonly string[] = REVIEW_STEPS.map((s) => s.id);
  const fromUrl = new URLSearchParams(window.location.search).get("step");
  if (fromUrl && ids.includes(fromUrl)) {
    try {
      sessionStorage.setItem(KEY, fromUrl);
    } catch {}
    return fromUrl;
  }
  try {
    const kept = sessionStorage.getItem(KEY);
    if (kept && ids.includes(kept)) return kept;
  } catch {}
  return "50";
}

export interface ReviewStore {
  payload: string;
  night_close: string | null;
  history: string[];
}
