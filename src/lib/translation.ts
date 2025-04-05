'use client';

// Client-side helper function to call our server API route
export async function translateHaikuToRussian(englishHaiku: string): Promise<string | null> {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: englishHaiku }),
    });
    
    if (!response.ok) {
      console.error('Translation API error:', await response.text());
      return null;
    }
    
    const data = await response.json();
    return data.translation || null;
  } catch (error) {
    console.error('Error calling translation API:', error);
    return null;
  }
}

/**
 * Translates time ago text to Russian
 * @param timeAgoText Text like "5 minutes ago", "2 hours ago", etc.
 * @returns Russian translation or original text if no match
 */
export function translateTimeAgo(timeAgoText: string): string {
  // Special cases
  if (timeAgoText === "less than a minute ago") {
    return "меньше минуты назад";
  }
  
  if (timeAgoText === "about 1 hour ago") {
    return "около часа назад";
  }
  
  if (timeAgoText === "a minute ago") {
    return "минуту назад";
  }
  
  if (timeAgoText === "an hour ago") {
    return "час назад";
  }

  // Extract the numeric part and the unit+suffix part
  // This regex handles formats like "5 minutes ago", "about 2 hours ago", etc.
  const match = timeAgoText.match(/^(about\s+)?(\d+)?\s*([a-z]+(\s+[a-z]+)*)$/i);
  
  if (!match) return timeAgoText; // If no match, return original
  
  const [, aboutPrefix, number, unitWithSuffix] = match;
  const num = number ? parseInt(number, 10) : 1; // Default to 1 if no number present
  
  // Handle "about" prefix
  const prefix = aboutPrefix ? 'около ' : '';
  
  // Translation mapping with proper pluralization rules for Russian
  const translations: Record<string, (n: number) => string> = {
    'minute ago': (n) => 
      n === 1 ? 'минуту назад' : 
      n >= 2 && n <= 4 ? `${n} минуты назад` : 
      `${n} минут назад`,
    
    'minutes ago': (n) => 
      n === 1 ? 'минуту назад' : 
      n >= 2 && n <= 4 ? `${n} минуты назад` : 
      `${n} минут назад`,
      
    'hour ago': (n) => 
      n === 1 ? 'час назад' : 
      n >= 2 && n <= 4 ? `${n} часа назад` : 
      `${n} часов назад`,
      
    'hours ago': (n) => 
      n === 1 ? 'час назад' : 
      n >= 2 && n <= 4 ? `${n} часа назад` : 
      `${n} часов назад`,
      
    'day ago': (n) => 
      n === 1 ? 'день назад' : 
      n >= 2 && n <= 4 ? `${n} дня назад` : 
      `${n} дней назад`,
      
    'days ago': (n) => 
      n === 1 ? 'день назад' : 
      n >= 2 && n <= 4 ? `${n} дня назад` : 
      `${n} дней назад`,
      
    'month ago': (n) => 
      n === 1 ? 'месяц назад' : 
      n >= 2 && n <= 4 ? `${n} месяца назад` : 
      `${n} месяцев назад`,
      
    'months ago': (n) => 
      n === 1 ? 'месяц назад' : 
      n >= 2 && n <= 4 ? `${n} месяца назад` : 
      `${n} месяцев назад`,
      
    'year ago': (n) => 
      n === 1 ? 'год назад' : 
      n >= 2 && n <= 4 ? `${n} года назад` : 
      `${n} лет назад`,
      
    'years ago': (n) => 
      n === 1 ? 'год назад' : 
      n >= 2 && n <= 4 ? `${n} года назад` : 
      `${n} лет назад`,
  };
  
  if (translations[unitWithSuffix]) {
    return prefix + translations[unitWithSuffix](num);
  }
  
  // Debug log for unmatched cases
  console.log('Unmatched time format:', timeAgoText);
  
  return timeAgoText; // Fallback to original
} 