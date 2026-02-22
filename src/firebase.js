import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAGUGTv4hfnIKf7Rlatxr-tkVhnTXGWvWo",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tlapa-comida-app.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tlapa-comida-app",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "tlapa-comida-app.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_ID || "1631820114",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1631820114:web:0920dc09d7070cbd41028b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

// Secundario para crear usuarios sin sacar al Admin
export const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
export const secondaryAuth = getAuth(secondaryApp);

// Configuración para usar Firebase Local Emulator Suite
// window.location.hostname === 'localhost'
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001); // Puerto por defecto para CF
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectAuthEmulator(secondaryAuth, 'http://localhost:9099');
    console.log("🔥 APP CONECTADA A FIREBASE LOCAL EMULATORS 🔥");
}

export default app;
