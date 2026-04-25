"use client";

import Image from "next/image";
import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";

export interface RealImageItem {
  id: string;
  src: string;
  alt: string;
  /** Short title shown inside the frame overlay. */
  title: string;
  /** e.g. "EHT · 10 April 2019" — one line of provenance. */
  provenance: string;
  /** Caption — one or two sentences of honest context. */
  caption: string;
  /** Full credit string — always rendered, never cropped off. */
  credit: string;
  /** Link to the source (licence page or press release). */
  sourceHref?: string;
  /** Optional dominant-colour fallback while the image loads. */
  backgroundColor?: string;
  width?: number;
  height?: number;
}

export interface RealImageGalleryProps {
  items: readonly RealImageItem[];
  /** Empty-state content. When `items` is empty, this block renders. */
  emptyState?: React.ReactNode;
  /** Number of columns at the `lg` breakpoint. Defaults to `items.length` capped at 2. */
  lgColumns?: 1 | 2;
  className?: string;
}

/**
 * Gallery for real photographic evidence — used on `/black-hole` for the
 * two EHT images (M87*, Sgr A*) and on `/wormhole` for the "what we
 * have seen" empty state, where the gallery is intentionally empty and
 * the emptiness is the point.
 *
 * Full attribution is part of every card, not an afterthought in a
 * footnote. The EHT releases the imagery under CC BY 4.0, which
 * requires credit next to the image — we make that credit a first-
 * class piece of copy because it also reinforces the product's
 * editorial voice (sourced, serious, honest).
 */
export function RealImageGallery({
  items,
  emptyState,
  lgColumns,
  className,
}: RealImageGalleryProps) {
  if (items.length === 0 && emptyState) {
    return (
      <div className={cn("mt-6", className)}>
        <div className="cosmos-panel overflow-hidden p-8 sm:p-12">{emptyState}</div>
      </div>
    );
  }

  const cols = lgColumns ?? (items.length >= 2 ? 2 : 1);
  return (
    <div
      className={cn(
        "grid gap-6",
        cols === 2 ? "lg:grid-cols-2" : "",
        className
      )}
    >
      {items.map((item) => (
        <figure
          key={item.id}
          className="cosmos-panel group flex flex-col overflow-hidden"
        >
          <div
            className="relative aspect-[4/3] w-full overflow-hidden"
            style={{ backgroundColor: item.backgroundColor ?? "#040714" }}
          >
            <Image
              src={item.src}
              alt={item.alt}
              width={item.width ?? 1280}
              height={item.height ?? 960}
              sizes="(min-width: 1024px) 560px, (min-width: 640px) 80vw, 100vw"
              className="h-full w-full object-contain"
              priority={false}
            />

            {/* Provenance badge top-left — small, mono, dimmed until hover.
                Readability is the priority; it never covers the subject. */}
            <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-white/80 backdrop-blur-sm">
              {item.provenance}
            </div>
          </div>

          <figcaption className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
            <div>
              <h3 className="font-display text-lg tracking-tight text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                {item.caption}
              </p>
            </div>

            <div className="mt-auto flex items-center justify-between gap-4 border-t border-border pt-4">
              <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/80">
                {item.credit}
              </span>
              {item.sourceHref ? (
                <a
                  href={item.sourceHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.22em] text-accent/90 transition-colors hover:text-accent"
                >
                  Source
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              ) : null}
            </div>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
