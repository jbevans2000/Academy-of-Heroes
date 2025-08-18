
export type ClassType = 'Guardian' | 'Healer' | 'Mage' | '';

export type Student = {
    uid: string;
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
}

export type PendingStudent = {
  uid: string;
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
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FLevel%201%20Guardian%20(1).jpg?alt=media&token=2761d6ca-be36-4fe6-9265-8aa558884049',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FLevel%201%20Guardian%20(2).jpg?alt=media&token=bb71385e-827f-419d-b890-75cff842e63f',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FLevel%201%20Guardian%20(3).jpg?alt=media&token=44d4a143-1a3a-4f86-a8cd-202a3c1e2027',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FLevel%201%20Guardian%20(4).jpg?alt=media&token=07a33df5-1792-4eb9-8cc0-6a76cd58b9ef',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FLevel%201%20Guardian%20(5).jpg?alt=media&token=cbd4643d-8a57-4b01-badc-e970378c58ef',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FLevel%201%20Guardian%20(6).jpg?alt=media&token=f107f3b2-762b-41b7-8b08-6c5276550bb4',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FLevel%201%20Guardian%20(7).jpg?alt=media&token=79549f62-d40e-4538-8a84-a96c8aace7be',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FLevel%201%20Guardian%20(8).jpg?alt=media&token=8a6ff376-8bf5-40ed-b0cd-f515f7fe9e7e'
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
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%201%20Mage%201%20(1).jpg?alt=media&token=db49b029-7439-4fd0-a384-9b2b5fe379e6',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%201%20Mage%201%20(2).jpg?alt=media&token=c4072793-0f1b-421a-9ef9-fbff970e772a',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%201%20Mage%201%20(3).jpg?alt=media&token=6c400f17-ab01-4824-9d32-fe45d0c8d0e6',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%201%20Mage%201%20(4).jpg?alt=media&token=31628582-893f-47d8-8e36-50da6575da6b',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%201%20Mage%201%20(5).jpg?alt=media&token=2827a9b8-c49a-4fd3-a43c-7fe799b9694b',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%201%20Mage%201%20(6).jpg?alt=media&token=6db18bba-3923-44a0-bde1-7ebaf5cd5f1b',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%201%20Mage%201%20(7).jpg?alt=media&token=6b520ca9-9c40-4be6-bdfb-9ccf185440ee',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%201%20Mage%201%20(8).jpg?alt=media&token=c3f4688e-f03a-4e26-a10b-d27c529cf3a9'
    ],
    backgrounds: [],
    baseStats: { hp: 6, mp: 15 },
  },
};

    