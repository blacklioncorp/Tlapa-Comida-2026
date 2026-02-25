import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
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
            role: fbUser.email === 'repartidor@ejemplo.com' ? 'driver' : (legacy?.role || 'client'),
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
            const { data: userDoc, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', fbUser.id)
                .single();

            if (userDoc && !error) {
                // Dev Hack: Force driver role for the test driver account
                if (userDoc.email === 'repartidor@ejemplo.com' && userDoc.role !== 'driver') {
                    userDoc.role = 'driver';
                    supabase.from('users').update({ role: 'driver' }).eq('id', fbUser.id).catch(console.warn);
                }

                setUser(userDoc);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(userDoc));
                return;
            }
        } catch (e) {
            console.warn('Supabase DB read skipped:', e.message);
        }

        // No DB doc found — try to save one (non-blocking)
        try {
            await supabase.from('users').insert([{ ...fallbackUser, id: fbUser.id }]);
        } catch (e) {
            console.warn('Supabase DB write skipped:', e.message);
        }
    }, []);

    useEffect(() => {
        let userSubscription = null;

        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            handleAuthChange(session?.user || null);
        };

        const handleAuthChange = async (sbUser) => {
            if (sbUser) {
                // Background listener for universal block (Kill Switch) and real-time updates
                userSubscription = supabase.channel(`public:users:id=eq.${sbUser.id}`)
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${sbUser.id}` }, (payload) => {
                        const fsData = payload.new;
                        if (fsData.isBlocked) {
                            supabase.auth.signOut();
                            setUser(null);
                            localStorage.removeItem(STORAGE_KEY);
                            alert("Cuenta suspendida. Para más información contacta a soporte.");
                            return;
                        }
                        // Keep cache in sync with DB
                        setUser(fsData);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(fsData));
                        setLoading(false);
                    }).subscribe();

                // 1) Check localStorage cache first (instant)
                try {
                    const cached = localStorage.getItem(STORAGE_KEY);
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        if (parsed.id === sbUser.id) {
                            if (parsed.email === 'repartidor@ejemplo.com') parsed.role = 'driver';
                            setUser(parsed);
                            setLoading(false);
                            // Still try to sync with DB in background (initial read)
                            enhanceWithFirestore(sbUser, parsed);
                            return;
                        }
                    }
                } catch (e) { /* ignore parse errors */ }

                // 2) Build basic user from Auth + seed data (instant)
                const basicUser = buildBasicUser(sbUser);
                setUser(basicUser);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(basicUser));
                setLoading(false);

                // 3) Enhance with DB data in background (non-blocking)
                enhanceWithFirestore(sbUser, basicUser);
            } else {
                if (userSubscription) supabase.removeChannel(userSubscription);
                setUser(null);
                localStorage.removeItem(STORAGE_KEY);
                setLoading(false);
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                handleAuthChange(session?.user || null);
            }
        );

        return () => {
            subscription.unsubscribe();
            if (userSubscription) supabase.removeChannel(userSubscription);
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
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            return { success: true, user: data.user };
        } catch (error) {
            console.error("Login error:", error);
            let message = 'Error al iniciar sesión';
            if (error.message.includes('Invalid login credentials')) message = 'Correo o contraseña incorrectos';
            if (error.message.includes('fetch')) message = 'Error de red. Verifica tu conexión.';
            return { success: false, error: message };
        }
    };

    // Login with Google
    const loginWithGoogle = async () => {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error("Google Login error:", error);
            return { success: false, error: 'Fallo la conexión con Google' };
        }
    };

    // Register new user
    const register = async (userData) => {
        try {
            const { email, password, displayName, role, phone } = userData;
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        displayName,
                        role: role || 'client'
                    }
                }
            });

            if (error) throw error;
            const sbUser = data.user;

            const newUserData = {
                id: sbUser.id,
                email,
                displayName,
                role: role || 'client',
                phone: phone || '',
                isActive: true,
                avatarUrl: '',
                savedAddresses: [],
                createdAt: new Date().toISOString(),
            };

            // Set user immediately
            setUser(newUserData);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newUserData));

            // Save to DB in background
            try {
                await supabase.from('users').insert([newUserData]);
            } catch (e) {
                console.warn('DB save on register failed:', e.message);
            }

            return { success: true, user: newUserData };
        } catch (error) {
            console.error("Registration error:", error);
            let message = 'Error al crear la cuenta';
            if (error.message.includes('already registered')) message = 'Ya existe una cuenta con ese correo';
            if (error.message.includes('weak_password')) message = 'La contraseña debe tener al menos 6 caracteres';
            return { success: false, error: message };
        }
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
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

        // Persist to DB in background
        try {
            await supabase.from('users').update(updates).eq('id', user.id);
        } catch (e) {
            console.warn("DB update failed:", e.message);
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
