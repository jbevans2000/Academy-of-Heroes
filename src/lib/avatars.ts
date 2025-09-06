
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
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%201%20(1).png?alt=media&token=0d6925da-3e3f-4754-9d77-3a557fc70bf9',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%201%20(2).png?alt=media&token=df5709db-da6c-41b4-bcf9-53b98ee22a80',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%201%20(3).png?alt=media&token=828d88cc-6d2f-4dd2-9343-f8ff1367fd43',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%201%20(4).png?alt=media&token=cbb70d3e-9beb-406d-b823-4eeae0c78256',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%201%20(5).png?alt=media&token=04df15bb-95ae-4124-badd-661977e0a904',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%201%20(6).png?alt=media&token=d695568e-8d59-472f-99ea-b61d9b27822e',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%201%20(7).png?alt=media&token=7d5d98ae-a556-4c3e-bfe0-6dad1fc67a15',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%201%20(8).png?alt=media&token=9e8df0da-392b-42d6-96c8-00ad54396884'
    ],
    2: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%202%20(2).png?alt=media&token=b4112b82-0e32-4473-9835-713522466c3e',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%202%20(1).png?alt=media&token=61d0d346-5c04-4c7a-a3ef-c15c8136e0e4',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%202%20(3).png?alt=media&token=298848e3-cf23-4a92-a935-985edcefb4bf',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%202%20(4).png?alt=media&token=ecc83b5c-bd2d-4f8c-a4b1-219b1c26d655',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%202%20(5).png?alt=media&token=dd74753c-bf6f-4009-9328-02a3742186de',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%202%20(6).png?alt=media&token=ce0f7614-0b6a-4e05-863c-e8c78b28d56c',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%202%20(7).png?alt=media&token=0814bbc9-5442-4b06-975b-942168a1738a',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%202%20(8).png?alt=media&token=df675b85-55b0-4abc-82ca-fafe303d551e'
    ],
    3: [
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%203%20(1).png?alt=media&token=d2dd2f51-243c-4309-8e32-f3eba4db9f20',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%203%20(2).png?alt=media&token=f842e9e3-3203-4358-8ef0-9a7e55848333',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%203%20(3).png?alt=media&token=d7c32ee8-3cdb-4738-a564-3dcbb8480b23',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%203%20(4).png?alt=media&token=88a1ee22-2fb0-4187-bc02-139a7f9eb86b',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%203%20(5).png?alt=media&token=addc7895-c6d1-453a-a14c-345e939c2d50',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%203%20(6).png?alt=media&token=9e33de74-458a-47f8-9fb7-8306b3d6b449',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%203%20(7).png?alt=media&token=30d99cd7-4c19-43bf-8ff1-169d317af836',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%203%20(8).png?alt=media&token=57a238fe-0ae2-48f7-b28b-b225d5e1c1fb'
    ],
    4: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%204%20(1).png?alt=media&token=7ef4e26c-cae0-4ec1-bdce-84bd864fc6f5',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%204%20(2).png?alt=media&token=913918c3-ccfc-497d-91fd-4ac496fc1b73',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%204%20(3).png?alt=media&token=1a1d11c5-b8d5-405d-a1d7-422ab0ef8292',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%204%20(4).png?alt=media&token=c623d253-6de2-4983-b94b-44798db40654',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%204%20(5).png?alt=media&token=a00b59b2-82c0-4ba3-8acf-6b44fc911249',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%204%20(6).png?alt=media&token=89ca2f75-1665-4b54-a35d-03c22bac3375',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%204%20(7).png?alt=media&token=bd277e22-3105-4407-950c-c423d8866e32',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%204%20(8).png?alt=media&token=7668dcd4-e045-4d64-8234-3a890f89789a'
    ],
    5: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%205%20(1).jpg?alt=media&token=ba3cfec4-10f9-4a96-8f5d-990a67180d77',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%205%20(2).jpg?alt=media&token=7b2bfdb8-83d5-4f40-85b6-7b9901256212',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%205%20(3).jpg?alt=media&token=4e0bc35c-0fc1-4c6d-83a0-da79ba73db8a',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%205%20(4).jpg?alt=media&token=5b3ab539-8fd6-42d8-84ef-ed0890e414df',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%205%20(5).jpg?alt=media&token=b8e3b140-cca8-4496-8081-8089c472cc90',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%205%20(6).jpg?alt=media&token=60087323-fe68-47d8-a7e8-53a9319a503a',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%205%20(7).jpg?alt=media&token=3a66dc62-7c79-4443-b76a-48b6d5321393',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%205%20(8).jpg?alt=media&token=86e3099a-d378-4dc6-9e65-2523d4f9b120'
    ],
    6: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%206%20(2).png?alt=media&token=df808f43-65a8-458d-8407-a9e79c52c057',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%206%20(3).png?alt=media&token=8baddac0-ccf3-47c0-9a20-845c7ba4de26',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%206%20(7).png?alt=media&token=f334879d-cfb7-4026-8c68-f823f57228cf',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%206%20(6).png?alt=media&token=14750532-ab4a-4ee1-bfa2-9ed4f5c27c10',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%206%20(4).png?alt=media&token=563dedcd-3c22-4c05-970f-8506449ec25b',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%206%20(1).png?alt=media&token=bee3fcf6-814b-4b83-a2f3-933944a56be0',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%206%20(5).png?alt=media&token=4b4dffe7-e4d1-4eac-8888-57aa6751ff9b',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Level%206%20(8).png?alt=media&token=b74c725b-927f-4dc6-9523-c42035015063'
    ],
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
    5: [
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%205%20Healers%20(1).png?alt=media&token=540479ca-fb8a-411d-82de-69858e5862a2',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%205%20Healers%20(2).png?alt=media&token=8d74c53d-a69b-402e-abe3-2df6cd5cc821',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%205%20Healers%20(3).png?alt=media&token=bd3a0b43-a5a6-4d99-9c0f-f957f5056be5',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%205%20Healers%20(4).png?alt=media&token=1ec1bc6f-3898-4cc4-927c-221a8961d28c',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%205%20Healers%20(5).png?alt=media&token=2c1b94d3-8b7a-450a-8a53-2b6cad5de8e5',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%205%20Healers%20(6).png?alt=media&token=8b0d5c6d-b5ea-4775-9fcb-9aaff1c10bbb',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%205%20Healers%20(7).png?alt=media&token=0beeed2e-3c1c-4c7c-a520-875ff362683f',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FLevel%205%20Healers%20(8).png?alt=media&token=ae08c651-b463-47df-8010-01b95754bf01'
    ],
    6: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%206%20(4).png?alt=media&token=52ee7415-d8db-4a50-b3e8-0776d30edca8',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%206%20(3).png?alt=media&token=b9eb4c31-e02c-4b82-8f94-ead2acd5fed9',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%206%20(5).png?alt=media&token=ee374d98-ddc5-4535-8a1f-cfe9e59d6f0d',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%206%20(2).png?alt=media&token=236f1e4a-cfff-4e1b-a6bd-f919a443c542',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%206%20(1).png?alt=media&token=c92f1e31-5e29-45e4-8c3a-53fcb4267983',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%206%20(6).png?alt=media&token=1269f08c-e225-400a-b359-d522ee3b39f6',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%206%20(8).png?alt=media&token=f1ba5ccc-a458-4ffd-a67b-9fc4df32d014',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FHealer%20Level%206%20(7).png?alt=media&token=26417e6a-76ae-4346-8c63-3f4161477eb7'
    ],
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
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%202%2Mage%20Level%202%20(8).jpg?alt=media&token=b6abe374-ea1e-4587-96e1-815e09149d5c'
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
    6: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%206%20(4).png?alt=media&token=a6954804-90a8-4cd1-961d-87c1d115ab81',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%206%20(2).png?alt=media&token=ddd18b2e-9f8c-47b4-890c-00c37690c407',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%206%20(5).png?alt=media&token=a1c4ced7-247b-4053-9480-7fc81847773c',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%206%20(1).png?alt=media&token=1de48491-0493-4a62-8950-838e97c4586e',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%206%20(8).png?alt=media&token=2eaa3b05-bf21-4d7b-ab3f-2f6301f67e84',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%206%20(3).png?alt=media&token=ccdca024-41ce-4f5b-9191-0ca6001dfa2c',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%206%20(6).png?alt=media&token=800e55f4-b790-4be4-af04-482643933481',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FMage%20Level%206%20(7).png?alt=media&token=0d3dfadd-ed8e-409c-8ae0-b9da0fd8d3f6'
    ],
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
