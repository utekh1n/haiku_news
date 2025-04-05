export interface Haiku {
  id: string; // Use RSS item GUID
  text: string; // The 5-7-5 haiku
  link: string; // Link to the original article
  source: string; // e.g., "The Guardian"
  timestamp: number; // Unix timestamp (ms) from pubDate
  originalTitle: string;
  originalExcerpt?: string;
}

export interface TranslationCache {
  [id: string]: string; // Maps haiku ID to translated text
} 