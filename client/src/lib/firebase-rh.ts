import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase configuration for RH (cidade-dofuturo)
const firebaseRhConfig = {
  apiKey: "AIzaSyB47aV1YCX-WgBK3awroJ6ucC79XDFsQdc",
  authDomain: "cidade-dofuturo.firebaseapp.com",
  databaseURL: "https://cidade-dofuturo-default-rtdb.firebaseio.com",
  projectId: "cidade-dofuturo",
  storageBucket: "cidade-dofuturo.firebasestorage.app",
  messagingSenderId: "486900760147",
  appId: "1:486900760147:web:2c70ee9009e28675a350a6",
  measurementId: "G-9C544QZGNJ"
};

const rhApp = initializeApp(firebaseRhConfig, 'rh-app');
export const rhDb = getDatabase(rhApp);
