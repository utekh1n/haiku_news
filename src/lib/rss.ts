import Parser from 'rss-parser';

const parser = new Parser();

// Define multiple feed sources
const FEED_SOURCES = [
  { name: "The Guardian", url: 'https://www.theguardian.com/world/rss' },
  { name: "BBC News", url: 'http://feeds.bbci.co.uk/news/world/rss.xml' },
  //{ name: "Reuters", url: 'https://www.reuters.com/news/rss/world' }, // Temporarily commented out due to 401 error
  { name: "CNN", url: 'http://rss.cnn.com/rss/edition_world.rss' },
  { name: "NPR News", url: 'https://feeds.npr.org/1001/rss.xml' },
  { name: "Al Jazeera", url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { name: "ABC News", url: 'https://abcnews.go.com/abcnews/worldnewsheadlines' },
  { name: "CBS News", url: 'https://www.cbsnews.com/latest/rss/world' },
  { name: "NBC News", url: 'https://feeds.nbcnews.com/nbcnews/public/world' },
  { name: "Washington Post", url: 'https://feeds.washingtonpost.com/rss/world' },
  { name: "NYT World", url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' },
];

// Maximum number of recent items to take from each feed
const MAX_ITEMS_PER_FEED = 5;

export interface RssItem {
  title: string;
  link: string;
  pubDate: string; // ISO date string
  contentSnippet?: string; // Excerpt
  guid: string; // Unique identifier
  source: string; // Added source field
}

// Fetch items from a single feed source
async function fetchSingleFeed(source: { name: string, url: string }): Promise<RssItem[]> {
  try {
    const feed = await parser.parseURL(source.url);
    console.log(`Fetched ${feed.items.length} items from ${source.name} (${source.url})`);

    return feed.items
      .filter(item => item.title && item.link && item.pubDate && item.guid)
      // Sort by publication date (newest first)
      .sort((a, b) => new Date(b.pubDate!).getTime() - new Date(a.pubDate!).getTime())
      // Take only the most recent items
      .slice(0, MAX_ITEMS_PER_FEED)
      .map(item => ({
        title: item.title!,
        link: item.link!,
        pubDate: item.pubDate!,
        contentSnippet: item.contentSnippet,
        guid: item.guid!,
        source: source.name, // Tag item with source name
      }));

  } catch (error) {
    console.error(`Error fetching or parsing RSS feed from ${source.name} (${source.url}):`, error);
    return []; // Return empty array on error for this specific feed
  }
}

// Fetch items from all defined feed sources concurrently
export async function fetchRssFeed(): Promise<RssItem[]> {
  console.log('Fetching from all RSS sources...');
  
  // Use a subset of sources each time to minimize load
  const shuffledSources = [...FEED_SOURCES].sort(() => Math.random() - 0.5);
  const sourcesToUse = shuffledSources.slice(0, 2); // Use only 2 random sources each time (was 5)
  
  const allFeedPromises = sourcesToUse.map(fetchSingleFeed);
  const results = await Promise.allSettled(allFeedPromises);

  const successfullyFetchedItems: RssItem[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successfullyFetchedItems.push(...result.value);
    } else {
      // Log error but continue with other feeds
      console.error(`Failed to fetch feed from ${sourcesToUse[index].name}:`, result.reason);
    }
  });

  console.log(`Total items fetched successfully from all sources: ${successfullyFetchedItems.length}`);
  return successfullyFetchedItems;
} 