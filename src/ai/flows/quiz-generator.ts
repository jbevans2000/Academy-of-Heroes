'use server';
/**
 * @fileOverview A flow for generating quiz questions for boss battles.
 *
 * - generateQuizQuestions - A function that calls the AI to generate questions.
 * - QuizGeneratorInput - The input type for the generateQuizQuestions function.
 * - QuizQuestion - The schema for a single generated question.
 */
import '@/ai/genkit'; // Ensure Genkit is initialized
import {ai} from '@/ai/genkit';
import {z} from 'zod';

// Schema for a single question object
const QuizQuestionSchema = z.object({
  questionText: z.string().describe('The text of the quiz question.'),
  answers: z.array(z.string()).length(4).describe('An array of four possible answers. The first answer should be the correct one.'),
  correctAnswerIndex: z.number().int().min(0).max(3).describe('The index of the correct answer in the answers array. This should always be 0 as per the instructions, but is included for structure.'),
});

const QuizGeneratorInputSchema = z.object({
  subject: z.string().describe('The academic subject or topic for the quiz questions (e.g., "World War II", "Photosynthesis", "Basic Algebra").'),
  gradeLevel: z.enum(['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade']),
  numberOfQuestions: z.number().int().min(1).max(10).describe('The number of questions to generate.'),
});
export type QuizGeneratorInput = z.infer<typeof QuizGeneratorInputSchema>;

const QuizGeneratorOutputSchema = z.object({
    questions: z.array(QuizQuestionSchema)
});
export type QuizGeneratorOutput = z.infer<typeof QuizGeneratorOutputSchema>;

const quizPrompt = ai.definePrompt({
    name: 'quizPrompt',
    input: { schema: QuizGeneratorInputSchema },
    output: { schema: QuizGeneratorOutputSchema },
    prompt: `You are an expert educator and quiz creator. Your task is to generate a set of multiple-choice questions for a classroom quiz.

Generate exactly {{numberOfQuestions}} questions on the subject of: **{{subject}}**.

The questions MUST be appropriate for the following grade level: **{{gradeLevel}}**.

For each question, provide four possible answers: one correct answer and three plausible but incorrect distractors.

VERY IMPORTANT: For the output, the correct answer MUST always be the FIRST item in the 'answers' array (index 0), and the 'correctAnswerIndex' field MUST therefore always be 0. After generating the answers, you must then shuffle the order of the three incorrect distractors (indexes 1, 2, and 3) to ensure variety. The correct answer must remain at index 0.

Return the final output as a JSON object matching the provided schema.
`,
});

export async function generateQuizQuestions(input: QuizGeneratorInput): Promise<QuizGeneratorOutput> {
  const {output} = await quizPrompt(input);
  if (!output) {
    throw new Error('The AI failed to generate quiz questions.');
  }

  // Post-process to shuffle the generated answers for better variety
  output.questions.forEach(q => {
    // Keep the correct answer at index 0
    const correctAnswer = q.answers[0];
    // Shuffle the three incorrect answers
    const distractors = q.answers.slice(1);
    for (let i = distractors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [distractors[i], distractors[j]] = [distractors[j], distractors[i]];
    }
    // Reassemble the answers array with the correct one first
    q.answers = [correctAnswer, ...distractors];
    // Ensure the correct index is set to 0
    q.correctAnswerIndex = 0;
  });

  return output;
}
