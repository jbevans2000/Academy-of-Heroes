
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, getDocs, writeBatch, setDoc, deleteDoc } from 'firebase/firestore';

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

export async function migrateData(): Promise<{success: boolean, logs: string[], error?: string}> {
    const logs: string[] = [];
    
    try {
        logs.push('Starting migration...');
        
        const teacherDocRef = doc(db, 'teachers', TEACHER_UID);

        logs.push(`Ensuring teacher document exists at: /teachers/${TEACHER_UID}`);
        await setDoc(teacherDocRef, { migratedAt: new Date() }, { merge: true });
        
        for (const collectionName of COLLECTIONS_TO_MIGRATE) {
            const batch = writeBatch(db);
            let documentsMigrated = 0;
            
            logs.push(`Processing collection: ${collectionName}...`);
            const oldCollectionRef = collection(db, collectionName);
            const snapshot = await getDocs(oldCollectionRef);

            if (snapshot.empty) {
                logs.push(`-> Collection '${collectionName}' is empty or does not exist. Skipping.`);
                continue;
            }

            snapshot.forEach(document => {
                const oldDocRef = doc(db, collectionName, document.id);
                const newDocRef = doc(db, `teachers/${TEACHER_UID}/${collectionName}`, document.id);
                
                batch.set(newDocRef, document.data());
                batch.delete(oldDocRef);
                documentsMigrated++;
            });

            logs.push(`-> Staging ${documentsMigrated} documents for migration...`);
            await batch.commit();
            logs.push(`-> Successfully migrated and deleted old documents for '${collectionName}'.`);
        }

        logs.push('Migration process completed successfully.');
        return { success: true, logs };
    } catch (e: any) {
        console.error("Migration failed:", e);
        logs.push(`ERROR: ${e.message}`);
        return { success: false, logs, error: e.message };
    }
}
