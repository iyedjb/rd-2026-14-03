import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdNLa9sgFztIE90i9B7F8aHKtksJLaA-I",
  authDomain: "roda-bem-turismo.firebaseapp.com",
  databaseURL: "https://roda-bem-turismo-default-rtdb.firebaseio.com",
  projectId: "roda-bem-turismo",
  storageBucket: "roda-bem-turismo.firebasestorage.app",
  messagingSenderId: "732861766010",
  appId: "1:732861766010:web:a268ba64b148ac09a99ec3",
  measurementId: "G-0Y9ZPTWPWZ"
};

const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);
export const db = rtdb; // Backwards compatibility alias
export const auth = getAuth(app);
