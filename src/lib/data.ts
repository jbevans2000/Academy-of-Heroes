

import type { AvatarLogEntry } from './avatar-log';

export type ClassType = 'Guardian' | 'Healer' | 'Mage' | '';

export type Company = {
    id: string;
    name: string;
    logoUrl?: string;
    backgroundUrl?: string;
    color?: string; // e.g., 'hsl(0, 72%, 51%)'
}

export interface Message {
  id: string;
  text: string;
  sender: 'teacher' | 'student' | 'admin';
  timestamp: any; // Firestore ServerTimestamp
  isRead: boolean;
  imageUrl?: string; // New field for image attachments
  senderName?: string; // For student->teacher or teacher->admin messages
}

export type Teacher = {
    id: string;
    name: string;
    className: string;
    hasUnreadAdminMessages?: boolean;
    lastSeenBroadcastTimestamp?: any;
    isChatEnabled?: boolean;
    isCompanyChatActive?: boolean;
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
    rewardedSideQuestChapters?: string[]; // For tracking one-time side quest rewards
    hubsCompleted: number; // The order number of the last hub completed
    isNewlyApproved?: boolean;
    unseenLevelUp?: boolean; // New flag for level up notification
    lastChapterCompletion?: any; // Firestore ServerTimestamp
    lastDailyRegen?: any; // Firestore ServerTimestamp
    lastDailyTraining?: any; // Firestore ServerTimestamp
    lastUsedVeteransInsight?: any; // Timestamp for Guardian's power cooldown
    lastReceivedVeteransInsight?: any; // Timestamp for receiving the benefit
    lastUsedProvision?: any; // Timestamp for Provision caster cooldown
    lastReceivedProvision?: any; // Timestamp for Provision target cooldown
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
    equippedPetId?: string; // New field for pets
    petTransforms?: { // Student-specific overrides for pet positions
        [bodyId: string]: {
            x: number;
            y: number;
            scale: number;
            rotation?: number;
        }
    };
    equippedBodyId?: string; // The ID of the base body model
    equippedHairstyleId?: string;
    equippedHairstyleColor?: string; // The URL of the specific color variation
    equippedHairstyleTransforms?: { // Student-specific overrides for hairstyle positions
        [bodyId: string]: {
            x: number;
            y: number;
            scale: number;
            rotation?: number;
        }
    };
    armorTransforms?: { // Student-specific overrides for armor positions
        [armorId: string]: {
            [bodyId: string]: {
                x: number;
                y: number;
                scale: number;
                rotation?: number;
            }
        }
    };
    armorTransforms2?: { // Student-specific overrides for a second armor piece
        [armorId: string]: {
            [bodyId: string]: {
                x: number;
                y: number;
                scale: number;
                rotation?: number;
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
    isChampion?: boolean;
    avatarLog?: AvatarLogEntry[]; // This will likely not be stored on the student doc itself
    isInMeditationChamber?: boolean;
    meditationMessage?: string;
    meditationReleaseAt?: any; // Firestore ServerTimestamp
    meditationDuration?: number | null; // Duration in minutes
    meditationShowTimer?: boolean; // Show timer to student
    forceLogout?: boolean; // Flag to trigger client-side logout
    shadowMarks?: number;
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
