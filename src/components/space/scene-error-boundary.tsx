"use client";

import React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Graceful fallback for WebGL / R3F scene crashes.
 *
 * WebGL context loss, driver quirks, or on-device performance collapses can
 * send React tumbling — catch it here, keep the rest of the app navigable,
 * and give the user a clear path forward.
 */
export class SceneErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.error("[cosmos] scene error", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center p-8">
          <div className="cosmos-panel max-w-md p-6 text-center">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Scene unavailable
            </p>
            <h2 className="mt-2 font-display text-2xl">WebGL couldn&apos;t start.</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Your browser reported an issue initialising the 3D view. This is
              usually a driver or hardware-acceleration setting. You can still
              explore the Solar System in reading mode.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button asChild>
                <Link href="/planets">Browse planets</Link>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  this.setState({ hasError: false });
                  if (typeof window !== "undefined") window.location.reload();
                }}
              >
                Try again
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
