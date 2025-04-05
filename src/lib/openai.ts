import OpenAI from 'openai';
import { syllable } from 'syllable';

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OpenAI API Key - add it to .env.local");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function validateHaikuStructure(text: string): boolean {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length !== 3) {
    console.warn(`Validation failed: Expected 3 lines, got ${lines.length}`);
    return false;
  }
  
  const syllableCounts = lines.map(line => syllable(line));
  console.log(`Syllable counts (using 'syllable'): ${syllableCounts.join('-')}`); // For debugging
  
  const isValid = syllableCounts[0] === 5 && syllableCounts[1] === 7 && syllableCounts[2] === 5;
  if (!isValid) {
    console.warn(`Validation failed: Expected 5-7-5, got ${syllableCounts.join('-')}`);
  }
  return isValid;
}

export async function generateHaiku(excerpt: string): Promise<string | null> {
  if (!excerpt || excerpt.trim().length === 0) {
    console.warn('generateHaiku called with empty excerpt');
    return null;
  }

  // Truncate excerpt if too long (OpenAI has token limits)
  const maxExcerptLength = 500; // Adjust as needed
  const truncatedExcerpt = excerpt.length > maxExcerptLength 
    ? excerpt.substring(0, maxExcerptLength) + '...' 
    : excerpt;

  const prompt = 
`Create a deeply evocative and poetic, strict 5-7-5 syllable haiku from this news excerpt. 
Focus on: 
1. Emotional resonance 
2. Vivid imagery or figurative language
3. Key essence (not just dry facts)
4. Natural, flowing rhythm
Return ONLY the haiku with no commentary:
${truncatedExcerpt}`;

  try {
    console.log('Calling OpenAI API with enhanced prompt...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 60,
      n: 1,
    });

    const potentialHaiku = response.choices[0]?.message?.content?.trim();

    if (!potentialHaiku) {
      console.error('OpenAI API returned no content.');
      return null;
    }

    console.log('Raw OpenAI Response:', potentialHaiku);

    // Basic validation (can be improved)
    if (validateHaikuStructure(potentialHaiku)) {
      return potentialHaiku;
    } else {
      console.warn('Generated text did not match 5-7-5 structure:', potentialHaiku);
      // Maybe retry or implement more robust validation/parsing?
      // For now, we return null if validation fails.
      return null;
    }

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return null; // Return null on API error
  }
} 