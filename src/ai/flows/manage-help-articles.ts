
'use server';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface HelpArticle {
    id: string;
    title: string;
    content: string;
    audience: 'teacher' | 'student';
    videoUrl?: string;
    order: number;
}

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function createHelpArticle(article: Omit<HelpArticle, 'id'>): Promise<ActionResponse> {
    try {
        await addDoc(collection(db, 'helpArticles'), {
            ...article,
            createdAt: serverTimestamp(),
        });
        return { success: true, message: 'Article created successfully.' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateHelpArticle(article: HelpArticle): Promise<ActionResponse> {
    try {
        const { id, ...dataToUpdate } = article;
        const articleRef = doc(db, 'helpArticles', id);
        await updateDoc(articleRef, dataToUpdate);
        return { success: true, message: 'Article updated successfully.' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteHelpArticle(articleId: string): Promise<ActionResponse> {
    try {
        await deleteDoc(doc(db, 'helpArticles', articleId));
        return { success: true, message: 'Article deleted successfully.' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- ONE-TIME SEEDING FUNCTION ---

const initialTeacherArticles = [
  { title: "Student Sign-Up", content: "To get students into your class, they need your unique Guild Code. The process is simple:\n1. Direct students to the application's home page.\n2. They click \"Forge Your Hero & Join a Guild\".\n3. They enter your Guild Code, which can be found on your Podium.\n4. They fill out the rest of the form to create their character.\n\nOnce they register, their application will appear in the \"Pending Approvals\" dialog on your main Podium, where you must approve them to grant access.", audience: 'teacher', order: 1 },
  { title: "Podium (Main Dashboard)", content: "The Podium is your central command center. Here’s a breakdown:\n- **Student Roster:** View all your students at a glance, with key stats like Level, HP, MP, XP, and Gold.\n- **Stat Editing:** Click directly on a student's XP, Gold, HP, or MP on their card to manually set a new value.\n- **Student Selection:** Use the checkboxes on each card to select one or more students for bulk actions.\n- **Awarding Points:** Use the 'Bestow Rewards' button to give or take points from all selected students.\n- **Student Details:** Click 'View Details' to see a student's dashboard exactly as they see it.", audience: 'teacher', order: 2 },
  { title: "Quest Archives (Content Management)", content: "This is where you build your educational adventure. Access it via `Game Management > The Quest Archives`.\n- **Quest Hubs:** These are the main zones on your World Map. Each Hub has its own regional map where you place Chapters.\n- **Chapters:** These are your individual lessons. Each Chapter has a 'Story' tab for narrative and a 'Lesson' tab for curriculum content.\n- **Quizzes:** You can add an optional multiple-choice quiz to the end of any chapter.\n- **Quest Completion:** In `Classroom > Manage Quest Completion`, you can set a global rule requiring your approval for students to advance.", audience: 'teacher', order: 3 },
  { title: "Guild Rewards & The Workshop", content: "You can create custom real-world or in-game perks for students to buy with their earned Gold.\n- **Guild Rewards:** This is your workshop. Create new rewards, edit existing ones, and toggle their visibility in the student store.\n- **Pending Approvals:** If a reward requires your approval, student purchase requests will appear here for you to accept or deny.\n- **Manage Rewards:** This page provides a master table allowing you to manually add or remove any reward from any student's inventory.", audience: 'teacher', order: 4 },
  { title: "Boss Battles & Training Grounds", content: "Engage your class with two forms of combat-based quizzing.\n- **Boss Battles:** Create multiple-choice quizzes that the whole class can fight together in real-time. Students join from their dashboards to answer questions on their own devices.\n- **Training Grounds (Duels):** This is a Player vs. Player (PvP) system. You create sections of questions, and students can challenge each other to 1v1 duels.", audience: 'teacher', order: 5 },
];

const initialStudentArticles = [
  { title: "What are XP and Gold?", content: "XP (Experience Points) are what you earn for completing quests and battles. The more XP you get, the higher your Level becomes! Gold is the currency of the realm. Your teacher may award you Gold, which you can use to buy special items or powers in 'The Vault'.", audience: 'student', order: 1 },
  { title: "What do HP and MP mean?", content: "HP (Hit Points) is your health. If you answer a question wrong in a Boss Battle, you might lose HP. If it reaches zero, you might be knocked out of the fight! MP (Magic Points) is your energy for using special powers. Each class (Mage, Guardian, Healer) has unique powers that cost MP to use.", audience: 'student', order: 2 },
  { title: "How do I go on quests?", content: "From your dashboard, click the \"Embark on Your Quest\" button to open the World Map. From there, you can click on an unlocked area (a Hub) to see the chapters inside. Click on the next available chapter to read the story and see your teacher's lesson!", audience: 'student', order: 3 },
  { title: "What is a Boss Battle?", content: "A Boss Battle is a live, real-time quiz for the whole class! When your teacher starts a battle, click the \"Ready for Battle\" button on your dashboard to join the waiting room. When the battle begins, a question will appear. Answer it as fast as you can! Correct answers damage the boss, while incorrect answers might hurt you.", audience: 'student', order: 4 },
  { title: "How do I change my character's avatar?", content: "From your dashboard, click 'The Forge'. Here, you can customize your character's appearance using different bodies, hairstyles, and any armor pieces you have purchased from the Armory. When you're done, click 'Set as Custom Avatar'. You can also choose from pre-made avatars that unlock as you level up.", audience: 'student', order: 5 },
  { title: "What are Rewards and how do I use them?", content: "Rewards are special privileges or items you can purchase with your Gold. To see what's available, visit 'The Vault' from your dashboard. If you have enough Gold, you can purchase a Reward. Once you own a Reward, you can use it by going to your 'My Inventory' page.", audience: 'student', order: 6 },
];


export async function seedInitialHelpArticles(): Promise<ActionResponse> {
    try {
        const helpArticlesRef = collection(db, 'helpArticles');
        const snapshot = await getDocs(helpArticlesRef);
        
        if (!snapshot.empty) {
            return { success: true, message: 'Help articles already exist. Seeding skipped.' };
        }

        const allArticles = [...initialTeacherArticles, ...initialStudentArticles];
        const batch = writeBatch(db);
        
        allArticles.forEach(article => {
            const docRef = doc(helpArticlesRef);
            batch.set(docRef, { ...article, createdAt: serverTimestamp() });
        });

        await batch.commit();
        return { success: true, message: 'Successfully seeded initial help articles.' };

    } catch (error: any) {
        console.error("Error seeding help articles:", error);
        return { success: false, error: error.message };
    }
}

    