
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
    avatarUrl: string;
    backgroundUrl: string;
    xp: number;
    gold: number;
    level: number;
    hp: number;
    mp: number;
    maxHp: number;
    maxMp: number;
    questProgress: { [hubId: string]: number }; // e.g., { hubId1: 2, hubId2: 0 } means chapter 2 is last completed in hub1
    hubsCompleted: number; // The order number of the last hub completed
    isNewlyApproved?: boolean;
    onlineStatus?: {
        status: 'online' | 'offline';
        lastSeen: any; // Firestore ServerTimestamp
    };
    companyId?: string;
    inBattle: boolean; 
    inDuel?: boolean;
    inventory?: { [boonId: string]: number }; // Map of boonId to quantity
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
    avatars: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%201%20(1).jpg?alt=media&token=72a26a9d-39e1-438a-8334-889f519a9379',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%201%20(2).jpg?alt=media&token=8237d1b6-b9ce-4764-8eeb-f090fa4d7d1a',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%201%20(3).jpg?alt=media&token=20605c85-ae1b-44ee-8c6e-24d8f436f076',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%201%20(4).jpg?alt=media&token=7f651466-7a93-4ecd-bde8-0e6a1b8357bc',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%201%20(5).jpg?alt=media&token=da3efe96-8a4b-4b7f-916b-cb6930414b37',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%201%20(6).jpg?alt=media&token=4b6c1ce4-f307-4bd9-8b11-73211f20a7eb',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%201%20(7).jpg?alt=media&token=a91ac001-17d0-43b0-96ea-7cef4ccc0de2',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%201%20(8).jpg?alt=media&token=f729408b-fed0-4b83-a649-598f36914bcd'
    ],
    backgrounds: [],
    baseStats: { hp: 12, mp: 8 },
  },
  Healer: {
    avatars: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%201%20Healer%20(1).jpg?alt=media&token=1baa8333-4960-43a3-b0c2-19990d885364',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%201%20Healer%20(2).jpg?alt=media&token=ba046a2e-c9dc-49e6-9627-88fa858abd12',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%201%20Healer%20(3).jpg?alt=media&token=0fa0b048-9404-44de-a2de-aa75056f44ad',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%201%20Healer%20(4).jpg?alt=media&token=a1b41d23-1e1d-4271-a417-ded15607ed45',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%201%20Healer%20(5).jpg?alt=media&token=17f39687-3ff5-4d2b-baf7-5e0cb7eee218',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%201%20Healer%20(6).jpg?alt=media&token=453263d7-ab0b-4759-a4d7-ca39a9ac2133',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%201%20Healer%20(7).jpg?alt=media&token=9a139455-a617-4453-b904-d86c2345af32',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%201%20Healer%20(8).jpg?alt=media&token=c4a5ae5c-6259-44c5-acea-ca45f0f19db1'
    ],
    backgrounds: [],
    baseStats: { hp: 8, mp: 12 },
  },
  Mage: {
    avatars: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%201%20(1).jpg?alt=media&token=7b9c5352-8dc6-414d-84fd-acf4fa86ebde',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%201%20(2).jpg?alt=media&token=0a6286df-5ab7-48e8-a2b7-9c73e7d3ffe1',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%201%20(3).jpg?alt=media&token=32ca0c3b-2f39-40cf-ad53-3f86dbd60906',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%201%20(4).jpg?alt=media&token=c23635e5-bbf7-4df6-aa8e-83c68bcb97f3',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%201%20(5).jpg?alt=media&token=ad31f0a8-77db-4151-9821-f6c41d3fbe67',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%201%20(6).jpg?alt=media&token=5e19bc42-d4e1-440a-b3ed-9044385a2f7f',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%201%20(7).jpg?alt=media&token=8999dbcd-043f-4ecb-8eac-29c174474a28',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%201%20(8).jpg?alt=media&token=df65fbd7-e791-41ab-b6ef-7491aacf1b84'
    ],
    backgrounds: [],
    baseStats: { hp: 6, mp: 15 },
  },
};
