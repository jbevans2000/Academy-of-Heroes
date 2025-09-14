
'use server';
/**
 * @fileOverview A flow for generating multiple-choice questions using AI.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const QuestionSchema = z.object({
  questionText: z.string().describe('The text of the question.'),
  answers: z.array(z.string()).length(4).describe('A list of exactly four possible answers.'),
  correctAnswerIndex: z.number().min(0).max(3).describe('The index (0-3) of the correct answer in the answers array.'),
  damage: z.number().default(1).describe('The damage dealt for an incorrect answer, default to 1.'),
});

const QuestionGeneratorInputSchema = z.object({
  subject: z.string().describe('The subject or topic for the questions.'),
  gradeLevel: z.string().describe('The grade level for the questions, e.g., "5th Grade".'),
  numQuestions: z.number().min(1).max(10).describe('The number of questions to generate.'),
});

const QuestionGeneratorOutputSchema = z.object({
  questions: z.array(QuestionSchema),
});

export type QuestionGeneratorInput = z.infer<typeof QuestionGeneratorInputSchema>;
export type QuestionGeneratorOutput = z.infer<typeof QuestionGeneratorOutputSchema>;

// Define the prompt template
const questionPrompt = ai.definePrompt({
    name: 'questionGeneratorPrompt',
    model: 'googleai/gemini-1.5-flash',
    input: { schema: QuestionGeneratorInputSchema },
    output: { schema: QuestionGeneratorOutputSchema },
    prompt: `You are an expert curriculum designer tasked with creating a set of multiple-choice questions.

Generate {{{numQuestions}}} unique, grade-appropriate questions about the following subject:
Subject: {{{subject}}}
Grade Level: {{{gradeLevel}}}

For each question:
- Provide exactly four possible answer choices.
- Clearly indicate which of the four answers is the correct one.
- The question should be challenging but fair for the specified grade level.
- Ensure the questions are distinct from one another.

Provide a response in the specified JSON format.
`,
});


// Define the main flow function
const generateQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuestionsFlow',
    inputSchema: QuestionGeneratorInputSchema,
    outputSchema: QuestionGeneratorOutputSchema,
  },
  async (input) => {
    const { output } = await questionPrompt(input);
    if (!output?.questions) {
        throw new Error("The AI failed to generate valid questions.");
    }
    return output;
  }
);

// Export a wrapper function to be called from the client
export async function generateQuestions(input: QuestionGeneratorInput): Promise<QuestionGeneratorOutput> {
    return generateQuestionsFlow(input);
}
