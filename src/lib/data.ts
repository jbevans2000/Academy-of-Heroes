

export type ClassType = 'Guardian' | 'Healer' | 'Mage' | '';

export type Company = {
    id: string;
    name: string;
    logoUrl?: string;
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
    inventory?: { [boonId: string]: number }; // Map of boonId to quantity
    questApprovalRequired?: boolean; // Student-specific override
    isArchived?: boolean; // To hide accounts after data migration
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
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%201%20(1).jpg?alt=media&token=785166ae-6bc3-418e-9649-303e503e540b',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%201%20(2).jpg?alt=media&token=3935609f-c09a-4f73-ac42-9e29174851f1',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%201%20(3).jpg?alt=media&token=a8851b5f-34a3-49c8-a2f0-675c76de8c9e',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%201%20(4).jpg?alt=media&token=cf5ca768-65dc-4831-88d9-872dab12710f',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%201%20(5).jpg?alt=media&token=92c781c8-9654-4772-a2b9-f8f79bfed4c4',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%201%20(6).jpg?alt=media&token=1e6d027c-9745-45b4-ad00-1d1e3ee8a4c1',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%201%20(7).jpg?alt=media&token=8c914f55-7faf-4a0a-b21e-82088cca6086',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%201%20(8).jpg?alt=media&token=c283d613-712e-4f78-bc68-3d7d92aa9271'
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

    
