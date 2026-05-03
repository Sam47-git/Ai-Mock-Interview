export function parseAiJson<T>(raw: string): T {
  // Step 1: Trim any surrounding whitespace
  let cleanText = raw.trim();

  // Step 2: Remove markdown fences (```json and ```)
  cleanText = cleanText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").replace(/`/g, "");

  // Step 3: Extract the first JSON object or array using regex
  const jsonMatch = cleanText.match(/[\[\{][\s\S]*[\]\}]/);
  if (jsonMatch) {
    cleanText = jsonMatch[0];
  } else {
    throw new Error("No JSON object or array found in response");
  }

  // Step 4: Parse the clean JSON text
  try {
    return JSON.parse(cleanText);
  } catch (error) {
    throw new Error("Invalid JSON format: " + (error as Error)?.message);
  }
}
