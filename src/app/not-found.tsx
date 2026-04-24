import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[70dvh] flex-col items-center justify-center gap-5 text-center">
      <p className="cosmos-chip">404 · Out of orbit</p>
      <h1 className="font-display text-display-md tracking-tight text-balance">
        We couldn't find that world.
      </h1>
      <p className="max-w-md text-muted-foreground leading-relaxed">
        The page you're looking for may have been renamed, moved, or never existed. Come back to
        familiar space.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">Home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/explore">Open explorer</Link>
        </Button>
      </div>
    </div>
  );
}
