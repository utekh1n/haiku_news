import { NextRequest, NextResponse } from 'next/server';
import { translateHaikuToRussian } from '@/lib/server-translation';
import { existsInCache, getFromCache, addToCache } from '@/lib/translation-cache';
import { createHash } from 'crypto';

// Create a unique ID for a text to use as cache key
function createTextId(text: string): string {
  return createHash('md5').update(text).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { text } = data;
    
    if (!text) {
      return NextResponse.json(
        { error: 'Missing required field: text' },
        { status: 400 }
      );
    }
    
    // Create a unique ID for this text
    const textId = createTextId(text);
    
    // Check if translation exists in cache
    if (existsInCache(textId)) {
      console.log('Translation found in cache');
      const cachedTranslation = getFromCache(textId);
      return NextResponse.json({ translation: cachedTranslation });
    }
    
    // If not in cache, call the OpenAI API
    console.log('Translation not found in cache, calling OpenAI');
    const translation = await translateHaikuToRussian(text);
    
    if (!translation) {
      return NextResponse.json(
        { error: 'Translation failed' },
        { status: 500 }
      );
    }
    
    // Save translation to cache
    addToCache(textId, translation);
    
    return NextResponse.json({ translation });
  } catch (error) {
    console.error('Error in translation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 