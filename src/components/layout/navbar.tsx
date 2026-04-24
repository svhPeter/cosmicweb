"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { navigation, site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CosmosMark } from "@/components/layout/cosmos-mark";

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-[background,border-color,backdrop-filter]",
        scrolled
          ? "border-b border-border bg-background/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="container flex h-16 items-center gap-8">
        <Link href="/" className="flex items-center gap-2.5 group" aria-label={`${site.name} — home`}>
          <CosmosMark className="h-7 w-7" />
          <span className="font-display text-xl tracking-tight">{site.name}</span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-1 text-sm text-muted-foreground"
        >
          {navigation.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative px-3 py-2 rounded-full transition-colors",
                  active ? "text-foreground" : "hover:text-foreground"
                )}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-3 -bottom-0.5 h-px bg-accent/60" aria-hidden />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/about">What is Cosmos?</Link>
          </Button>
          <Button asChild size="sm" variant="accent" className="hidden sm:inline-flex">
            <Link href="/explore">Launch explorer</Link>
          </Button>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Toggle navigation"
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-white/5"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path
                d={open ? "M3 3l10 10M13 3L3 13" : "M2 4h12M2 8h12M2 12h12"}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl"
        >
          <div className="container py-4 flex flex-col">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="py-3 text-base text-foreground/90 hover:text-foreground border-b border-border/60 last:border-b-0"
              >
                {item.label}
              </Link>
            ))}
            <Button asChild size="md" variant="accent" className="mt-4">
              <Link href="/explore">Launch explorer</Link>
            </Button>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
