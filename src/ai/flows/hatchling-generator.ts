
'use server';
/**
 * @fileOverview An AI flow for generating an image of a dragon hatchling based on genetic traits.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the input schema for the hatchling generator, matching the final geneticsKey
const TraitInputSchema = z.object({
  'Neck Length': z.string(),
  'Eye Color': z.string(),
  'Horn Number': z.string(),
  'Wing Claws': z.string(),
  'Body Color': z.string(),
  'Belly Armor': z.string(),
  'Tail Spikes': z.string(),
  'Back Freckles': z.string(),
  'Breath Style': z.string(),
  'Toe Number': z.string(),
  'Wing Color': z.string(),
});

export type HatchlingTraitInput = z.infer<typeof TraitInputSchema>;

// Define the main flow function
const generateHatchlingFlow = ai.defineFlow(
  {
    name: 'generateHatchlingFlow',
    inputSchema: TraitInputSchema,
    outputSchema: z.string().describe("A data URI of the generated image."),
  },
  async (input) => {
    // Modify the belly description based on input
    const bellyDescription = input['Belly Armor'] === 'Armored Belly'
        ? 'thick ridges'
        : 'smooth scales';
    
    // Explicitly show breath weapon effect
    const breathEffect = input['Breath Style'] === 'Fire Breathing' 
        ? 'a small puff of fire is coming from its mouth.' 
        : 'a wisp of frost is coming from its mouth.';

    // Dynamically construct the prompt string from the input traits
    const promptText = `Generate a high-quality, fantasy art style image of a newly hatched baby dragon with the following specific physical traits. The dragon should look cute but majestic, like it has great potential.

    - Neck: ${input['Neck Length']}
    - Eyes: ${input['Eye Color']}
    - Horns: ${input['Horn Number']}
    - Wing Claws: ${input['Wing Claws']}
    - Main Body Color: ${input['Body Color']}
    - Belly Type: ${bellyDescription}
    - Tail Style: ${input['Tail Spikes']}
    - Back Pattern: ${input['Back Freckles']}
    - Toes: ${input['Toe Number']} on both front and rear feet
    - Wing Membrane Color: ${input['Wing Color']}
    - Breath Effect: ${breathEffect}

    The hatchling should be in a simple, magical environment, like a nest with glowing runes or a mystical cave. Focus on the dragon itself.`;
    
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: promptText,
      output: { format: 'media' },
    });

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
