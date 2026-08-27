import Link from "next/link";
import { TRUSTEE_BOARD_NAV } from "@/lib/trustees";
import type { TrusteeBoardId } from "@/types/feeds";

export function TrusteeBoardTabs({ activeBoard }: { activeBoard: TrusteeBoardId }) {
  return (
    <nav className="trustee-board-tabs" aria-label="School boards">
      {TRUSTEE_BOARD_NAV.map((board) => (
        <Link
          key={board.boardId}
          href={`/trustees/${board.boardId}`}
          className={`trustee-board-tab${activeBoard === board.boardId ? " trustee-board-tab--active" : ""}`}
          aria-current={activeBoard === board.boardId ? "page" : undefined}
        >
          {board.shortName}
        </Link>
      ))}
    </nav>
  );
}
