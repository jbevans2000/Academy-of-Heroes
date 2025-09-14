
'use server';
/**
 * @fileOverview A flow for generating classroom activities using AI.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the input schema for the activity generator
const ActivityGeneratorInputSchema = z.object({
  gradeLevel: z.string().describe('The grade level for the activity, e.g., "3rd Grade".'),
  taskType: z.enum(['Mental', 'Physical']).describe('The type of activity to generate.'),
});

// Define the output schema for the structured response
const ActivityGeneratorOutputSchema = z.object({
  title: z.string().describe('A creative, fantasy-themed title for the activity.'),
  description: z.string().describe('A short, engaging description of the activity for the teacher.'),
  documentContent: z.string().optional().describe('Optional: Any detailed instructions, prompts, or printable content for the activity. Use markdown for formatting.'),
});

export type ActivityGeneratorInput = z.infer<typeof ActivityGeneratorInputSchema>;
export type ActivityGeneratorOutput = z.infer<typeof ActivityGeneratorOutputSchema>;

// Define the prompt template
const activityPrompt = ai.definePrompt({
    name: 'activityGeneratorPrompt',
    model: 'googleai/gemini-1.5-flash',
    input: { schema: ActivityGeneratorInputSchema },
    output: { schema: ActivityGeneratorOutputSchema },
    prompt: `You are an expert curriculum designer specializing in creating fun, fantasy-themed classroom activities. Generate a single, unique, and engaging activity based on the following criteria:

Grade Level: {{{gradeLevel}}}
Task Type: {{{taskType}}}

The activity should be something a teacher can do with their class in real-time with minimal preparation.

For 'Mental' tasks, focus on puzzles, creative thinking, short writing prompts, or problem-solving.
For 'Physical' tasks, focus on short, classroom-appropriate movements, actions, or light exercises.

Provide a response in the specified JSON format with a creative title, a simple description, and if necessary, some content for a printable document. The document content should be formatted with markdown.
`,
});


// Define the main flow function
const generateActivityFlow = ai.defineFlow(
  {
    name: 'generateActivityFlow',
    inputSchema: ActivityGeneratorInputSchema,
    outputSchema: ActivityGeneratorOutputSchema,
  },
  async (input) => {
    const { output } = await activityPrompt(input);
    if (!output) {
        throw new Error("The AI failed to generate a valid activity.");
    }
    return output;
  }
);

// Export a wrapper function to be called from the client
export async function generateActivity(input: ActivityGeneratorInput): Promise<ActivityGeneratorOutput> {
    return generateActivityFlow(input);
}
