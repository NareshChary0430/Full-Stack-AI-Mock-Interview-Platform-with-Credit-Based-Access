
import { initializeApp } from "firebase/app";
import { Meta } from "react-router-dom";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: Meta.env.VITE_FIREBASE_API_KEY,
  authDomain: Meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: Meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: Meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: Meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };