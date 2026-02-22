import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase';
import {
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { SAMPLE_USERS, ALL_USERS } from '../data/seedData';

const AuthContext = createContext(null);
const STORAGE_KEY = 'tlapa_user';

// Helper: create a promise that rejects after a timeout
function withTimeout(promise, ms = 5000) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Build basic user data from Firebase Auth user object
    const buildBasicUser = useCallback((fbUser) => {
        const legacy = ALL_USERS.find(u => u.email === fbUser.email);
        return {
            id: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || legacy?.displayName || 'Usuario',
            role: legacy?.role || 'client',
            avatarUrl: fbUser.photoURL || '',
            savedAddresses: legacy?.savedAddresses || [],
            phone: fbUser.phoneNumber || legacy?.phone || '',
            isActive: true,
            merchantId: legacy?.merchantId || null,
        };
    }, []);

    // Fetch and enhance user data from Firestore (background, non-blocking)
    const enhanceWithFirestore = useCallback(async (fbUser, fallbackUser) => {
        try {
            const userDoc = await withTimeout(getDoc(doc(db, 'users', fbUser.uid)), 5000);
            if (userDoc.exists()) {
                const fsData = userDoc.data();
                setUser(fsData);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(fsData));
                return;
            }
        } catch (e) {
            console.warn('Firestore read skipped:', e.message);
        }

        // No Firestore doc found — try to save one (non-blocking)
        try {
            await withTimeout(setDoc(doc(db, 'users', fbUser.uid), fallbackUser), 5000);
        } catch (e) {
            console.warn('Firestore write skipped:', e.message);
        }
    }, []);

    useEffect(() => {
        let userUnsubscribe = null;

        const authUnsubscribe = onAuthStateChanged(auth, (fbUser) => {
            if (fbUser) {
                // Background listener for universal block (Kill Switch) and real-time updates
                userUnsubscribe = onSnapshot(doc(db, 'users', fbUser.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        const fsData = docSnap.data();
                        if (fsData.isBlocked) {
                            signOut(auth);
                            setUser(null);
                            localStorage.removeItem(STORAGE_KEY);
                            alert("Cuenta suspendida. Para más información contacta a soporte.");
                            return;
                        }
                        // Keep cache in sync with firestore
                        setUser(fsData);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(fsData));
                        setLoading(false);
                    }
                }, (error) => {
                    console.warn("Realtime user sync failed (might be permission):", error.message);
                });

                // 1) Check localStorage cache first (instant)
                try {
                    const cached = localStorage.getItem(STORAGE_KEY);
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        if (parsed.id === fbUser.uid) {
                            setUser(parsed);
                            setLoading(false);
                            // Still try to sync with Firestore in background (initial read)
                            enhanceWithFirestore(fbUser, parsed);
                            return;
                        }
                    }
                } catch (e) { /* ignore parse errors */ }

                // 2) Build basic user from Firebase Auth + seed data (instant)
                const basicUser = buildBasicUser(fbUser);
                setUser(basicUser);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(basicUser));
                setLoading(false);

                // 3) Enhance with Firestore data in background (non-blocking)
                enhanceWithFirestore(fbUser, basicUser);
            } else {
                if (userUnsubscribe) userUnsubscribe();
                setUser(null);
                localStorage.removeItem(STORAGE_KEY);
                setLoading(false);
            }
        });

        return () => {
            authUnsubscribe();
            if (userUnsubscribe) userUnsubscribe();
        };
    }, [buildBasicUser, enhanceWithFirestore]);

    // Quick login (dev shortcut)
    const loginAs = async (role) => {
        const userData = SAMPLE_USERS[role];
        if (userData) {
            setUser(userData);
            setLoading(false);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
            return userData;
        }
        return null;
    };

    // Login with email + password
    const login = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged will handle setting the user
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error("Login error:", error);
            let message = 'Error al iniciar sesión';
            if (error.code === 'auth/user-not-found') message = 'No existe una cuenta con ese correo';
            if (error.code === 'auth/wrong-password') message = 'Contraseña incorrecta';
            if (error.code === 'auth/invalid-credential') message = 'Correo o contraseña incorrectos';
            if (error.code === 'auth/invalid-email') message = 'El correo no es válido';
            if (error.code === 'auth/too-many-requests') message = 'Demasiados intentos. Intenta más tarde';
            return { success: false, error: message };
        }
    };

    // Login with Google
    const loginWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            return { success: true, user: result.user };
        } catch (error) {
            console.error("Google Login error:", error);
            let message = 'Fallo la conexión con Google';
            if (error.code === 'auth/popup-closed-by-user') message = 'Cerraste la ventana de Google';
            if (error.code === 'auth/cancelled-popup-request') message = 'Solicitud cancelada';
            return { success: false, error: message };
        }
    };

    // Register new user
    const register = async (userData) => {
        try {
            const { email, password, displayName, role, phone } = userData;
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const fbUser = userCredential.user;

            try {
                await updateProfile(fbUser, { displayName });
            } catch (e) {
                console.warn('Profile update failed:', e.message);
            }

            const newUserData = {
                id: fbUser.uid,
                email,
                displayName,
                role: role || 'client',
                phone: phone || '',
                isActive: true,
                avatarUrl: '',
                savedAddresses: [],
                createdAt: new Date().toISOString(),
            };

            // Set user immediately (don't wait for Firestore)
            setUser(newUserData);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newUserData));

            // Save to Firestore in background
            try {
                await withTimeout(setDoc(doc(db, 'users', fbUser.uid), newUserData), 5000);
            } catch (e) {
                console.warn('Firestore save on register failed:', e.message);
            }

            return { success: true, user: newUserData };
        } catch (error) {
            console.error("Registration error:", error);
            let message = 'Error al crear la cuenta';
            if (error.code === 'auth/email-already-in-use') message = 'Ya existe una cuenta con ese correo';
            if (error.code === 'auth/weak-password') message = 'La contraseña debe tener al menos 6 caracteres';
            if (error.code === 'auth/invalid-email') message = 'El correo electrónico no es válido';
            return { success: false, error: message };
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (e) {
            console.warn('Sign out error:', e.message);
        }
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('tlapa_cart');
    };

    const updateUser = async (updates) => {
        if (!user) return;
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));

        // Persist to Firestore in background
        try {
            await withTimeout(updateDoc(doc(db, 'users', user.id), updates), 5000);
        } catch (e) {
            console.warn("Firestore update failed:", e.message);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginAs, login, loginWithGoogle, register, logout, updateUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
