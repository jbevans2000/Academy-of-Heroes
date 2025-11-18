/**
 * @fileOverview A Google Apps Script to migrate Firestore data from a global
 * structure to a multi-tenant, teacher-centric structure.
 *
 * To use this script:
 * 1. Open Google Apps Script: Go to script.google.com.
 * 2. Create a New Project: Click "New project".
 * 3. Name Your Project: Give it a name like "Firestore Migration".
 * 4. Paste the Code: Copy the entire content of this file and paste it into the Code.gs file, replacing any existing content.
 * 5. Enable Firestore Service:
 *    - In the left sidebar, click the "+" next to "Services".
 *    - Find "Firestore" in the list, select it, and click "Add".
 * 6. Set the GCP Project:
 *    - In the left sidebar, click the "Project Settings" (gear) icon.
 *    - Check the box "Show "appsscript.json" manifest file in editor".
 *    - Return to the editor view, and click on the `appsscript.json` file.
 *    - Add a `gcpProjectId` key to the JSON file, setting its value to your Firebase Project ID.
 *      The file should look like this:
 *      {
 *        "timeZone": "America/New_York", // Or your timezone
 *        "dependencies": {
 *          "enabledAdvancedServices": [{
 *            "userSymbol": "Firestore",
 *            "serviceId": "firestore",
 *            "version": "v1beta1"
 *          }]
 *        },
 *        "exceptionLogging": "STACKDRIVER",
 *        "runtimeVersion": "V8",
 *        "gcpProjectId": "academy-heroes-mziuf" // <-- ADD THIS LINE
 *      }
 * 7. Run the Migration:
 *    - At the top of the editor, select the "runMigration" function from the dropdown.
 *    - Click the "Run" button.
 *    - You will be prompted to authorize the script. Follow the on-screen instructions to grant it permission to access your Firestore data.
 *    - The script will run and log its progress in the Execution Log.
 * 8. Verify in Firebase: Once the script finishes, check your Firestore console. You should see the new `teachers` collection and all your data moved inside it.
 */

// --- CONFIGURATION ---
const PROJECT_ID = 'academy-heroes-mziuf';
const TEACHER_UID = 'ICKWJ5MQl0SHFzzaSXqPuGS3NHr2';
const TEACHER_EMAIL = 'jevans@nca.connectionsacademy.org';

// List of top-level collections to move under the teacher document.
const COLLECTIONS_TO_MOVE = [
  'students',
  'questHubs',
  'chapters',
  'bossBattles',
  'battleSummaries',
  'gameLog',
  'liveBattles'
];


/**
 * Main function to execute the entire migration process.
 */
function runMigration() {
  const firestore = getFirestoreInstance_();
  Logger.log('Starting Firestore data migration...');

  // 1. Create the teacher document
  createTeacherDocument_(firestore);

  // 2. Move all specified collections
  COLLECTIONS_TO_MOVE.forEach(collectionName => {
    moveCollection_(firestore, collectionName);
  });

  Logger.log('Migration completed successfully!');
}

/**
 * Ensures the teacher document exists.
 * @param {object} firestore The Firestore service instance.
 */
function createTeacherDocument_(firestore) {
  const teacherDocPath = `teachers/${TEACHER_UID}`;
  Logger.log(`Ensuring teacher document exists at: ${teacherDocPath}`);

  try {
    firestore.createDocument('teachers', TEACHER_UID, {
      email: TEACHER_EMAIL,
      createdAt: new Date().toISOString()
    });
    Logger.log('Teacher document created.');
  } catch (e) {
    if (e.message.includes('ALREADY_EXISTS')) {
      Logger.log('Teacher document already exists. Skipping creation.');
    } else {
      Logger.log(`Error creating teacher document: ${e.message}`);
      throw e;
    }
  }
}

/**
 * Moves all documents from a top-level collection to a subcollection
 * under the specified teacher document.
 * @param {object} firestore The Firestore service instance.
 * @param {string} collectionName The name of the collection to move.
 */
function moveCollection_(firestore, collectionName) {
  const oldCollectionPath = collectionName;
  const newCollectionPath = `teachers/${TEACHER_UID}/${collectionName}`;
  Logger.log(`\n--- Moving collection: ${oldCollectionPath} to ${newCollectionPath} ---`);

  try {
    const documents = firestore.listDocuments(oldCollectionPath);
    if (!documents || documents.length === 0) {
      Logger.log(`Collection '${collectionName}' is empty or does not exist. Skipping.`);
      return;
    }

    Logger.log(`Found ${documents.length} documents to move.`);

    documents.forEach(doc => {
      const docId = doc.name.split('/').pop();
      const oldDocPath = `${collectionName}/${docId}`;
      const newDocPath = `${newCollectionPath}/${docId}`;

      // Read the data from the old document
      const data = doc.fields;
      Logger.log(`  - Moving document: ${docId}`);

      // Write the data to the new document
      firestore.createDocument(newCollectionPath, docId, data);

      // Delete the old document
      firestore.deleteDocument(oldDocPath);
    });

    Logger.log(`--- Finished moving collection: ${collectionName} ---`);

  } catch (e) {
    Logger.log(`Error moving collection ${collectionName}: ${e.message}`);
    // If the error is that the collection doesn't exist, we can ignore it.
    if (!e.message.includes('NOT_FOUND')) {
      throw e;
    } else {
       Logger.log(`Collection '${collectionName}' not found. Cannot move.`);
    }
  }
}


/**
 * Authenticates and returns a Firestore service instance.
 * @return {object} The Firestore service instance.
 */
function getFirestoreInstance_() {
  const email = ScriptApp.getOAuthToken(); // Gets a token to act on behalf of the user running the script
  const service = OAuth2.createService('Firestore')
    .setTokenUrl('https://accounts.google.com/o/oauth2/token')
    .setPrivateKey(PropertiesService.getScriptProperties().getProperty('privateKey'))
    .setClientId(PropertiesService.getScriptProperties().getProperty('clientId'))
    .setScope('https://www.googleapis.com/auth/datastore');
    
  return Firestore.getFirestore(PROJECT_ID, service.getAccessToken());
}

// Note: The Firestore library for Apps Script uses a slightly different API surface
// than the client/admin SDKs. This script is written to use the correct methods for Apps Script.
// The library `Firestore` is available after enabling the advanced service.
