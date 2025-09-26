
'use server';
/**
 * @fileOverview A flow for generating multiple-choice questions using AI based on provided text content.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const QuestionSchema = z.object({
  questionText: z.string().describe('The text of the question.'),
  answers: z.array(z.string()).length(4).describe('A list of exactly four possible answers.'),
  correctAnswerIndex: z.number().min(0).max(3).describe('The index (0-3) of the correct answer in the answers array.'),
  damage: z.number().default(1).describe('The damage dealt for an incorrect answer, default to 1.'),
});

const GenerateQuestionsFromTextInputSchema = z.object({
  lessonContent: z.string().describe('The text content of the lesson to generate questions from.'),
  numQuestions: z.number().min(1).max(10).describe('The number of questions to generate.'),
});

const QuestionGeneratorOutputSchema = z.object({
  questions: z.array(QuestionSchema),
});

export type GenerateQuestionsFromTextInput = z.infer<typeof GenerateQuestionsFromTextInputSchema>;
export type QuestionGeneratorOutput = z.infer<typeof QuestionGeneratorOutputSchema>;

// Define the prompt template
const questionPrompt = ai.definePrompt({
    name: 'questionsFromTextPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: GenerateQuestionsFromTextInputSchema },
    output: { schema: QuestionGeneratorOutputSchema },
    prompt: `You are an expert curriculum designer. Your task is to create a set of multiple-choice questions based *only* on the text provided below.

Generate {{{numQuestions}}} unique questions from the following lesson content:
---
{{{lessonContent}}}
---

For each question:
- The answer must be found directly within the provided text.
- Provide exactly four possible answer choices.
- Clearly indicate which of the four answers is the correct one.
- The incorrect answers should be plausible but clearly wrong based on the text.
- Ensure the questions are distinct from one another.

Provide a response in the specified JSON format.
`,
});


// Define the main flow function
const generateQuestionsFromTextFlow = ai.defineFlow(
  {
    name: 'generateQuestionsFromTextFlow',
    inputSchema: GenerateQuestionsFromTextInputSchema,
    outputSchema: QuestionGeneratorOutputSchema,
  },
  async (input) => {
    const { output } = await questionPrompt(input);
    if (!output?.questions) {
        throw new Error("The AI failed to generate valid questions from the text.");
    }
    return output;
  }
);

// Export a wrapper function to be called from the client
export async function generateQuestionsFromText(input: GenerateQuestionsFromTextInput): Promise<QuestionGeneratorOutput> {
    return generateQuestionsFromTextFlow(input);
}
