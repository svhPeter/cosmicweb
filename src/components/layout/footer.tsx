import Link from "next/link";

import { footerLinks, site } from "@/lib/site";
import { CosmosMark } from "@/components/layout/cosmos-mark";

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-border bg-panel/30">
      <div className="container py-16 grid gap-12 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div className="max-w-sm">
          <Link href="/" className="flex items-center gap-2.5">
            <CosmosMark className="h-7 w-7" />
            <span className="font-display text-xl tracking-tight">{site.name}</span>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            {site.tagline} Built for space lovers, students, teachers, and the endlessly curious.
          </p>
          <p className="mt-6 text-xs text-muted-foreground/70">
            Cosmos references publicly available scientific data from NASA, JPL, ESA and the open
            space community. Nothing on this site is affiliated with those organisations.
          </p>
        </div>
        {footerLinks.map((group) => (
          <div key={group.heading}>
            <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {group.heading}
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-foreground/80 hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {site.name}. A premium platform for space exploration and learning.</p>
          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft" aria-hidden />
            Updated daily · grounded in primary sources
          </p>
        </div>
      </div>
    </footer>
  );
}
