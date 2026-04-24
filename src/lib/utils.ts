import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Conditional class merger used throughout the UI. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number with thousands separators, preserving a sensible precision. */
export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

/** Format a measurement with unit suffix and sensible rounding. */
export function formatMeasurement(value: number, unit: string, digits = 2): string {
  return `${formatNumber(value, digits)} ${unit}`;
}

/** Relative time label (e.g. "2h ago") with graceful fallback. */
export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const abs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const sign = diffMs < 0 ? "in " : "";
  const suffix = diffMs < 0 ? "" : " ago";
  if (abs < minute) return `${sign}just now${diffMs < 0 ? "" : ""}`;
  if (abs < hour) return `${sign}${Math.round(abs / minute)}m${suffix}`;
  if (abs < day) return `${sign}${Math.round(abs / hour)}h${suffix}`;
  if (abs < 30 * day) return `${sign}${Math.round(abs / day)}d${suffix}`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
