
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
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

// Connect to local emulators
try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.log("Connected to local Firebase emulators.");
} catch (error) {
    console.error("Error connecting to Firebase emulators:", error);
}


export { app, auth, db };
