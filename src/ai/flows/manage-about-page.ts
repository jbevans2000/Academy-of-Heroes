'use server';

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const aboutPageRef = doc(db, 'content', 'about');

const initialContent = `
    <div style="text-align: center;">
        <h1 style="font-family: 'Cinzel', serif; font-size: 3.5rem; color: hsl(var(--primary));">Welcome to The Academy of Heroes</h1>
        <p style="font-size: 1.25rem; color: hsl(var(--muted-foreground));">Turn Any Lesson Into an Epic Quest</p>
    </div>
    <hr style="margin: 2rem 0;" />
    <p>The Academy of Heroes is a revolutionary educational platform that transforms your classroom into a thrilling fantasy role-playing game. By gamifying your existing curriculum, you can capture student imagination, boost engagement, and make learning an unforgettable adventure.</p>
    
    <div style="text-align: center; margin: 2rem 0;">
        <img src="https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-b18c1ab2-8859-45c9-a9f8-d48645d2eadd.jpg?alt=media&token=f7b64b1f-597b-47a5-b15a-80d08fdd7d6d" alt="A heroic adventurer" style="width: 100%; max-width: 600px; border-radius: 8px; margin: auto; display: block;">
    </div>

    <h2>For Teachers: Become the Guildmaster</h2>
    <p>As a Guildmaster (teacher), you are in complete control. Our intuitive tools allow you to:</p>
    <ul>
        <li><strong>Create Quests:</strong> Easily convert your lessons into exciting chapters within grander quest hubs. Use our AI Story Generator to create epic narratives in seconds.</li>
        <li><strong>Reward Progress:</strong> Bestow Experience Points (XP) and Gold for completing assignments, demonstrating good behavior, or answering questions correctly.</li>
        <li><strong>Run Epic Boss Battles:</strong> Turn quizzes into live, real-time events where the entire class collaborates to defeat a boss by answering questions on their devices.</li>
        <li><strong>Customize Everything:</strong> From the rewards in the "Guild Store" to the questions in your battles and the avatars students can unlock, the world is yours to shape.</li>
    </ul>

    <div style="text-align: center; margin: 2rem 0;">
        <h2 style="font-family: 'Cinzel', serif;">See it in Action!</h2>
        <div style="aspect-ratio: 16 / 9; max-width: 700px; margin: auto;">
             <iframe style="width: 100%; height: 100%; border-radius: 8px;" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
    </div>

    <h2>For Students: Become a Hero</h2>
    <p>Students create their own fantasy hero, choosing between the valiant Guardian, the wise Mage, or the devoted Healer. As they progress through your lessons (quests), they will:</p>
    <ul>
        <li><strong>Level Up:</strong> Gain XP to increase their level, becoming stronger and unlocking new powers.</li>
        <li><strong>Earn Gold:</strong> Purchase custom real-world privileges or in-game cosmetic items from a store you control.</li>
        <li><strong>Customize Their Avatar:</strong> Unlock and equip awesome new gear to show off their achievements.</li>
        <li><strong>Compete and Collaborate:</strong> Engage in friendly competition with their peers in the Training Grounds or work together to take down fearsome bosses.</li>
    </ul>

    <p>The Academy of Heroes is more than just a game; it's a new way to learn, engage, and inspire. Ready to start your adventure?</p>
`;


/**
 * Retrieves the content for the "About" page from Firestore.
 * If the content doesn't exist, it creates it with initial default text.
 * @returns {Promise<string>} The HTML content of the about page.
 */
export async function getAboutPageContent(): Promise<string> {
    try {
        const docSnap = await getDoc(aboutPageRef);
        if (docSnap.exists()) {
            return docSnap.data().content || initialContent;
        } else {
            // Document doesn't exist, so create it with initial content
            await setDoc(aboutPageRef, { 
                content: initialContent,
                lastUpdated: serverTimestamp()
            });
            return initialContent;
        }
    } catch (error) {
        console.error("Error fetching or creating about page content:", error);
        // Return initial content as a fallback on error
        return initialContent;
    }
}


interface UpdateContentResponse {
  success: boolean;
  error?: string;
}

/**
 * Updates the content of the "About" page in Firestore.
 * @param {string} newContent - The new HTML content to save.
 * @returns {Promise<UpdateContentResponse>} A success or error status.
 */
export async function updateAboutPageContent(newContent: string): Promise<UpdateContentResponse> {
    try {
        await setDoc(aboutPageRef, {
            content: newContent,
            lastUpdated: serverTimestamp()
        }, { merge: true });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating about page content:", error);
        return { success: false, error: error.message || "Failed to update content." };
    }
}
