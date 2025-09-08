
export type ClassType = 'Guardian' | 'Healer' | 'Mage' | '';

export type Company = {
    id: string;
    name: string;
    logoUrl?: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'teacher' | 'student';
  timestamp: any; // Firestore ServerTimestamp
  isRead: boolean;
}

export type Student = {
    uid: string;
    teacherUid: string;
    studentId: string;
    email: string;
    studentName: string;
    characterName: string;
    class: ClassType;
    avatarUrl: string; // Will store static avatar URL
    useCustomAvatar?: boolean; // Flag to indicate if the avatar is custom built
    backgroundUrl: string;
    xp: number;
    gold: number;
    level: number;
    hp: number;
    mp: number;
    maxHp: number;
    maxMp: number;
    questProgress: { [hubId: string]: number }; // e.g., { hubId1: 2, hubId2: 0 } means chapter 2 is last completed in hub1
    completedChapters?: string[]; // New: Array of chapter UIDs for which rewards have been claimed.
    hubsCompleted: number; // The order number of the last hub completed
    isNewlyApproved?: boolean;
    lastChapterCompletion?: any; // Firestore ServerTimestamp
    companyId?: string;
    inBattle: boolean; 
    inDuel?: boolean;
    inventory?: { [boonId: string]: number }; // Map of boonId to quantity
    ownedArmorIds?: string[]; // IDs of armor pieces the student owns
    equippedHeadId?: string;
    equippedShouldersId?: string;
    equippedChestId?: string;
    equippedHandsId?: string;
    equippedLegsId?: string;
    equippedFeetId?: string;
    equippedBodyId?: string; // The ID of the base body model
    equippedHairstyleId?: string;
    equippedHairstyleColor?: string; // The URL of the specific color variation
    equippedHairstyleTransforms?: { // Student-specific overrides for hairstyle positions
        [bodyId: string]: {
            x: number;
            y: number;
            scale: number;
        }
    };
    armorTransforms?: { // Student-specific overrides for armor positions
        [armorId: string]: {
            [bodyId: string]: {
                x: number;
                y: number;
                scale: number;
            }
        }
    };
    armorTransforms2?: { // Student-specific overrides for a second armor piece
        [armorId: string]: {
            [bodyId: string]: {
                x: number;
                y: number;
                scale: number;
            }
        }
    };
    questApprovalRequired?: boolean; // Student-specific override
    isArchived?: boolean; // To hide accounts after data migration
    teacherNotes?: string; // Private notes for the teacher
    shielded?: {
        roundsRemaining: number;
        casterName: string;
    };
    guardedBy?: string | null; // UID of the Guardian protecting this student
    damageShield?: number; // For Absorb power
    isHidden?: boolean; // To temporarily hide from teacher dashboard
    hasUnreadMessages?: boolean; // Denormalized field for quick UI updates
    dailyDuelCount?: number;
    lastDuelCountReset?: any; // Firestore ServerTimestamp
}

export type PendingStudent = {
  uid: string;
  teacherUid: string;
  studentId: string;
  email: string;
  studentName: string;
  characterName: string;
  class: ClassType;
  avatarUrl: string;
  hp: number;
  mp: number;
  maxHp: number;
  maxMp: number;
  status: 'pending';
  requestedAt: any; // Firestore ServerTimestamp
}

export const classData = {
  Guardian: {
    baseStats: { hp: 12, mp: 8 },
  },
  Healer: {
    baseStats: { hp: 8, mp: 12 },
  },
  Mage: {
    baseStats: { hp: 6, mp: 15 },
  },
};
