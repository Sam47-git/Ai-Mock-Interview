import { z } from "zod";
import type { ZodSchema } from "zod";

// ── Generic parser ────────────────────────────────────────────────────────────
export function parseAiJson<T>(raw: string, schema: ZodSchema<T>): T {
  const clean = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean); // throws SyntaxError if not valid JSON
  return schema.parse(parsed);      // throws ZodError if shape is wrong
}

// ── Schema 1: Answer evaluation ───────────────────────────────────────────────
// Used by: record-answer.tsx
export const evaluationSchema = z.object({
  feedback:     z.string().min(1).max(500),
  accuracy:     z.number().int().min(0).max(2),
  completeness: z.number().int().min(0).max(2),
  clarity:      z.number().int().min(0).max(1),
});

export type EvaluationResult = z.infer<typeof evaluationSchema>;

// ── Schema 2: Question generation ─────────────────────────────────────────────
// Used by: form-mock-interviews.tsx, mock-load-page.tsx
//
// Normalises every shape Gemini might return into { questions: string[] }.
// Enforces exactly 5 questions after normalisation.

// A single question item — Gemini sometimes wraps strings in objects
const questionItem = z.union([
  z.string().min(1),
  z.object({ question: z.string().min(1) }),
  z.object({ text:     z.string().min(1) }),
  z.object({ content:  z.string().min(1) }),
]);

// Extract the string from whatever shape the item has
const extractString = (item: z.infer<typeof questionItem>): string => {
  if (typeof item === "string") return item;
  if ("question" in item) return item.question;
  if ("text"     in item) return item.text;
  return item.content;
};

// Accepts a raw array of items and normalises to string[]
const rawArraySchema = z
  .array(questionItem)
  .transform((arr) => arr.map(extractString));

export const questionsSchema = z
  .union([
    // Case 1: { questions: [...] }
    z.object({ questions: rawArraySchema }).transform((o) => o.questions),
    // Case 2: bare [...]
    rawArraySchema,
  ])
  .transform((questions) => {
    if (questions.length !== 5) {
      throw new Error(
        `Expected exactly 5 questions, got ${questions.length}.`
      );
    }
    return { questions };
  });

// Always resolves to this shape regardless of AI input format
export type QuestionsResult = { questions: string[] };