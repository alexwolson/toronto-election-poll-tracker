import { RouteTabs } from "@/components/route-tabs";
import { TRUSTEE_BOARD_NAV } from "@/lib/trustees";
import type { TrusteeBoardId } from "@/types/feeds";

const TRUSTEE_BOARD_TABS = TRUSTEE_BOARD_NAV.map((board) => ({
  id: board.boardId,
  href: `/trustees/${board.boardId}`,
  label: board.shortName,
}));

export function TrusteeBoardTabs({ activeBoard }: { activeBoard: TrusteeBoardId }) {
  return (
    <RouteTabs label="School boards" items={TRUSTEE_BOARD_TABS} activeId={activeBoard} />
  );
}
