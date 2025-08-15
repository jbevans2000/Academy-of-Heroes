
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
    backgrounds: [
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Backgrounds%2FGuardian%201.jpg?alt=media&token=d735a40c-e25e-4fab-98d3-526bb0411dfe'
    ],
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
    backgrounds: [
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Healer%20Backgrounds%2FHealer%201.jpg?alt=media&token=6c41882c-39f1-46a4-9f9f-569dfdaec95d'
    ],
  },
  Mage: {
    avatars: [
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Mage%20Images%2FArcanist%201%20(Level%201%20Mage%20Images).png?alt=media&token=ad00587d-b1f1-40ec-b6af-d46e8f27a29d',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Mage%20Images%2FArcanist%202%20(Level%201%20Mage%20Images).png?alt=media&token=677a9e7d-85c1-4d28-8a32-8577d8457cd5',
      'https://placehold.co/256x256/9b59b6/ffffff?text=Mage+3',
      'https://placehold.co/256x256/9b59b6/ffffff?text=Mage+4',
      'https://placehold.co/256x256/9b59b6/ffffff?text=Mage+5',
      'https://placehold.co/256x256/9b59b6/ffffff?text=Mage+6',
      'https://placehold.co/256x256/9b59b6/ffffff?text=Mage+7',
      'https://placehold.co/256x256/9b59b6/ffffff?text=Mage+8',
    ],
    backgrounds: [
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Mage%20Backgrounds%2FMage%206.jpg?alt=media&token=722b4a2a-1fee-4f8b-8c53-4b60a8ef4b6a'
    ],
  },
};
