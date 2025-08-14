
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "fake-api-key",
  authDomain: "academy-heroes-mziuf.firebaseapp.com",
  projectId: "academy-heroes-mziuf",
  storageBucket: "academy-heroes-mziuf.appspot.com",
  messagingSenderId: "fake-sender-id",
  appId: "fake-app-id"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

// Connect to local emulators if running in a browser environment.
// This is critical for local development.
if (typeof window !== 'undefined') {
  console.log("Attempting to connect to Firebase emulators...");
  try {
    // We check if the emulator is already connected to avoid errors on hot reloads.
    // @ts-ignore - _emulatorConfig is not in the type definition but it is a reliable way to check.
    if (!auth.emulatorConfig) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      console.log("Successfully connected to local Firebase Auth emulator.");
    } else {
      console.log("Auth emulator already connected.");
    }
  } catch (error) {
    console.error("Error connecting to Auth emulator:", error);
  }

  try {
     // @ts-ignore - _settings.host is not in the type definition but it is a reliable way to check.
    if (!db.toJSON().settings.host) {
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
      console.log("Successfully connected to local Firestore emulator.");
    } else {
        console.log("Firestore emulator already connected.");
    }
  } catch (error) {
      console.error("Error connecting to Firestore emulator:", error);
  }
}


export { app, auth, db };
