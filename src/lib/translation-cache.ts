import fs from 'fs';
import path from 'path';
import { TranslationCache } from '@/types/haiku';

// Determine the correct writable path for the cache file
const IS_SERVERLESS = !!process.env.VERCEL; // Check if running on Vercel
const CACHE_DIR = IS_SERVERLESS ? '/tmp' : process.cwd();
const CACHE_FILE_PATH = path.join(CACHE_DIR, 'translation-cache.json');

// Ensure the /tmp directory exists if running serverless (Vercel might handle this, but good practice)
if (IS_SERVERLESS && !fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch (error) {
    console.error(`Error creating cache directory ${CACHE_DIR}:`, error);
    // If directory creation fails, we might not be able to cache, but let the app continue
  }
}

// Initialize cache from file or create empty cache
export function initCache(): TranslationCache {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const data = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
      return JSON.parse(data) as TranslationCache;
    }
  } catch (error) {
    console.error('Error reading translation cache file:', error);
  }
  
  // Return empty cache if file doesn't exist or error occurs
  return {};
}

// Save translations to cache file
export function saveToCache(translations: TranslationCache): void {
  try {
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(translations, null, 2), 'utf8');
    console.log('Translation cache saved to disk');
  } catch (error) {
    console.error('Error saving translation cache:', error);
  }
}

// Get translation from cache
export function getFromCache(textId: string): string | null {
  const cache = initCache();
  return cache[textId] || null;
}

// Add translation to cache
export function addToCache(textId: string, translation: string): void {
  const cache = initCache();
  cache[textId] = translation;
  saveToCache(cache);
}

// Check if translation exists in cache
export function existsInCache(textId: string): boolean {
  const cache = initCache();
  return !!cache[textId];
} 