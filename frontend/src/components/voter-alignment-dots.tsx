// frontend/src/components/voter-alignment-dots.tsx
import type { PoolModel } from "@/lib/api";
import { computeDotCounts } from "@/lib/dot-counts";
import type { DotCounts } from "@/lib/dot-counts";

type DotVariant =
  | "chow-floor"
  | "chow-ceiling"
  | "anti-available"
  | "anti-committed"
  | "disengaged";

function Dot({ variant }: { variant: DotVariant }) {
  const base = "block rounded-full box-border flex-shrink-0";
  const size = "w-[14px] h-[14px]";
  const styles: Record<DotVariant, string> = {
    "chow-floor":     "bg-[#2563eb]",
    "chow-ceiling":   "bg-transparent border-[1.5px] border-dashed border-[#6898c4]",
    "anti-available": "bg-transparent border-[1.5px] border-dashed border-[#c53030]",
    "anti-committed": "bg-[#c53030]",
    "disengaged":     "bg-[#c8c4be]",
  };
  return <span className={`${base} ${size} ${styles[variant]}`} />;
}

function makeDots(count: number, variant: DotVariant) {
  return Array.from({ length: count }, (_, i) => (
    <Dot key={i} variant={variant} />
  ));
}

const GRID_STYLE: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(10, 14px)",
  gridTemplateRows: "repeat(5, 14px)",
  gap: "3px",
  gridAutoFlow: "column",
  flexShrink: 0,
};

const DISENGAGED_GRID_STYLE: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(10, 14px)",
  gridTemplateRows: "repeat(2, 14px)",
  gap: "3px",
  gridAutoFlow: "column",
};

function LegendItem({
  variant,
  label,
  count,
  description,
}: {
  variant: DotVariant;
  label: string;
  count: number;
  description: string;
}) {
  const size = "w-[11px] h-[11px]";
  const base = "inline-block rounded-full flex-shrink-0 mt-[1px] box-border";
  const styles: Record<DotVariant, string> = {
    "chow-floor":     "bg-[#2563eb]",
    "chow-ceiling":   "bg-transparent border-[1.5px] border-dashed border-[#6898c4]",
    "anti-available": "bg-transparent border-[1.5px] border-dashed border-[#c53030]",
    "anti-committed": "bg-[#c53030]",
    "disengaged":     "bg-[#c8c4be]",
  };
  const approxK = count * 5;
  return (
    <div className="flex items-start gap-[6px]">
      <span className={`${base} ${size} ${styles[variant]}`} />
      <span className="font-mono text-[6.5px] text-[#444] leading-[1.4]">
        <strong>{label}</strong> — ~{approxK}K
        <br />
        <em className="text-[#999] font-[family-name:var(--font-newsreader)]">{description}</em>
      </span>
    </div>
  );
}

export function VoterAlignmentDots({ model }: { model: PoolModel | null }) {
  if (!model) {
    return (
      <div className="surface-panel p-6 md:p-8">
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
    <div className="surface-panel p-6 md:p-8 inline-block">
      {/* Kicker */}
      <p className="font-mono text-[7px] uppercase tracking-[0.12em] text-[#c53030] font-semibold mb-[3px]">
        Mayoral Race · Voter Alignment · Pre-nomination
      </p>

      {/* Title row */}
      <div className="flex justify-between items-baseline border-b-2 border-[#1a1a1a] pb-[6px] mb-[18px] w-[378px]">
        <div className="font-heading text-[18px] font-bold text-[#1a1a1a]">
          Where Toronto voters sit
        </div>
        <div className="font-mono text-[6.5px] italic text-[#888]">
          Each dot ≈ 5,000 voters
        </div>
      </div>

      {/* Zone labels */}
      <div className="flex w-[378px] mb-[6px] items-end gap-0">
        <div className="w-[167px]">
          <div className="font-mono text-[6.5px] font-bold text-[#2563eb] uppercase tracking-[0.08em] mb-[1px]">
            "Chow was better"
          </div>
          <div className="font-mono text-[6px] text-[#888]">~250K · pro-Chow bloc</div>
        </div>
        <div className="w-[44px]" />
        <div className="w-[167px]">
          <div className="font-mono text-[6.5px] font-bold text-[#c53030] uppercase tracking-[0.08em] mb-[1px]">
            "Tory was better"
          </div>
          <div className="font-mono text-[6px] text-[#888]">~150K active · Bradford / Furey base</div>
        </div>
      </div>

      {/* Main dot row */}
      <div className="flex items-start w-[378px] mb-[6px]">
        {/* Pro-Chow grid */}
        <div style={GRID_STYLE}>
          {makeDots(chowFloor, "chow-floor")}
          {makeDots(chowCeiling, "chow-ceiling")}
        </div>

        {/* 50% divider */}
        <div className="w-[44px] flex-shrink-0 relative h-[82px]">
          <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-[#1a1a1a] -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[color:var(--card)] px-[3px] py-[2px]">
            <div className="font-mono text-[6px] font-bold text-[#1a1a1a] whitespace-nowrap">
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
      <div className="w-[378px] mt-[14px]">
        <div className="border-t border-dashed border-[#bbb] pt-[10px] flex items-start gap-[16px]">
          <div>
            <div className="font-mono text-[6.5px] text-[#999] font-semibold uppercase tracking-[0.08em] mb-[6px] whitespace-nowrap">
              Not yet engaged · ~100K
            </div>
            <div style={DISENGAGED_GRID_STYLE}>
              {makeDots(notEngaged, "disengaged")}
            </div>
          </div>
          <div className="pt-[2px] font-[family-name:var(--font-newsreader)] text-[6.5px] text-[#999] leading-[1.55] italic max-w-[200px]">
            Hasn't formed a strong view on Chow. Not currently part of the active
            contest — how they break will depend on the campaign.
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="border-t border-[#ccc] pt-[10px] mt-[14px] w-[378px] grid grid-cols-2 gap-x-[20px] gap-y-[5px]">
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
          description="Behind Bradford or Furey"
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
