import { Haiku } from "@/types/haiku";

// Simple in-memory store
const haikuStore: Map<string, Haiku> = new Map();
const processedGuids: Set<string> = new Set();

// Store a generated haiku
export function addHaiku(haiku: Haiku): void {
  haikuStore.set(haiku.id, haiku);
  processedGuids.add(haiku.id);
}

// Get all haikus, sorted by timestamp descending (newest first)
export function getAllHaikus(): Haiku[] {
  return Array.from(haikuStore.values()).sort((a, b) => b.timestamp - a.timestamp);
}

// Check if an RSS item has already been processed
export function hasBeenProcessed(guid: string): boolean {
  return processedGuids.has(guid);
}

// Get a specific haiku by ID (GUID)
export function getHaikuById(id: string): Haiku | undefined {
    return haikuStore.get(id);
}

// Add a GUID to the processed set (even if haiku generation failed)
export function markAsProcessed(guid: string): void {
    processedGuids.add(guid);
}

// Clear the store (useful for testing or reset)
export function clearStore(): void {
    haikuStore.clear();
    processedGuids.clear();
} 