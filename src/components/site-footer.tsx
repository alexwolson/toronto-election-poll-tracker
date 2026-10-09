import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap foot__grid">
        <div>
          <Link href="/" className="foot__brand">
            <Image src="/brand/chw-mark-64.png" alt="" width={30} height={30} />
            <span>City Hall Watcher</span>
          </Link>
          <p className="foot__blurb">
            Toronto Election 2026<br />
            Evidence-first municipal election guide
          </p>
        </div>
        <nav aria-label="Election pages">
          <h4>The election</h4>
          <ul>
            <li><Link href="/results">Election night results</Link></li>
            <li><Link href="/">Mayoral forecast</Link></li>
            <li><Link href="/polls">Mayoral polls</Link></li>
            <li><Link href="/candidates">Mayoral candidates</Link></li>
            <li><Link href="/wards">Council races</Link></li>
            <li><Link href="/trustees">Trustee races</Link></li>
          </ul>
        </nav>
        <nav aria-label="About the guide">
          <h4>Behind the numbers</h4>
          <ul>
            <li><Link href="/how-it-works">How it works</Link></li>
            <li><Link href="/how-it-works#sources">Sources and definitions</Link></li>
            <li><a href="https://cityhallwatcher.com/">City Hall Watcher ↗</a></li>
          </ul>
        </nav>
      </div>
      <div className="wrap foot__legal">Toronto’s municipal election · October 26, 2026</div>
    </footer>
  );
}
