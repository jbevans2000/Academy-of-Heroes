export type ClassType = 'Guardian' | 'Healer' | 'Mage' | '';

export type Avatar = {
  id: number;
  src: string;
  name: string;
  hint: string;
};

export type Background = {
  id: number;
  src: string;
  name: string;
  hint: string;
};

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
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Images%2FTrickster%201%20(Level%201%20Guardian%20Images).png?alt=media&token=1d82ab1e-9631-4d14-8cac-91c943758b9f',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Images%2FTrickster%202%20(Level%201%20Guardian%20Images).png?alt=media&token=b4d5ba45-2a57-446d-86d6-4183ba231104',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Images%2FTrickster%203%20(Level%201%20Guardian%20Images).png?alt=media&token=dfc45b89-dbd0-4fbd-90ad-d5632cb130ee',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Images%2FTrickster%204%20(Level%201%20Guardian%20Images).png?alt=media&token=d526181b-f8fb-42b6-80a5-ae101d7e63b5',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Images%2FTrickster%205%20(Level%201%20Guardian%20Images).png?alt=media&token=5dbf4c82-f529-4e40-9a95-6ab0de2354da',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Images%2FTrickster%207%20(Level%201%20Guardian%20Images).png?alt=media&token=cbb6584f-f732-4bc5-a538-9ccc08dabef2',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Images%2FTrickster%208%20(Level%201%20Guardian%20Images).png?alt=media&token=f33d3ca1-a917-4920-bd81-b55141969354',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Images%2FTrickster%206%20(Level%201%20Guardian%20Images).png?alt=media&token=804c9933-d7d9-4336-8bf5-d0cc9e91a5d4'
    ],
    backgrounds: [
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Backgrounds%2FGuardian%201.jpg?alt=media&token=d735a40c-e25e-4fab-98d3-526bb0411dfe',
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Backgrounds%2FGuardian%202.jpg?alt=media&token=56ee60eb-b61b-42d2-9e17-a001371676ac',
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Backgrounds%2FGuardian%203.jpg?alt=media&token=e76ab493-261d-4169-a8a3-fd1cb9305d25',
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Backgrounds%2FGuardian%204.jpg?alt=media&token=48d5dae0-8ac7-478f-b00d-98b60243e9e8',
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Backgrounds%2FGuardian%205.jpg?alt=media&token=b52eb943-601c-4565-9277-44bb6ce91672',
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Backgrounds%2FGuardian%206.jpg?alt=media&token=f5661f1a-d05e-404d-bfbe-995dbd94ed81',
    ],
  },
  Healer: {
    avatars: [
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Healer%20Images%2FHealer%201%20(Level%201%20Healer%20Images).png?alt=media&token=a3d8c43a-5d9e-4fce-9803-4c5481503f96',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Healer%20Images%2FHealer%202%20(Level%201%20Healer%20Images).png?alt=media&token=35a026ae-c867-43c1-8abe-825fa1c75caf',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Healer%20Images%2FHealer%203%20(Level%201%20Healer%20Images).png?alt=media&token=d40ad279-8af6-439d-ac51-45a301d85e93',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Healer%20Images%2FHealer%204%20(Level%201%20Healer%20Images).png?alt=media&token=0b051eac-3d61-4e73-9463-f7b8a7348e78',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Healer%20Images%2FHealer%205%20(Level%201%20Healer%20Images).png?alt=media&token=ec4dbdd5-b766-4744-9bce-b5e764b5cedb',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Healer%20Images%2FHealer%206%20(Level%201%20Healer%20Images).png?alt=media&token=eb5da75f-0bb8-4196-85a1-93e0b6d3c7d3',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Healer%20Images%2FHealer%207%20(Level%201%20Healer%20Images).png?alt=media&token=d9e5d39f-4b66-4c64-b360-ca18406990ca',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Healer%20Images%2FHealer%208%20(Level%201%20Healer%20Images).png?alt=media&token=b46f9c42-f533-4dd1-aa61-a014c8656006'
    ],
    backgrounds: [
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Healer%20Backgrounds%2FHealer%201.jpg?alt=media&token=6c41882c-39f1-46a4-9f9f-569dfdaec95d',
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Healer%20Backgrounds%2FHealer%202.jpg?alt=media&token=1dacf27a-6cab-4017-b35c-1cbc2ddf7440',
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Healer%20Backgrounds%2FHealer%203.jpg?alt=media&token=db1e13da-4e76-4158-85ef-b55769172561',
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Healer%20Backgrounds%2FHealer%204.jpg?alt=media&token=2824d55b-945b-443a-a73b-07931dee7cf2',
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Healer%20Backgrounds%2FHealer%205.jpg?alt=media&token=1d8464e7-a187-4e89-804a-5bd90278b730',
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Healer%20Backgrounds%2FHealer%206.jpg?alt=media&token=f55f0039-69b2-4591-a87e-a10fcc2f7224',
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
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Mage%20Backgrounds%2FMage%206.jpg?alt=media&token=722b4a2a-1fee-4f8b-8c53-4b60a8ef4b6a',
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Mage%20Backgrounds%2Fmage%201.jpg?alt=media&token=5650b386-264c-4429-a2f5-44d10a255815',
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Mage%20Backgrounds%2Fmage%202.jpg?alt=media&token=b1ab5725-d274-49ca-b4fd-3592df620f08',
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Mage%20Backgrounds%2Fmage%203.jpg?alt=media&token=35cc4faf-8009-40b4-a9b7-3b886ac6e45d',
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Mage%20Backgrounds%2Fmage%204.jpg?alt=media&token=00278e1e-cbc4-4ee6-a63f-dbd17f4a0cad',
        'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Mage%20Backgrounds%2Fmage%205.jpg?alt=media&token=cc876575-c0da-4d0e-af52-249ac60631cb'
    ],
  },
};
