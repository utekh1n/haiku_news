import { NextRequest, NextResponse } from 'next/server';
import { getAllHaikus, clearStore } from '@/lib/cache';
import { processNewFeedItems } from '@/lib/processor';
import { Haiku } from '@/types/haiku';
import { translateHaikuToRussian } from '@/lib/server-translation';
import { existsInCache, addToCache } from '@/lib/translation-cache';
import { createHash } from 'crypto';

// Interval for checking the RSS feed (2 minutes)
const POLLING_INTERVAL_MS = 2 * 60 * 1000;

// Track the last cache clear time
let lastCacheClearTime = 0;
const CACHE_LIFETIME = 3 * 60 * 60 * 1000; // 3 hours

// Keep track of active connections for cleanup if needed (optional)
// const activeConnections = new Set<ReadableStreamDefaultController>();

// Create a unique ID for a text to use as cache key
function createTextId(text: string): string {
  return createHash('md5').update(text).digest('hex');
}

// Pre-translate a haiku if not already translated
async function ensureTranslated(haiku: Haiku): Promise<void> {
  const textId = createTextId(haiku.text);
  
  // Skip if already in cache
  if (existsInCache(textId)) {
    return;
  }
  
  try {
    console.log(`Pre-translating haiku ${haiku.id}`);
    const translation = await translateHaikuToRussian(haiku.text);
    if (translation) {
      addToCache(textId, translation);
    }
  } catch (error) {
    console.error(`Error pre-translating haiku ${haiku.id}:`, error);
  }
}

export async function GET(request: NextRequest) {
  const now = Date.now();
  
  // Only clear cache if it's been more than CACHE_LIFETIME since the last clear
  if (now - lastCacheClearTime > CACHE_LIFETIME) {
    console.log('Clearing cache to get fresh news items...');
    clearStore();
    lastCacheClearTime = now;
  } else {
    console.log('Using existing cache, last cleared:', new Date(lastCacheClearTime).toLocaleString());
  }

  // DO NOT process feed here, it blocks the initial response.
  // Feed processing happens in the polling interval.
  // await processNewFeedItems(); 
  
  // Get only currently cached haikus immediately
  const initialHaikus = getAllHaikus(); 

  // Start pre-translating in the background (don't await)
  // We will move the initial processing into the stream start
  // Promise.all(initialHaikus.map(ensureTranslated))
  //   .then(() => console.log('Background pre-translation completed'))
  //   .catch(error => console.error('Error in background pre-translation:', error));

  const stream = new ReadableStream({
    async start(controller) { // Make start async
      console.log('SSE connection established.');
      // activeConnections.add(controller);

      // Function to send data to the client
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch (err) {
          console.error(`Error sending SSE data for event ${event}:`, err);
          // Attempt to close if enqueue fails (e.g., controller already closed)
          try { controller.close(); } catch { /* ignore */ }
        }
      };
      
      // Send status that we are initializing
      send('status', { initializing: true });
      
      let initialHaikus: Haiku[] = [];
      try {
        // Get only existing haikus initially, DO NOT process feeds here
        console.log('Getting existing cached haikus...');
        initialHaikus = getAllHaikus(); 
        console.log(`Found ${initialHaikus.length} existing haikus.`);

        // Send initial data (might be empty if cache is empty)
        send('initial', initialHaikus);
        console.log(`Sent ${initialHaikus.length} initial haikus.`);
        
        // Start background pre-translating for existing haikus
        if (initialHaikus.length > 0) {
          Promise.all(initialHaikus.map(ensureTranslated))
            .then(() => console.log('Background pre-translation completed for initial items'))
            .catch(error => console.error('Error in background pre-translation:', error));
        }

      } catch (initialError) {
        console.error('Error during initial data load for SSE:', initialError);
        send('error', { message: 'Failed to load initial data.' });
      }
      
      // Send status that initialization is complete
      send('status', { initializing: false });

      // Set up periodic polling (this will now fetch the *first* batch)
      const intervalId = setInterval(async () => {
        try {
          console.log('Polling for new feed items...');
          // Send an update status event (optional)
          send('status', { checking: true }); 

          const newHaikus = await processNewFeedItems();
          
          // Pre-translate new haikus in the background
          if (newHaikus.length > 0) {
            Promise.all(newHaikus.map(ensureTranslated))
              .then(() => console.log('New haikus pre-translation completed'))
              .catch(error => console.error('Error pre-translating new haikus:', error));
          }
          
          send('status', { checking: false }); 
          
          if (newHaikus.length > 0) {
            console.log(`Found ${newHaikus.length} new haikus. Sending update.`);
            send('update', newHaikus); // Send only the *new* haikus
          }
        } catch (error) {
          console.error('Error during periodic feed check:', error);
          send('error', { message: 'Error checking feed.' });
        }
      }, POLLING_INTERVAL_MS);

      // Clean up on client disconnect
      request.signal.addEventListener('abort', () => {
        console.log('SSE connection closed.');
        clearInterval(intervalId);
        // activeConnections.delete(controller); 
        try {
             controller.close();
        } catch (_error) {
            // Ignore error if already closed
        }
      });
    },
    // cancel(reason) { // Optional: handle stream cancellation
    //   console.log('SSE stream cancelled:', reason);
    // }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Removed POST handler as it's not used in the SSE approach 