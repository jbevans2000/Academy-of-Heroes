
'use server';
/**
 * @fileOverview A flow for generating character names from a predefined list.
 */
import { maleNames, femaleNames } from '@/lib/names';

export async function generateName(gender: 'male' | 'female'): Promise<string> {
    try {
        const nameList = gender === 'male' ? maleNames : femaleNames;
        if (!nameList || nameList.length === 0) {
            return 'Brave Hero';
        }
        const randomIndex = Math.floor(Math.random() * nameList.length);
        return nameList[randomIndex];
    } catch (error) {
        console.error("Error generating name:", error);
        // Provide a fallback name on error
        return 'Brave Hero';
    }
}
