import { fetchRssFeed, RssItem } from "@/lib/rss";
import { generateHaiku } from "@/lib/openai";
import { addHaiku, hasBeenProcessed, markAsProcessed } from "@/lib/cache";
import { Haiku } from "@/types/haiku";

// Rate limiting state
let requestCount = 0;
let lastRequestTime = Date.now();
const MAX_REQUESTS_PER_SECOND = 5;
const ONE_SECOND_MS = 1000;
const BATCH_SIZE = 3;

async function rateLimitedGenerateHaiku(excerpt: string): Promise<string | null> {
    const now = Date.now();

    // Reset count if a second has passed
    if (now - lastRequestTime >= ONE_SECOND_MS) {
        requestCount = 0;
        lastRequestTime = now;
    }

    if (requestCount >= MAX_REQUESTS_PER_SECOND) {
        // Wait until the next second starts
        const waitTime = ONE_SECOND_MS - (now - lastRequestTime);
        console.log(`Rate limit hit. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        // Reset state after waiting
        requestCount = 1;
        lastRequestTime = Date.now();
    } else {
        requestCount++;
    }
    
    return generateHaiku(excerpt);
}

// Process a single item to create a haiku
async function processItem(item: RssItem): Promise<Haiku | null> {
  if (hasBeenProcessed(item.guid)) {
    return null;
  }
  
  console.log(`Processing item: ${item.title}`);
  const excerpt = item.contentSnippet || item.title; // Use title as fallback excerpt
  
  try {
    // Call OpenAI with rate limiting
    const haikuText = await rateLimitedGenerateHaiku(excerpt);
    
    if (haikuText) {
      const newHaiku: Haiku = {
        id: item.guid,
        text: haikuText,
        link: item.link,
        source: item.source,
        timestamp: new Date(item.pubDate).getTime(),
        originalTitle: item.title,
        originalExcerpt: item.contentSnippet,
      };
      
      addHaiku(newHaiku);
      console.log(`Successfully generated haiku for: ${item.title}`);
      return newHaiku;
    }
  } catch (error) {
    console.error(`Error generating haiku for item ${item.title}:`, error);
  }
  
  // Mark as processed even if haiku generation failed
  markAsProcessed(item.guid);
  return null;
}

export async function processNewFeedItems(): Promise<Haiku[]> {
  console.log('Starting feed processing...');
  const feedItems = await fetchRssFeed();
  const newHaikus: Haiku[] = [];

  if (!feedItems || feedItems.length === 0) {
    console.log('No feed items fetched or an error occurred.');
    return [];
  }
  
  // Filter out already processed items
  const unprocessedItems = feedItems.filter(item => !hasBeenProcessed(item.guid));
  console.log(`Found ${unprocessedItems.length} unprocessed items out of ${feedItems.length} total`);
  
  // Process items in batches to balance speed and rate limits
  for (let i = 0; i < unprocessedItems.length; i += BATCH_SIZE) {
    const batch = unprocessedItems.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${i/BATCH_SIZE + 1} of ${Math.ceil(unprocessedItems.length/BATCH_SIZE)}`);
    
    // Process batch items in parallel
    const results = await Promise.allSettled(batch.map(processItem));
    
    // Collect successful results
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        newHaikus.push(result.value);
      }
    });
    
    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < unprocessedItems.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`Feed processing finished. Generated ${newHaikus.length} new haikus.`);
  return newHaikus;
} 