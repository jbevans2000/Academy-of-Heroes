import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: "academy-heroes-mziuf",
  appId: "1:237944049269:web:b4d65d8ef6e4d2e905323c",
  storageBucket: "academy-heroes-mziuf.firebasestorage.app",
  apiKey: "AIzaSyBJx-5YtKH1XgHZoldzeim0gp3UiSlQGlk",
  authDomain: "academy-heroes-mziuf.firebaseapp.com",
  messagingSenderId: "237944049269",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
