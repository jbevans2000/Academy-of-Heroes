
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, getDocs, writeBatch, setDoc } from 'firebase/firestore';

const TEACHER_UID = 'ICKWJ5MQl0SHFzzaSXqPuGS3NHr2';
const COLLECTIONS_TO_MIGRATE = [
    'students',
    'questHubs',
    'chapters',
    'bossBattles',
    'battleSummaries',
    'gameLog',
    'liveBattles' // Note: This is usually temporary, but we move it just in case.
];

export async function migrateData(log: (message: string) => void): Promise<{success: boolean, error?: string}> {
    try {
        log('Starting migration...');
        
        const teacherDocRef = doc(db, 'teachers', TEACHER_UID);

        log(`Ensuring teacher document exists at: /teachers/${TEACHER_UID}`);
        await setDoc(teacherDocRef, { migratedAt: new Date() }, { merge: true });
        
        for (const collectionName of COLLECTIONS_TO_MIGRATE) {
            const batch = writeBatch(db);
            let documentsMigrated = 0;
            
            log(`Processing collection: ${collectionName}...`);
            const oldCollectionRef = collection(db, collectionName);
            const snapshot = await getDocs(oldCollectionRef);

            if (snapshot.empty) {
                log(`-> Collection '${collectionName}' is empty or does not exist. Skipping.`);
                continue;
            }

            snapshot.forEach(document => {
                const oldDocRef = doc(db, collectionName, document.id);
                const newDocRef = doc(db, `teachers/${TEACHER_UID}/${collectionName}`, document.id);
                
                batch.set(newDocRef, document.data());
                batch.delete(oldDocRef);
                documentsMigrated++;
            });

            log(`-> Staging ${documentsMigrated} documents for migration...`);
            await batch.commit();
            log(`-> Successfully migrated and deleted old documents for '${collectionName}'.`);
        }

        log('Migration process completed successfully.');
        return { success: true };
    } catch (e: any) {
        console.error("Migration failed:", e);
        log(`ERROR: ${e.message}`);
        return { success: false, error: e.message };
    }
}

    