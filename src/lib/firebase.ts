
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

// Connect to local emulators if running in a browser environment
if (typeof window !== 'undefined') {
  try {
    // Check if not already connected.
    // The properties `emulatorConfig` and `_settings.host` are inspected
    // to avoid re-connecting errors on Next.js hot reloads.
    // @ts-ignore
    if (!auth.emulatorConfig) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      console.log("Connected to local Firebase Auth emulator.");
    }
    // @ts-ignore
    if (!db._settings.host) {
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
      console.log("Connected to local Firestore emulator.");
    }
  } catch (error) {
    console.error("Error connecting to Firebase emulators:", error);
  }
}


export { app, auth, db };
