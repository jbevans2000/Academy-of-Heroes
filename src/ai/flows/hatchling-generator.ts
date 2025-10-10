'use server';
/**
 * @fileOverview An AI flow for generating an image of a dragon hatchling based on genetic traits.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { dotprompt } from '@genkit-ai/dotprompt';

// Define the input schema for the hatchling generator
const TraitInputSchema = z.object({
  'Neck Length': z.string(),
  'Eye Color': z.string(),
  'Horns': z.string(),
  'Wing Claws': z.string(),
  'Body Color': z.string(),
  'Belly': z.string(),
  'Tail': z.string(),
  'Back': z.string(),
  'Breath': z.string(),
  'Toes': z.string(),
  'Wing Color': z.string(),
});

export type HatchlingTraitInput = z.infer<typeof TraitInputSchema>;

// Define the prompt template
const hatchlingImagePrompt = ai.definePrompt(
  {
    name: 'hatchlingImagePrompt',
    model: 'googleai/imagen-4.0-fast-generate-001',
    input: { schema: TraitInputSchema },
    output: { format: 'media' },
    template: dotprompt`Generate a high-quality, fantasy art style image of a newly hatched baby dragon with the following specific physical traits. The dragon should look cute but majestic, like it has great potential.

    - Neck: {{Neck Length}}
    - Eyes: {{Eye Color}}
    - Horns: {{Horns}}
    - Wing Claws: {{Wing Claws}}
    - Main Body Color: {{Body Color}}
    - Belly Type: {{Belly}}
    - Tail Style: {{Tail}}
    - Back Pattern: {{Back}}
    - Breath Ability: {{Breath}}
    - Toes: {{Toes}}
    - Wing Membrane Color: {{Wing Color}}

    The hatchling should be in a simple, magical environment, like a nest with glowing runes or a mystical cave. Focus on the dragon itself.`,
  }
);


// Define the main flow function
const generateHatchlingFlow = ai.defineFlow(
  {
    name: 'generateHatchlingFlow',
    inputSchema: TraitInputSchema,
    outputSchema: z.string().describe("A data URI of the generated image."),
  },
  async (input) => {
    const { media } = await hatchlingImagePrompt(input);
    if (!media?.url) {
      throw new Error("The AI failed to generate a valid image.");
    }
    return media.url;
  }
);

// Export a wrapper function to be called from the client
export async function generateHatchling(input: HatchlingTraitInput): Promise<string> {
    return generateHatchlingFlow(input);
}
