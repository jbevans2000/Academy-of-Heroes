
      
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
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%202%20(1).png?alt=media&token=61d0d346-5c04-4c7a-a3ef-c15c8136e0e4',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%202%20(2).png?alt=media&token=b4112b82-0e32-4473-9835-713522466c3e',
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
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%205%20(1).png?alt=media&token=3b71a0de-9ea0-44fc-96dd-a254213861b9',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%205%20(2).png?alt=media&token=01bf6d0d-bfe8-4b08-95d8-93564123e384',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%205%20(3).png?alt=media&token=288f1d6f-abd1-4b1b-a564-09b0825bd62e',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%205%20(4).png?alt=media&token=5d079bbe-2801-4aa4-91ea-2e74bcedf1a1',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%205%20(5).png?alt=media&token=7bd7d2ca-0099-4070-99cf-af75a074d7e2',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%205%20(6).png?alt=media&token=35af8f04-e6de-4e22-9144-7813d7e8ab69',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%205%20(7).png?alt=media&token=f45b74ba-e7c5-41fc-8b3e-9edeab81a7fc',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%205%20(8).png?alt=media&token=ac3a704c-55b6-4649-b5c7-0db445e49368'
    ],
    6: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%206%20(1).png?alt=media&token=c356b711-8146-4ee4-9336-c5cd4bed6aa8',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%206%20(2).png?alt=media&token=59372f2f-9a30-439b-a0de-94f264f6ad59',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%206%20(3).png?alt=media&token=4d1e48f0-6337-429e-90fe-3f1d7b10ddce',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%206%20(4).png?alt=media&token=0d602273-a85b-4876-bfbf-800ff6dca6e1',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%206%20(5).png?alt=media&token=e0a423b9-abf8-4edd-95e5-11c9488fac5a',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%206%20(6).png?alt=media&token=208077ae-1b95-4380-8d48-075d411aa59d',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%206%20(7).png?alt=media&token=1b162009-00ac-4c9a-96da-62ef45cca914',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%206%20(8).png?alt=media&token=e5f7f607-e110-4b9b-9c66-50ed4fb2f932'
    ],
    7: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%207%20%20-%20Ice%20Knight%20(1).png?alt=media&token=57f8a17b-3517-4384-98cb-09826b57d73d',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%207%20%20-%20Ice%20Knight%20(2).png?alt=media&token=cba77a2d-50df-4d1b-b7cd-dade7bfe1e19',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%207%20%20-%20Ice%20Knight%20(3).png?alt=media&token=3201118a-9b6d-4eb6-8e74-0c73aaa6c231',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%207%20%20-%20Ice%20Knight%20(4).png?alt=media&token=4a5f5e97-5549-4cb7-aaa0-ee95ee91ea02',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%207%20%20-%20Ice%20Knight%20(5).png?alt=media&token=b4e1fd91-993d-44ef-b807-44ed9df8d159',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%207%20%20-%20Ice%20Knight%20(6).png?alt=media&token=9ea4339b-3857-4ff3-8403-3bbda4fcc984',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%207%20%20-%20Ice%20Knight%20(7).png?alt=media&token=8340576a-7ffd-4b46-a4ac-88af9dde2335',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%207%20%20-%20Ice%20Knight%20(8).png?alt=media&token=4f687dc8-ce3e-41d5-88ec-977af50d672c'
    ],
    8: [
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%208%20(7).png?alt=media&token=2d17dea0-5f64-48a4-9e58-4aad6c12b33e',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%208%20(8).png?alt=media&token=b59cf803-c061-4558-bd12-eb8f0a19adc4',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%208%20-%20Amazon%20(1).png?alt=media&token=2a78af70-d09c-421f-8bcd-b3c694719768',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%208%20-%20Amazon%20(2).png?alt=media&token=49d360c6-b113-4d6d-a7dd-d5855bcab9b0',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%208%20-%20Amazon%20(3).png?alt=media&token=2a2f4981-9670-4b97-a149-2a7bbdaf838b',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%208%20-%20Amazon%20(4).png?alt=media&token=e6452cd7-7345-4be5-b359-f60829a43026',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%208%20-%20Amazon%20(5).png?alt=media&token=207944c0-51a1-4bff-b91c-08aa73f14703',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Guardian%20Avatar%20Images%2FGuardian%20Transparent%2FGuardian%20Level%208%20-%20Amazon%20(6).png?alt=media&token=b93fd5ff-d66c-437f-a184-dd308c05df06'
    ],
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
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%201%20(1).png?alt=media&token=18efe50c-2220-48e8-80ca-1b5423920f7a',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%201%20(2).png?alt=media&token=49b9461b-60bf-4491-ab73-382ccdda28db',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FChatGPT%20Image%20Sep%205%2C%202025%2C%2010_31_59%20PM.png?alt=media&token=c067aadf-2132-4285-9a7c-19d2b490c01c',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FChatGPT%20Image%20Sep%205%2C%202025%2C%2010_23_21%20PM.png?alt=media&token=d31894c3-448a-4c65-8a8a-69f4b4a98f30',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FChatGPT%20Image%20Sep%205%2C%202025%2C%2010_23_00%20PM.png?alt=media&token=b7389a98-20f7-446a-b0a9-2ee9a45f7271',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FChatGPT%20Image%20Sep%205%2C%202025%2C%2010_22_55%20PM.png?alt=media&token=1025f449-86eb-45ed-aaec-6bba9988de40',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FChatGPT%20Image%20Sep%205%2C%202025%2C%2010_22_51%20PM.png?alt=media&token=f95429ac-ce42-4a7c-a08c-cc5605910b3b',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FChatGPT%20Image%20Sep%205%2C%202025%2C%2010_12_32%20PM.png?alt=media&token=37674059-1352-4467-8a68-c173925c7364'
    ],
    2: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%202%20(1).png?alt=media&token=50b17d8c-caeb-441a-8fe2-e2ca462d4f8a',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%202%20(2).png?alt=media&token=234275d1-f8bb-42ca-8050-6ddbe66acfa6',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%202%20(3).png?alt=media&token=0892748c-9e76-4836-8631-184fffef4b87',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%202%20(4).png?alt=media&token=3aea269c-bc87-4091-9908-2f0591f7067b',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%202%20(5).png?alt=media&token=a6595a0f-9f6f-462a-bc0a-bfbfe4e27687',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%202%20(6).png?alt=media&token=7812f788-3784-4b2f-a872-c2eebeb74426',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%202%20(7).png?alt=media&token=75b4dc24-2c76-406c-a18c-572f6777cf30',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%202%20(8).png?alt=media&token=cdb12074-cdd2-46cd-80d5-58b5b028c758'
    ],
    3: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%203%20(1).png?alt=media&token=80565239-3169-4399-a79d-b480da3ed3cb',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%203%20(2).png?alt=media&token=770ca751-1cf6-4d31-aa04-721e46846308',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%203%20(3).png?alt=media&token=8d5f85d2-9636-4796-a099-b0bef7b0b5c9',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%203%20(4).png?alt=media&token=216f5a71-5896-46ab-8780-674afc2b267a',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%203%20(5).png?alt=media&token=abaae3e5-787b-4c8b-9eb4-40dc37b84bf2',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%203%20(6).png?alt=media&token=e61287c1-b70b-4146-8cee-1254a0a37ba5',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%203%20(7).png?alt=media&token=19d0c8c3-768b-4589-98af-fdd99d453d34',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%203%20(8).png?alt=media&token=7bf5f600-5901-4a1a-8059-2ee78523a029'
    ],
    4: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%204%20(1).png?alt=media&token=fb068726-6eb1-4da6-bd5a-70f83cd8982f',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%204%20(3).png?alt=media&token=edb41648-e927-4b2f-b657-19f7a5c20086',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%204%20(4).png?alt=media&token=8f1f3684-7a5c-4ca6-9d8f-09a9aaff2192',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%204%20(5).png?alt=media&token=a0e57059-70da-44be-b8ea-97d3f4e7fe5d',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%204%20(6).png?alt=media&token=01bd589f-5672-465a-a8a2-9264b2b31d4d',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%204%20(7).png?alt=media&token=f55d3c7d-bf33-4a02-9603-351602f8ab16',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%204%20(8).png?alt=media&token=b3acd546-bc8b-4469-9d0b-bb81586f3c93',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%204%20(9).png?alt=media&token=436658e2-451c-4ee8-ad45-aedeebe3fddb'
    ],
    5: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FLevel%205%20Healers%20(1).png?alt=media&token=87780d29-32eb-4472-9e3a-7620c556de20',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FLevel%205%20Healers%20(2).png?alt=media&token=f42d0f89-6920-4677-ad0a-9ce61179586a',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FLevel%205%20Healers%20(3).png?alt=media&token=8f17a5f5-9e42-4c65-9e61-f41aa41d1dbb',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FLevel%205%20Healers%20(4).png?alt=media&token=4392fd83-455f-45ad-ad21-65ae501b5988',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FLevel%205%20Healers%20(5).png?alt=media&token=4ad1237f-6b8b-456e-9ba3-38afe40be485',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FLevel%205%20Healers%20(6).png?alt=media&token=597fe779-75ef-4863-a761-89c78b214a30',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FLevel%205%20Healers%20(7).png?alt=media&token=74fef29a-1960-4f93-966a-d709f7b1be67',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FLevel%205%20Healers%20(8).png?alt=media&token=dd93e024-34d2-4ee2-b8ba-2e89874e0a49'
    ],
    6: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%206%20(1).png?alt=media&token=c2fcf19d-39e1-4dd0-b468-6c237b4cf697',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%206%20(2).png?alt=media&token=42814d8b-a11d-4ca7-9974-14e959adebab',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%206%20(3).png?alt=media&token=2202f53e-8843-45a1-b2c9-0ca07d9e2aa0',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%206%20(4).png?alt=media&token=01213d2b-a279-445f-a990-0e183ad63a5c',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%206%20(5).png?alt=media&token=08d6651c-c855-455c-81ec-4050e6625317',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%206%20(6).png?alt=media&token=908c5952-6da0-48ff-8325-2a81c8acfd5c',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%206%20(7).png?alt=media&token=e4a2da80-6c95-485e-a0f2-872bbfd801bc',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Healer%20Avatar%20Images%2FTransparent%2FHealer%20Level%206%20(8).png?alt=media&token=7bdf7000-62c9-406d-a197-8c0ddb76f162'
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
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level1%20(1).png?alt=media&token=9c29e786-2d44-4405-9226-4e15bdf50ee0',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level1%20(2).png?alt=media&token=d7c83a37-a68f-4ffa-83fb-323a3f53440b',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level1%20(3).png?alt=media&token=7d69da57-e194-43b8-9636-a5db9eb0ed1b',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level1%20(4).png?alt=media&token=6e878923-4f58-469c-9919-28198f993dd6',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level1%20(5).png?alt=media&token=df99e614-a948-437f-afdf-1d8710978028',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level1%20(6).png?alt=media&token=f348d8b2-d52c-468f-b7bf-ef2e04b7fea2',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level1%20(7).png?alt=media&token=1adeaad7-990a-4740-976d-64f7d084e959',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level1%20(8).png?alt=media&token=e150925a-e51f-4fb3-a372-2d6179756e84'
    ],
    2: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%202%20(1).png?alt=media&token=d73e7d79-9c42-4cb9-b170-90b658c6766e',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%202%20(2).png?alt=media&token=ad474977-07bc-4e5f-ab76-110e751ec4f4',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%202%20(3).png?alt=media&token=0aeeb047-215a-4417-bb6b-1a250ad4ee91',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%202%20(4).png?alt=media&token=9ff6ca14-c9a0-4ea5-9787-eea1146edd25',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%202%20(5).png?alt=media&token=2cf9deea-09be-4004-9b05-63628a38dc19',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%202%20(6).png?alt=media&token=57cc392d-ead9-4994-afbc-84dba2bc6990',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%202%20(7).png?alt=media&token=70cb0610-5753-4b16-916c-d728d59419ef',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%202%20(8).png?alt=media&token=6ec3a3ec-c230-48ec-b573-2df8792a1b4f'
    ],
    3: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%203%20(1).png?alt=media&token=caa024c9-8004-443a-85d0-62bb5423f999',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%203%20(2).png?alt=media&token=62d3c16c-2768-44b5-be11-0ff8deb4b68a',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%203%20(3).png?alt=media&token=d6d64fbe-95a7-4c88-a01f-ee750cbb0433',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%203%20(4).png?alt=media&token=4271a24a-4e2d-464d-bdc3-03e3e546a90e',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%203%20(5).png?alt=media&token=5d64f145-ca59-48e9-89c4-86d678f73465',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%203%20(6).png?alt=media&token=d5778b5e-7764-46b0-a979-1e481157c987',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%203%20(7).png?alt=media&token=f30969f4-7e75-48a0-ab62-252d4f9ecb93',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%203%20(8).png?alt=media&token=95235003-120e-494c-9fda-02705a2d0b0f'
    ],
    4: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%204%20(1).png?alt=media&token=db6ae72f-f246-423f-b4f9-b7592fbb1b94',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%204%20(2).png?alt=media&token=4ae773e2-9b35-434c-868b-bc9e9d6fab24',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%204%20(3).png?alt=media&token=33c529cd-9a69-4eae-8756-af075d7810ba',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%204%20(4).png?alt=media&token=c8adf47e-8abe-4858-a69c-d7848228d487',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%204%20(5).png?alt=media&token=79eb722f-0f7b-4d78-b978-d5bfb2d7114e',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%204%20(6).png?alt=media&token=406473de-c2bc-447f-8e11-c2c706911377',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%204%20(7).png?alt=media&token=c9ac475c-1257-4ad8-be8e-480559bd6718',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%204%20(8).png?alt=media&token=d950b7e1-0c04-481f-a8d2-fc849c9fde4f'
    ],
    5: [
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%205%20(1).png?alt=media&token=15083060-839a-4ed2-9ca4-902b6f8e2cb8',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%205%20(2).png?alt=media&token=ea009638-9889-4222-96ad-c722fc571ffe',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%205%20(3).png?alt=media&token=cc7795b9-d703-444c-a2c1-bd5ed637c514',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%205%20(4).png?alt=media&token=7154bb00-7e3f-49d7-8c7d-962236f77462',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%205%20(5).png?alt=media&token=06996528-8b3e-4f5e-801a-3b21709157b2',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%205%20(6).png?alt=media&token=601709fd-7973-4e12-93d8-9d606175918e',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%205%20(7).png?alt=media&token=80ada934-04e7-444b-8924-1d547c6a6bd4',
        'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%205%20(8).png?alt=media&token=f9047fc4-9a9f-45a7-85e0-bf70a8be442b'
    ],
    6: [
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%206-2%20(1).png?alt=media&token=355a8062-6af9-4224-96ea-e7656f51d176',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%206-2%20(2).png?alt=media&token=fd048ffe-fd03-4690-a356-35c8fba9993a',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%206-2%20(3).png?alt=media&token=5cefa400-a6b3-428c-95d2-0ce7eab6a53b',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%206-2%20(4).png?alt=media&token=64d091dd-c6a6-431a-a5f4-48f5bc994e8b',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%206-2%20(5).png?alt=media&token=1031664a-95e0-4e26-9ccf-d9caee39578f',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%206-2%20(6).png?alt=media&token=8048386a-c597-44df-b3a4-92f0660a4578',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%206-2%20(7).png?alt=media&token=74c73f3d-fd50-4768-b77e-b9fbfb35f45c',
      'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Mage%20Avatar%20Images%2FTransparent%2FMage%20Level%206-2%20(8).png?alt=media&token=df442d60-3918-4ff5-872c-c0bc00589fd1'
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

    





    

    




