
'use server';

import { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, arrayUnion, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student, Chapter } from '@/lib/data';
import { logAvatarEvent } from '@/lib/avatar-log';
import { handleLevelChange } from '@/lib/game-mechanics';
import { getDuelSettings } from './manage-duels';
import type { DuelQuestion } from '@/lib/duels';
import type { QuizQuestion } from '@/lib/quests';

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface CompleteTrainingInput {
    teacherUid: string;
    studentUid: string;
    score: number; // e.g., 8
    totalQuestions: number; // e.g., 10
}

// Helper function to normalize DuelQuestions into the QuizQuestion format
const normalizeDuelQuestion = (duelQuestion: DuelQuestion): QuizQuestion => ({
    id: duelQuestion.id,
    text: duelQuestion.text,
    answers: duelQuestion.answers,
    correctAnswer: [duelQuestion.correctAnswerIndex],
    questionType: 'single', // Duel questions are always single-choice
});

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};


export async function getDailyTrainingQuestions(teacherUid: string, student: Student): Promise<QuizQuestion[]> {
    if (!student || !teacherUid) return [];

    // --- Source 1: Completed Chapter Quizzes ---
    let chapterQuestions: QuizQuestion[] = [];
    if (student.completedChapters && student.completedChapters.length > 0) {
        const chaptersQuery = query(collection(db, 'teachers', teacherUid, 'chapters'), where('__name__', 'in', student.completedChapters.slice(0, 10)));
        const completedChaptersSnapshot = await getDocs(chaptersQuery);

        completedChaptersSnapshot.forEach(doc => {
            const chapter = doc.data() as Chapter;
            if (chapter.quiz && chapter.quiz.questions && (chapter.quiz.settings?.includeInDailyTraining ?? true)) {
                chapterQuestions = chapterQuestions.concat(chapter.quiz.questions);
            }
        });
    }


    // --- Source 2: Active Duel Sections ---
    let duelQuestions: DuelQuestion[] = [];
    const activeSectionsQuery = query(collection(db, 'teachers', teacherUid, 'duelQuestionSections'), where('isActive', '==', true));
    const activeSectionsSnapshot = await getDocs(activeSectionsQuery);

    for (const sectionDoc of activeSectionsSnapshot.docs) {
        const questionsSnapshot = await getDocs(collection(sectionDoc.ref, 'questions'));
        questionsSnapshot.forEach(qDoc => {
            duelQuestions.push({ id: qDoc.id, ...qDoc.data() } as DuelQuestion);
        });
    }

    const normalizedDuelQuestions = duelQuestions.map(normalizeDuelQuestion);

    // --- Combine and Select Questions ---
    const allAvailableQuestions = [...chapterQuestions, ...normalizedDuelQuestions];

    if (allAvailableQuestions.length === 0) {
        return [];
    }

    const shuffledQuestions = shuffleArray(allAvailableQuestions);
    return shuffledQuestions.slice(0, 10);
}


export async function completeDailyTraining(input: CompleteTrainingInput): Promise<ActionResponse> {
    const { teacherUid, studentUid, score, totalQuestions } = input;
    if (!teacherUid || !studentUid) return { success: false, error: 'Invalid input.' };

    try {
        const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
        const [studentSnap, settings] = await Promise.all([
            getDoc(studentRef),
            getDuelSettings(teacherUid)
        ]);

        if (!studentSnap.exists()) throw new Error("Student not found.");
        const student = studentSnap.data() as Student;

        // Check if the student has already received rewards today.
        let alreadyCompletedToday = false;
        if (student.lastDailyTraining) {
            const today = new Date();
            const lastTrainingDate = student.lastDailyTraining.toDate();
            // Using a 23-hour check to be slightly more lenient than a strict calendar day check
            const hoursSinceLastCompletion = (today.getTime() - lastTrainingDate.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLastCompletion < 23) {
                alreadyCompletedToday = true;
            }
        }
        
        if (alreadyCompletedToday) {
            // Allow them to complete it, but don't give rewards.
            return { success: true, message: "You successfully completed another round of training today, but can only recieve rewards once every 24 hours, as per the Guild Leader's Instructions!" };
        }


        // If not completed today, proceed with rewards.
        const scorePercentage = totalQuestions > 0 ? score / totalQuestions : 0;
        
        const xpToAward = Math.ceil((settings.dailyTrainingXpReward || 0) * scorePercentage);
        const goldToAward = Math.ceil((settings.dailyTrainingGoldReward || 0) * scorePercentage);

        let updates: Partial<Student> = {
            lastDailyTraining: serverTimestamp(),
        };

        if (goldToAward > 0) updates.gold = increment(goldToAward);

        // Handle Level Up
        if (xpToAward > 0) {
            const newXp = (student.xp || 0) + xpToAward;
            const levelUpdates = handleLevelChange(student, newXp);
            updates = { ...updates, ...levelUpdates };
        }

        await updateDoc(studentRef, updates);

        if (xpToAward > 0 || goldToAward > 0) {
            await logAvatarEvent(teacherUid, studentUid, {
                source: 'Daily Training',
                xp: xpToAward,
                gold: goldToAward,
                reason: `Scored ${score}/${totalQuestions} on daily quiz.`,
            });
        }

        return { success: true, message: `Training complete! You earned ${xpToAward} XP and ${goldToAward} Gold!` };

    } catch (error: any) {
        console.error("Error completing daily training:", error);
        return { success: false, error: error.message || 'Failed to record training completion.' };
    }
}
