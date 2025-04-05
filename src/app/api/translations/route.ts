import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { initCache } from '@/lib/translation-cache';

// Create a unique ID for a text to use as cache key
function createTextId(text: string): string {
  return createHash('md5').update(text).digest('hex');
}

// This API route returns all available translations
export async function GET(request: NextRequest) {
  try {
    // Get all haiku IDs from the query string
    const url = new URL(request.url);
    const haikuTexts = url.searchParams.get('texts');
    
    if (!haikuTexts) {
      return NextResponse.json({ translations: {} }, { status: 200 });
    }
    
    // Parse the haiku texts (comma-separated)
    const texts = haikuTexts.split(',').map(decodeURIComponent);
    
    // Load the translation cache
    const cache = initCache();
    
    // Create a map of text ID to translation
    const translations: Record<string, string> = {};
    
    for (const text of texts) {
      const textId = createTextId(text);
      if (cache[textId]) {
        translations[text] = cache[textId];
      }
    }
    
    return NextResponse.json({ translations });
  } catch (error) {
    console.error('Error fetching translations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 