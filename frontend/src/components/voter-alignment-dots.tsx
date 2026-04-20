// frontend/src/components/voter-alignment-dots.tsx
import type { PoolModel } from "@/lib/api";
import { computeDotCounts } from "@/lib/dot-counts";

type DotVariant =
  | "chow-floor"
  | "chow-ceiling"
  | "anti-available"
  | "anti-committed"
  | "disengaged";

const VARIANT_CLASSES: Record<DotVariant, string> = {
  "chow-floor":     "bg-[#2563eb]",
  "chow-ceiling":   "bg-transparent border-[1.5px] border-dashed border-[#6898c4]",
  "anti-available": "bg-transparent border-[1.5px] border-dashed border-[#c53030]",
  "anti-committed": "bg-[#c53030]",
  "disengaged":     "bg-[#c8c4be]",
};

function Dot({ variant }: { variant: DotVariant }) {
  const base = "block rounded-full box-border flex-shrink-0";
  const size = "w-[20px] h-[20px]";
  return <span className={`${base} ${size} ${VARIANT_CLASSES[variant]}`} />;
}

function makeDots(count: number, variant: DotVariant) {
  return Array.from({ length: count }, (_, i) => (
    <Dot key={i} variant={variant} />
  ));
}

const GRID_STYLE: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(10, 20px)",
  gridTemplateRows: "repeat(5, 20px)",
  gap: "4px",
  gridAutoFlow: "column",
  flexShrink: 0,
};

const DISENGAGED_GRID_STYLE: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(10, 20px)",
  gridTemplateRows: "repeat(2, 20px)",
  gap: "4px",
  gridAutoFlow: "column",
};

function LegendItem({ variant, label, count, description }: {
  variant: DotVariant;
  label: string;
  count: number;
  description: string;
}) {
  const size = "w-[14px] h-[14px]";
  const base = "inline-block rounded-full flex-shrink-0 mt-[1px] box-border";
  const approxK = count * 5;
  return (
    <div className="flex items-start gap-[8px]">
      <span className={`${base} ${size} ${VARIANT_CLASSES[variant]}`} />
      <span className="font-mono text-[11px] text-[#333] leading-[1.4]">
        <strong>{label}</strong> — ~{approxK}K
        <br />
        <em className="text-[#666] font-[family-name:var(--font-newsreader)]">{description}</em>
      </span>
    </div>
  );
}

export function VoterAlignmentDots({ model }: { model: PoolModel | null }) {
  if (!model) {
    return (
      <div>
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
          Mayoral Race
        </p>
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const { chowFloor, chowCeiling, antiAvailable, antiCommitted, notEngaged } =
    computeDotCounts(model);

  return (
    <div className="p-6 md:p-8">
      {/* Kicker */}
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#c53030] font-semibold mb-[4px]">
        Mayoral Race · Voter Alignment · Pre-nomination
      </p>

      {/* Title row */}
      <div className="flex justify-between items-baseline border-b-2 border-[#1a1a1a] pb-[8px] mb-[20px]">
        <div className="font-heading text-[26px] font-bold text-[#1a1a1a]">
          Where Toronto voters sit
        </div>
        <div className="font-mono text-[11px] italic text-[#555]">
          Each dot ≈ 5,000 voters
        </div>
      </div>

      {/* Zone labels */}
      <div className="flex mb-[8px] items-end gap-0">
        <div style={{ flex: "0 0 calc(10 * 20px + 9 * 4px)" }}>
          <div className="font-mono text-[11px] font-bold text-[#2563eb] uppercase tracking-[0.08em] mb-[2px]">
            "Chow was better"
          </div>
          <div className="font-mono text-[10px] text-[#555]">~250K · pro-Chow bloc</div>
        </div>
        <div style={{ width: "52px" }} />
        <div style={{ flex: "0 0 calc(10 * 20px + 9 * 4px)" }}>
          <div className="font-mono text-[11px] font-bold text-[#c53030] uppercase tracking-[0.08em] mb-[2px]">
            "Tory was better"
          </div>
          <div className="font-mono text-[10px] text-[#555]">~150K active · Bradford base</div>
        </div>
      </div>

      {/* Main dot row */}
      <div className="flex items-start mb-[8px]">
        {/* Pro-Chow grid */}
        <div style={GRID_STYLE}>
          {makeDots(chowFloor, "chow-floor")}
          {makeDots(chowCeiling, "chow-ceiling")}
        </div>

        {/* 50% divider: h = 5 rows × 20px + 4 gaps × 4px = 116px */}
        <div className="flex-shrink-0 relative" style={{ width: "52px", height: "116px" }}>
          <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-[#1a1a1a] -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#faf9f6] px-[4px] py-[2px]">
            <div className="font-mono text-[11px] font-bold text-[#1a1a1a] whitespace-nowrap">
              50%
            </div>
          </div>
        </div>

        {/* Anti-Chow grid */}
        <div style={GRID_STYLE}>
          {makeDots(antiAvailable, "anti-available")}
          {makeDots(antiCommitted, "anti-committed")}
        </div>
      </div>

      {/* Not yet engaged section */}
      <div className="mt-[18px]">
        <div className="border-t border-dashed border-[#bbb] pt-[12px] flex items-start gap-[20px]">
          <div>
            <div className="font-mono text-[11px] text-[#666] font-semibold uppercase tracking-[0.08em] mb-[8px] whitespace-nowrap">
              Not yet engaged · ~100K
            </div>
            <div style={DISENGAGED_GRID_STYLE}>
              {makeDots(notEngaged, "disengaged")}
            </div>
          </div>
          <div className="pt-[2px] font-[family-name:var(--font-newsreader)] text-[11px] text-[#666] leading-[1.55] italic max-w-[220px]">
            Hasn't formed a strong view on Chow. Not currently part of the active
            contest — how they break will depend on the campaign.
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="border-t border-[#ccc] pt-[12px] mt-[18px] grid grid-cols-2 gap-x-[24px] gap-y-[7px]">
        <LegendItem
          variant="chow-floor"
          label="Chow floor"
          count={chowFloor}
          description="Votes Chow regardless of field"
        />
        <LegendItem
          variant="anti-committed"
          label="Anti-Chow, committed"
          count={antiCommitted}
          description="Behind Bradford"
        />
        <LegendItem
          variant="chow-ceiling"
          label="Chow ceiling"
          count={chowCeiling}
          description="Leans Chow; H2H behaviour unknown"
        />
        <LegendItem
          variant="anti-available"
          label="Anti-Chow, available"
          count={antiAvailable}
          description="Opposes Chow; no challenger picked"
        />
      </div>
    </div>
  );
}
