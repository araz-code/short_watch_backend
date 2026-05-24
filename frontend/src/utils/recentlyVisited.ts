import { useEffect, useState } from "react";

const STORAGE_KEY = "zirium_recently_visited_v1";
const UPDATE_EVENT = "zirium_recently_visited_updated";
const MAX_ENTRIES = 5;

export type VisitEntryType =
  | "stock_detail"
  | "seller_detail"
  | "insider_detail"
  | "analysis";

export interface VisitEntry {
  path: string;
  title: string;
  subtitle?: string;
  type: VisitEntryType;
  timestamp: number;
}

export function getRecentlyVisited(): VisitEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_ENTRIES) as VisitEntry[];
  } catch {
    return [];
  }
}

export function recordVisit(entry: Omit<VisitEntry, "timestamp">): void {
  try {
    const current = getRecentlyVisited();
    const filtered = current.filter((e) => e.path !== entry.path);
    const next: VisitEntry[] = [
      { ...entry, timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(UPDATE_EVENT));
  } catch {
    // localStorage might be unavailable (private mode, quota); fail silently
  }
}

export function useRecentlyVisited(): VisitEntry[] {
  const [entries, setEntries] = useState<VisitEntry[]>(() => getRecentlyVisited());

  useEffect(() => {
    const handler = () => setEntries(getRecentlyVisited());
    window.addEventListener(UPDATE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(UPDATE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return entries;
}
