import OpenAI from 'openai';

// Server-side only code - not exposed to the client
if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OpenAI API Key - add it to .env.local");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Translates a haiku from English to Russian
 * @param englishHaiku The original English haiku text
 * @returns The translated Russian haiku or null if translation failed
 */
export async function translateHaikuToRussian(englishHaiku: string): Promise<string | null> {
  try {
    const prompt = `
Translate this English haiku into a Russian haiku. Focus on preserving the core meaning and imagery, not word-for-word translation.

Important guidelines:
1. Capture the essence of the original haiku's idea and emotion
2. Create a proper Russian haiku with poetic quality
3. Maintain the traditional three-line structure
4. The result should feel natural in Russian, not like a direct translation
5. Prioritize poetic beauty and meaning over literal accuracy

Return ONLY the translated Russian haiku with no additional comments.

English haiku:
${englishHaiku}`;

    console.log('Calling OpenAI for Russian haiku translation...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using the same model as for haiku generation
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8, // Slightly higher temperature for more creative translation
      max_tokens: 100,
      n: 1,
    });

    const translation = response.choices[0]?.message?.content?.trim();

    if (!translation) {
      console.error('OpenAI returned no translation content');
      return null;
    }

    console.log('Translation received:', translation);
    return translation;
  } catch (error) {
    console.error('Error translating haiku:', error);
    return null;
  }
} 