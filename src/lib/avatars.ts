
import type { ClassType } from './data';

type AvatarCollection = {
    [level: number]: string[];
}

type ClassAvatarData = {
    [key in ClassType]?: AvatarCollection;
}

const generatePlaceholders = (count: number, keyword: string) => {
    return Array.from({ length: count }, (_, i) => `https://placehold.co/400x400.png`);
}

export const avatarData: ClassAvatarData = {
  Guardian: {
    1: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FLevel%201%20Guardian%20(1).jpg?alt=media&token=2761d6ca-be36-4fe6-9265-8aa558884049',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FLevel%201%20Guardian%20(2).jpg?alt=media&token=bb71385e-827f-419d-b890-75cff842e63f',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FLevel%201%20Guardian%20(3).jpg?alt=media&token=44d4a143-1a3a-4f86-a8cd-202a3c1e2027',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FLevel%201%20Guardian%20(4).jpg?alt=media&token=07a33df5-1792-4eb9-8cc0-6a76cd58b9ef',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FLevel%201%20Guardian%20(5).jpg?alt=media&token=cbd4643d-8a57-4b01-badc-e970378c58ef',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FLevel%201%20Guardian%20(6).jpg?alt=media&token=f107f3b2-762b-41b7-8b08-6c5276550bb4',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FLevel%201%20Guardian%20(7).jpg?alt=media&token=79549f62-d40e-4538-8a84-a96c8aace7be',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FLevel%201%20Guardian%20(8).jpg?alt=media&token=8a6ff376-8bf5-40ed-b0cd-f515f7fe9e7e'
    ],
    2: generatePlaceholders(8, 'armored knight'),
    3: generatePlaceholders(8, 'fantasy paladin'),
    4: generatePlaceholders(8, 'holy warrior'),
    5: generatePlaceholders(8, 'epic knight'),
    6: generatePlaceholders(8, 'golden knight'),
    7: generatePlaceholders(8, 'dragon knight'),
    8: generatePlaceholders(8, 'royal guard'),
    9: generatePlaceholders(8, 'templar knight'),
    10: generatePlaceholders(8, 'divine guardian'),
    11: generatePlaceholders(8, 'crystal guardian'),
    12: generatePlaceholders(8, 'shadow guardian'),
    13: generatePlaceholders(8, 'ancient guardian'),
    14: generatePlaceholders(8, 'celestial guardian'),
    15: generatePlaceholders(8, 'legendary guardian'),
    16: generatePlaceholders(8, 'mythic guardian'),
    17: generatePlaceholders(8, 'astral guardian'),
    18: generatePlaceholders(8, 'sun guardian'),
    19: generatePlaceholders(8, 'moon guardian'),
    20: generatePlaceholders(8, 'ascended guardian'),
  },
  Healer: {
    1: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%201%20(1).jpg?alt=media&token=785166ae-6bc3-418e-9649-303e503e540b',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%201%20(2).jpg?alt=media&token=3935609f-c09a-4f73-ac42-9e29174851f1',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%201%20(3).jpg?alt=media&token=a8851b5f-34a3-49c8-a2f0-675c76de8c9e',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%201%20(4).jpg?alt=media&token=cf5ca768-65dc-4831-88d9-872dab12710f',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%201%20(5).jpg?alt=media&token=92c781c8-9654-4772-a2b9-f8f79bfed4c4',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%201%20(6).jpg?alt=media&token=1e6d027c-9745-45b4-ad00-1d1e3ee8a4c1',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%201%20(7).jpg?alt=media&token=8c914f55-7faf-4a0a-b21e-82088cca6086',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%201%20(8).jpg?alt=media&token=c283d613-712e-4f78-bc68-3d7d92aa9271'
    ],
    2: generatePlaceholders(8, 'fantasy cleric'),
    3: generatePlaceholders(8, 'holy priest'),
    4: generatePlaceholders(8, 'nature healer'),
    5: generatePlaceholders(8, 'epic cleric'),
    6: generatePlaceholders(8, 'light cleric'),
    7: generatePlaceholders(8, 'life cleric'),
    8: generatePlaceholders(8, 'war cleric'),
    9: generatePlaceholders(8, 'divine cleric'),
    10: generatePlaceholders(8, 'prophet'),
    11: generatePlaceholders(8, 'crystal healer'),
    12: generatePlaceholders(8, 'shadow healer'),
    13: generatePlaceholders(8, 'ancient healer'),
    14: generatePlaceholders(8, 'celestial healer'),
    15: generatePlaceholders(8, 'legendary healer'),
    16: generatePlaceholders(8, 'mythic healer'),
    17: generatePlaceholders(8, 'astral healer'),
    18: generatePlaceholders(8, 'sun healer'),
    19: generatePlaceholders(8, 'moon healer'),
    20: generatePlaceholders(8, 'ascended healer'),
  },
  Mage: {
    1: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%201%20Mage%201%20(1).jpg?alt=media&token=db49b029-7439-4fd0-a384-9b2b5fe379e6',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%201%20Mage%201%20(2).jpg?alt=media&token=c4072793-0f1b-421a-9ef9-fbff970e772a',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%201%20Mage%201%20(3).jpg?alt=media&token=6c400f17-ab01-4824-9d32-fe45d0c8d0e6',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%201%20Mage%201%20(4).jpg?alt=media&token=31628582-893f-47d8-8e36-50da6575da6b',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%201%20Mage%201%20(5).jpg?alt=media&token=2827a9b8-c49a-4fd3-a43c-7fe799b9694b',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%201%20Mage%201%20(6).jpg?alt=media&token=6db18bba-3923-44a0-bde1-7ebaf5cd5f1b',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%201%20Mage%201%20(7).jpg?alt=media&token=6b520ca9-9c40-4be6-bdfb-9ccf185440ee',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%201%20Mage%201%20(8).jpg?alt=media&token=c3f4688e-f03a-4e26-a10b-d27c529cf3a9'
    ],
    2: generatePlaceholders(8, 'fantasy wizard'),
    3: generatePlaceholders(8, 'dark mage'),
    4: generatePlaceholders(8, 'elemental wizard'),
    5: generatePlaceholders(8, 'epic mage'),
    6: generatePlaceholders(8, 'light wizard'),
    7: generatePlaceholders(8, 'arcane mage'),
    8: generatePlaceholders(8, 'fire mage'),
    9: generatePlaceholders(8, 'ice mage'),
    10: generatePlaceholders(8, 'archmage'),
    11: generatePlaceholders(8, 'crystal mage'),
    12: generatePlaceholders(8, 'shadow mage'),
    13: generatePlaceholders(8, 'ancient mage'),
    14: generatePlaceholders(8, 'celestial mage'),
    15: generatePlaceholders(8, 'legendary mage'),
    16: generatePlaceholders(8, 'mythic mage'),
    17: generatePlaceholders(8, 'astral mage'),
    18: generatePlaceholders(8, 'sun mage'),
    19: generatePlaceholders(8, 'moon mage'),
    20: generatePlaceholders(8, 'ascended mage'),
  },
};
