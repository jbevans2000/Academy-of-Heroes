
'use server';
/**
 * @fileOverview A flow for generating grade-specific writing prompts.
 * 
 * - generateWritingPrompt - A function that calls the AI to generate a prompt.
 * - WritingPromptInput - The input type for the generateWritingPrompt function.
 */
import '@/ai/genkit'; // Ensure Genkit is initialized
import {ai} from '@/ai/genkit';
import {z} from 'zod';

const WritingPromptInputSchema = z.object({
  gradeLevel: z.enum(['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade']),
  promptType: z.enum(['Fiction', 'Non-Fiction']),
  genreOrSubject: z.string().describe('The selected fiction genre (e.g., Fantasy, Sci-Fi) or non-fiction subject (e.g., History, Science).'),
  specificTopic: z.string().optional().describe('An optional specific topic provided by the teacher for non-fiction prompts (e.g., "Julius Caesar").'),
});
export type WritingPromptInput = z.infer<typeof WritingPromptInputSchema>;


const writingPrompt = ai.definePrompt({
    name: 'writingPrompt',
    input: { schema: WritingPromptInputSchema },
    prompt: `You are a creative and helpful assistant for a teacher. Your task is to generate a single, engaging writing prompt for a classroom setting.

The prompt MUST be appropriate for the following grade level: **{{gradeLevel}}**.

The type of prompt to generate is: **{{promptType}}**.

The genre or subject for the prompt is: **{{genreOrSubject}}**.

{{#if specificTopic}}
For this non-fiction prompt, focus specifically on: **{{specificTopic}}**. If the topic is broad, narrow it down to a specific, age-appropriate question or sub-topic.
{{else}}
{{#if (eq promptType "Non-Fiction")}}
For this non-fiction prompt, you can be creative and choose a specific, interesting, and age-appropriate topic within the subject of {{genreOrSubject}}.
{{/if}}
{{/if}}

The final output should be ONLY the text of the writing prompt itself, with no extra titles, headings, or explanations.
`,
});

export async function generateWritingPrompt(input: WritingPromptInput): Promise<string> {
  const {text} = await writingPrompt(input);
  return text;
}
