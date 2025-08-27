
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
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%201%20(1).jpg?alt=media&token=72a26a9d-39e1-438a-8334-889f519a9379',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%201%20(2).jpg?alt=media&token=8237d1b6-b9ce-4764-8eeb-f090fa4d7d1a',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%201%20(3).jpg?alt=media&token=20605c85-ae1b-44ee-8c6e-24d8f436f076',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%201%20(4).jpg?alt=media&token=7f651466-7a93-4ecd-bde8-0e6a1b8357bc',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%201%20(5).jpg?alt=media&token=da3efe96-8a4b-4b7f-916b-cb6930414b37',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%201%20(6).jpg?alt=media&token=4b6c1ce4-f307-4bd9-8b11-73211f20a7eb',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%201%20(7).jpg?alt=media&token=a91ac001-17d0-43b0-96ea-7cef4ccc0de2',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%201%20(8).jpg?alt=media&token=f729408b-fed0-4b83-a649-598f36914bcd'
    ],
    2: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%202%20(1).jpg?alt=media&token=13f14310-3072-4d1b-9ba5-d32b53c0684d',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%202%20(2).jpg?alt=media&token=3312b125-d900-44d4-aaac-f4a9ede78e23',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%202%20(3).jpg?alt=media&token=897f087f-b413-4a50-891c-6a22e99a237f',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%202%20(4).jpg?alt=media&token=ffb9d421-864d-45f3-ad77-8dab589e03a1',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%202%20(5).jpg?alt=media&token=1b171fff-96d3-4dda-bc7b-95a646146e64',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%202%20(6).jpg?alt=media&token=32e795b0-1c39-430d-bf1b-45614c55d814',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%202%20(7).jpg?alt=media&token=49f51e35-0464-4455-a3f0-a1319c17bb15',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%202%20(8).jpg?alt=media&token=7cfb168d-b386-4ae5-a6f2-182a4bc263c3'
    ],
    3: [
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%203%20(5).jpg?alt=media&token=dd9da982-6490-470a-a052-09f13562bf79',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%203%20(3).jpg?alt=media&token=f3c15a0f-6e6d-488e-b1e3-4616ea3f0889',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%203%20(8).jpg?alt=media&token=52509232-13ff-43f5-9520-3ad0b2385f99',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%203%20(1).jpg?alt=media&token=7113fdd9-e452-4316-b071-fbdb5334812f',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%203%20(2).jpg?alt=media&token=00a6e56a-1380-4600-bc1b-31aaabf3494f',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%203%20(6).jpg?alt=media&token=a8705fe6-9248-4aa9-a68e-586bb2866bd1',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%203%20(4).jpg?alt=media&token=b64aeb33-9ece-4ed5-8d30-e096b2a79a97',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%203%20(7).jpg?alt=media&token=824b046a-7165-42bc-b813-a17f25cc7776'
    ],
    4: [
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%204%20(1).jpg?alt=media&token=2fcfcb0e-e7f7-41a9-a466-ae8205d22cf2',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%204%20(2).jpg?alt=media&token=41a7af27-991b-4981-a6b8-c2f329b897c3',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%204%20(3).jpg?alt=media&token=3768ef4e-374d-482f-8602-d39c0e4fd904',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%204%20(4).jpg?alt=media&token=ec1a7ba4-0fda-463b-bf79-54d003a4a896',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%204%20(5).jpg?alt=media&token=e8c8b98b-c2c5-4d16-b54d-7a3fa5a06a2a',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%204%20(6).jpg?alt=media&token=9fbf6621-babd-40f0-bd9b-1e7be66133f7',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%204%20(7).jpg?alt=media&token=13b3224b-8703-442a-ba62-51897013cb29',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%204%20(8).jpg?alt=media&token=09dfa16c-6cf7-4bbe-bd08-2032120988c1'
    ],
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
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%201%20Healer%20(1).jpg?alt=media&token=1baa8333-4960-43a3-b0c2-19990d885364',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%201%20Healer%20(2).jpg?alt=media&token=ba046a2e-c9dc-49e6-9627-88fa858abd12',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%201%20Healer%20(3).jpg?alt=media&token=0fa0b048-9404-44de-a2de-aa75056f44ad',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%201%20Healer%20(4).jpg?alt=media&token=a1b41d23-1e1d-4271-a417-ded15607ed45',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%201%20Healer%20(5).jpg?alt=media&token=17f39687-3ff5-4d2b-baf7-5e0cb7eee218',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%201%20Healer%20(6).jpg?alt=media&token=453263d7-ab0b-4759-a4d7-ca39a9ac2133',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%201%20Healer%20(7).jpg?alt=media&token=9a139455-a617-4453-b904-d86c2345af32',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%201%20Healer%20(8).jpg?alt=media&token=c4a5ae5c-6259-44c5-acea-ca45f0f19db1'
    ],
    2: [
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%202%20(1).jpg?alt=media&token=ec205d05-ed0d-4c37-a1cb-3b06edd532e4',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%202%20(2).jpg?alt=media&token=bf7e6e66-f010-4c2b-ac72-3a2737171a20',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%202%20(3).jpg?alt=media&token=76b4a7a0-09a7-4531-800c-99db3be4e57b',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%202%20(4).jpg?alt=media&token=431561cd-c3b5-4660-9fd5-dff7ea6bbd5f',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%202%20(5).jpg?alt=media&token=79f3cb99-bca3-42be-b788-22f4b7e5a4c1',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%202%20(6).jpg?alt=media&token=f4fbde86-a318-4f5f-8dad-b6fea1ff126b',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%202%20(7).jpg?alt=media&token=b79bb544-6076-45ae-972b-e9d5872d879e',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%202%20(8).jpg?alt=media&token=329bee89-1d37-4daa-a7cf-82f80eb2d82a'
    ],
    3: [
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%203%20(1).jpg?alt=media&token=46879625-d352-4d83-b837-efac27c72b3b',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%203%20(2).jpg?alt=media&token=c7548d45-9985-4134-8c40-481279eda589',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%203%20(3).jpg?alt=media&token=f8962335-d081-4360-87e7-cd57e0e874fc',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%203%20(6).jpg?alt=media&token=8c405d41-25bb-48b0-bc20-b09c7ae02140',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%203%20(7).jpg?alt=media&token=9b1b9631-8a66-43c6-b9d8-4577e238664d',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%203%20(8).jpg?alt=media&token=758f0551-e830-497d-9ba5-74f504e6e2ef',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%203%20(9).jpg?alt=media&token=51a93043-5c87-4ee1-b052-a76469146ff3',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%203.jpg?alt=media&token=9f5845ab-db62-4642-a084-633fd327404e'
    ],
    4: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%204%20(1).jpg?alt=media&token=d10af6f4-4138-454f-8724-7ae5d3e56897',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%204%20(2).jpg?alt=media&token=6ec86a83-b82f-466a-8424-049d201e44ac',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%204%20(3).jpg?alt=media&token=b9fb783d-bb9a-4e8b-a2e1-7dc03656f9e2',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%204%20(4).jpg?alt=media&token=cf10c883-ff28-4d75-b167-411c61a89bf6',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%204%20(5).jpg?alt=media&token=bdb2ed75-fd41-459d-9b8a-e3540d78f334',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%204%20(6).jpg?alt=media&token=12ead043-890c-4d5a-9281-e3f0c8b930ff',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%204%20(7).jpg?alt=media&token=7de8d122-9457-4e46-aac2-ecfb423c088c',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%204%20(8).jpg?alt=media&token=5e0a96a8-1849-4863-8375-2b42d5a9237b'
    ],
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
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%201%20(1).jpg?alt=media&token=7b9c5352-8dc6-414d-84fd-acf4fa86ebde',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%201%20(2).jpg?alt=media&token=0a6286df-5ab7-48e8-a2b7-9c73e7d3ffe1',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%201%20(3).jpg?alt=media&token=32ca0c3b-2f39-40cf-ad53-3f86dbd60906',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%201%20(4).jpg?alt=media&token=c23635e5-bbf7-4df6-aa8e-83c68bcb97f3',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%201%20(5).jpg?alt=media&token=ad31f0a8-77db-4151-9821-f6c41d3fbe67',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%201%20(6).jpg?alt=media&token=5e19bc42-d4e1-440a-b3ed-9044385a2f7f',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%201%20(7).jpg?alt=media&token=8999dbcd-043f-4ecb-8eac-29c174474a28',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%201%20(8).jpg?alt=media&token=df65fbd7-e791-41ab-b6ef-7491aacf1b84'
    ],
    2: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%202%20(1).jpg?alt=media&token=1689ed00-9d7b-4f11-8cc5-33c92d3a3130',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%202%20(2).jpg?alt=media&token=c9b28e67-89e2-4399-aa95-659c81db8c07',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%202%20(3).jpg?alt=media&token=b9ad0f3f-2675-45fc-bde9-b3ba89fcd055',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%202%20(4).jpg?alt=media&token=f8eb4f32-6874-4823-b5be-22ecd6b1ec49',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%202%20(5).jpg?alt=media&token=100f07ca-069f-4425-baee-7d6653011450',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%202%20(6).jpg?alt=media&token=1d46da5e-69f5-4721-a2f4-1cfcdcc9463d',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%202%20(7).jpg?alt=media&token=8941fa94-b80a-4357-9cea-7c49d79825a9',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%202%20(8).jpg?alt=media&token=b6abe374-ea1e-4587-96e1-815e09149d5c'
    ],
    3: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMAge%20Level%203%20(1).jpg?alt=media&token=ced1f636-fd40-42b8-a285-c805dd898260',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMAge%20Level%203%20(2).jpg?alt=media&token=68eecda7-46ea-4a11-addc-cb2f9f640e4a',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMAge%20Level%203%20(3).jpg?alt=media&token=e89b603e-68fa-4e29-8cfc-198193f82e95',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMAge%20Level%203%20(4).jpg?alt=media&token=dcea9b3f-955f-4d84-b569-00938ce1c0c6',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMAge%20Level%203%20(5).jpg?alt=media&token=afec6319-6c88-4664-813b-df00bd9d7c09',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMAge%20Level%203%20(6).jpg?alt=media&token=e31ce166-d792-4db4-bb8f-8526c3c5f35e',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMAge%20Level%203%20(7).jpg?alt=media&token=a29776e6-edf8-4e24-801c-2d932ed3bfef',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2Fenvato-labs-ai-f73a1932-365e-44ea-88ab-0f6328cb5b34.jpg?alt=media&token=d243b432-1e09-4da6-9592-509f9d580940'
    ],
    4: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%204%20(1).jpg?alt=media&token=1a0f7211-61af-443f-b34b-47f8fbdfcd0c',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%204%20(2).jpg?alt=media&token=ca373f33-1894-41fb-9803-07baeb75ed1b',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%204%20(3).jpg?alt=media&token=c1202ba8-b065-4bb9-851e-2980144b22c2',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%204%20(4).jpg?alt=media&token=7f21e819-58d5-4773-ab7e-c71e4167bbac',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%204%20(5).jpg?alt=media&token=c6bfe442-7a3a-4717-9e1f-e1700b23c267',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%204%20(6).jpg?alt=media&token=9128381f-b314-4575-b067-6c58e3518138',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%204%20(7).jpg?alt=media&token=76c00e3a-4e99-4075-a34c-7ff6b0ecb4c3',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%204%20(8).jpg?alt=media&token=fa51469e-c939-4fde-8775-ba4319e0d474'
    ],
    5: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%205%20Mages%20(1).png?alt=media&token=0778498a-e4cc-4cb9-98d3-63a1d6cc5960',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%205%20Mages%20(2).png?alt=media&token=da350441-81ca-4316-821e-d6586046c054',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%205%20Mages%20(3).png?alt=media&token=ea57e377-cbc7-4c2a-afc8-0e7c355425fe',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%205%20Mages%20(4).png?alt=media&token=96718080-726e-44ab-861f-c3de46a6a764',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%205%20Mages%20(5).png?alt=media&token=e350ebb9-7366-40c9-a760-7fe8fe06bcec',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%205%20Mages%20(6).png?alt=media&token=4f0fcf35-9fc9-45a2-976f-785e8938c297',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%205%20Mages%20(7).png?alt=media&token=c3320dca-6caa-4320-b9af-e18dc3b6fc63',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FLevel%205%20Mages%20(8).png?alt=media&token=0b10faa0-c81f-455b-bd36-29b86908cd42'
    ],
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

    

    
