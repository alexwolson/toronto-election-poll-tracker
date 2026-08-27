import type {
  CouncilRaceCardsFeed,
  TrusteeBoard,
  TrusteeBoardId,
  TrusteeRaceCardsFeed,
  TrusteeRaceContext,
  TrusteeWard,
} from "@/types/feeds";

export const TRUSTEE_BOARD_NAV: ReadonlyArray<{
  boardId: TrusteeBoardId;
  shortName: string;
  displayName: string;
  wards: readonly string[];
}> = [
  {
    boardId: "tdsb",
    shortName: "TDSB",
    displayName: "Toronto District School Board",
    wards: Array.from({ length: 12 }, (_, index) => String(index + 1)),
  },
  {
    boardId: "tcdsb",
    shortName: "TCDSB",
    displayName: "Toronto Catholic District School Board",
    wards: Array.from({ length: 12 }, (_, index) => String(index + 1)),
  },
  {
    boardId: "viamonde",
    shortName: "Viamonde",
    displayName: "Conseil scolaire Viamonde",
    wards: ["2", "3", "4"],
  },
  {
    boardId: "monavenir",
    shortName: "MonAvenir",
    displayName: "Conseil scolaire catholique MonAvenir",
    wards: ["3", "4"],
  },
];

export function isTrusteeBoardId(value: string): value is TrusteeBoardId {
  return TRUSTEE_BOARD_NAV.some((board) => board.boardId === value);
}

export function trusteeBoardFallback(boardId: TrusteeBoardId) {
  return TRUSTEE_BOARD_NAV.find((board) => board.boardId === boardId)!;
}

export function trusteeBoard(
  feed: TrusteeRaceCardsFeed,
  boardId: TrusteeBoardId,
): TrusteeBoard | undefined {
  return feed.boards.find((board) => board.board_id === boardId);
}

export function trusteeWard(
  board: TrusteeBoard | undefined,
  wardId: string,
): TrusteeWard | undefined {
  return board?.wards.find((ward) => ward.ward_id === wardId);
}

export function isExpectedTrusteeWard(boardId: TrusteeBoardId, wardId: string): boolean {
  return trusteeBoardFallback(boardId).wards.includes(wardId);
}

function joinedNames(labels: string[]): string {
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

export function cityWardAreaNames(
  cityWards: number[],
  council: CouncilRaceCardsFeed,
): string[] {
  const names = cityWards.map((ward) => council.wards[String(ward)]?.ward_name?.trim());
  if (names.some((name) => !name)) return [];
  return names as string[];
}

export function cityWardsLabel(
  cityWards: number[],
  council?: CouncilRaceCardsFeed,
): string {
  if (council) {
    const names = cityWardAreaNames(cityWards, council);
    if (names.length === cityWards.length) return joinedNames(names);
  }
  const labels = cityWards.map(String);
  if (labels.length === 1) return `City Ward ${labels[0]}`;
  if (labels.length === 2) return `City Wards ${labels[0]} and ${labels[1]}`;
  return `City Wards ${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

export function incumbentTrustees(ward: TrusteeWard) {
  return ward.candidates.filter((candidate) => candidate.is_incumbent === true);
}

export type TrusteeRaceContextCategory = TrusteeRaceContext["category"];

const TRUSTEE_RACE_CONTEXT_LABEL: Record<TrusteeRaceContextCategory, string> = {
  open: "Open race",
  two_incumbents: "Two incumbents",
  one_incumbent: "One incumbent",
  won_without_majority: "Won without a majority",
  contested_incumbent: "",
  acclaimed: "Elected by acclamation",
};

export function trusteeRaceContextLabel(category: TrusteeRaceContextCategory): string {
  return TRUSTEE_RACE_CONTEXT_LABEL[category];
}

export function trusteeRaceContextClass(category: TrusteeRaceContextCategory): string {
  return category.replaceAll("_", "-");
}

export function showTrusteeRaceContextTag(category: TrusteeRaceContextCategory): boolean {
  return category !== "contested_incumbent";
}

export function trusteeFieldStatus(ward: TrusteeWard): string {
  if (ward.acclaimed) return "Elected by acclamation";
  const count = ward.candidates.length;
  return `${count} ${count === 1 ? "candidate" : "candidates"}`;
}
