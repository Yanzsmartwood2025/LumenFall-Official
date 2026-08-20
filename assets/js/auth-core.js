import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    setPersistence,
    browserLocalPersistence,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    GithubAuthProvider,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    setLogLevel,
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";

// --- 1. Configuración de Firebase ---
// Esta configuración centralizada actúa como el "Breaker Principal".
const firebaseConfig = {
  apiKey: "AIzaSyAsQrihjtpdj8H7D7giKjo9pWz0jIJEp5c",
  authDomain: "lumenfall-joziel.firebaseapp.com",
  projectId: "lumenfall-joziel",
  storageBucket: "lumenfall-joziel.firebasestorage.app",
  messagingSenderId: "932168644650",
  appId: "1:932168644650:web:51c4e5fdaf12f8030e2b53",
  measurementId: "G-DR03GC3VMQ"
};

const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Configurar Logs de Firestore (opcional, para depuración)
try {
    // setLogLevel('Debug'); // Descomentar si se necesitan logs detallados
} catch (e) {
    console.error("Error al configurar el nivel de log de Firestore:", e);
}

// --- 2. Inicialización de Firebase ---
let app, auth, db, analytics;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Configurar Persistencia Local Inmediata
    setPersistence(auth, browserLocalPersistence)
        .then(() => {
             console.log("🔒 Lumenfall System: Session Persistence Enabled.");
        })
        .catch((error) => {
             console.error("⚠️ Lumenfall System: Persistence Warning:", error);
        });

    db = getFirestore(app);
    isAnalyticsSupported()
        .then((supported) => {
            if (supported) {
                analytics = getAnalytics(app);
            }
        })
        .catch((error) => {
            console.warn("⚠️ Lumenfall System: Analytics unavailable:", error);
        });
    console.log("⚡ Lumenfall System: Main Breaker Active (Firebase Init).");
} catch (e) {
    console.error("❌ Lumenfall System: Breaker Failure (Firebase Init Error):", e);
}

// --- 3. Generación de Código de Juego ---
function getSafeUserEmail(user) {
    return user?.email || user?.providerData?.find((provider) => provider.email)?.email || null;
}

function getSafeDisplayName(user, email) {
    return user?.displayName || (email ? email.split('@')[0] : `Operador-${user?.uid?.slice(0, 6) || 'Anon'}`);
}

function ensureAuthReady() {
    if (!auth) {
        const error = new Error("Firebase Auth no está inicializado. Revisa la configuración de Firebase.");
        console.error("❌ Lumenfall System: Auth unavailable:", error);
        return { ready: false, error };
    }

    return { ready: true };
}

function getCleanActionUrl() {
    return `${window.location.origin}${window.location.pathname}`;
}

function generateGameCode() {
    // Genera un código numérico de 6 dígitos
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// --- 4. Lógica de Perfil de Usuario ---
async function handleUserProfile(user) {
    if (!user) return null;

    if (!db) {
        console.error("Error al gestionar el perfil del usuario: Firestore no está inicializado.");
        return null;
    }

    const email = getSafeUserEmail(user);
    const displayName = getSafeDisplayName(user, email);
    const userRef = doc(db, "users", user.uid);

    try {
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            // Usuario ya registrado
            console.log("✅ Operador Identificado:", email || displayName);
            return userSnap.data();
        } else {
            // Nuevo Usuario: Generar Código y Crear Perfil
            const newCode = generateGameCode();
            console.log("🆕 Nuevo Operador Detectado. Generando Credenciales...");

            const userData = {
                email: email,
                displayName: displayName, // GitHub puede ocultar el correo principal
                photoURL: user.photoURL || null,
                gameCode: newCode,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                roles: ['user']
            };

            await setDoc(userRef, userData);

            // Simular envío de correo
            alert(`📨 SYSTEM ALERT:\n\nBienvenido, Operador.\nTu CÓDIGO DE ACCESO CLASIFICADO es ${newCode}.\n\nGuárdalo para desbloquear la Primera Puerta.`);

            return userData;
        }
    } catch (error) {
        console.error("Error al gestionar el perfil del usuario:", error);
        return null;
    }
}

// --- 5. Objeto Global de Autenticación (API Pública) ---
window.LumenfallAuth = {
    app: app,
    auth: auth,
    db: db,
    analytics: analytics,
    currentUser: null,
    userData: null,

    // --- Métodos de Login ---

    // 1. Google
    loginWithGoogle: async () => {
        const authStatus = ensureAuthReady();
        if (!authStatus.ready) return { success: false, error: authStatus.error };

        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            return { success: true, user: result.user };
        } catch (error) {
            console.error("Login Google Failed:", error);
            alert("Error de autenticación con Google: " + error.message);
            return { success: false, error };
        }
    },

    // 2. GitHub
    loginWithGithub: async () => {
        const authStatus = ensureAuthReady();
        if (!authStatus.ready) return { success: false, error: authStatus.error };

        const provider = new GithubAuthProvider();
        provider.addScope('user:email');
        try {
            const result = await signInWithPopup(auth, provider);
            return { success: true, user: result.user };
        } catch (error) {
            console.error("Login GitHub Failed:", error);
            alert("Error de autenticación con GitHub: " + error.message);
            return { success: false, error };
        }
    },

    // 3. Magic Link (Email sin contraseña)
    sendMagicLink: async (email) => {
        const authStatus = ensureAuthReady();
        if (!authStatus.ready) return { success: false, error: authStatus.error };

        const actionCodeSettings = {
            // URL a la que se redirige después de hacer clic.
            // Debe estar en la lista de dominios autorizados de Firebase Console.
            url: getCleanActionUrl(), // Redirige sin reutilizar query/hash de enlaces antiguos
            handleCodeInApp: true
        };

        try {
            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            // Guardar el email localmente para no pedirlo de nuevo al volver
            window.localStorage.setItem('emailForSignIn', email);
            return { success: true };
        } catch (error) {
            console.error("Magic Link Failed:", error);
            return { success: false, error: error };
        }
    },

    // 4. Finalizar Login con Magic Link (Llamar al cargar la página)
    checkAndSignInWithMagicLink: async () => {
        const authStatus = ensureAuthReady();
        if (!authStatus.ready) return { success: false, error: authStatus.error };

        if (isSignInWithEmailLink(auth, window.location.href)) {
            let email = window.localStorage.getItem('emailForSignIn');

            // Si el usuario abrió el link en otro dispositivo, pedir el email
            if (!email) {
                email = window.prompt('Por favor, confirma tu correo electrónico para iniciar sesión:');
            }

            if (email) {
                try {
                    const result = await signInWithEmailLink(auth, email, window.location.href);
                    window.localStorage.removeItem('emailForSignIn'); // Limpiar
                    // Reemplazar la URL para limpiar el hash del link
                    window.history.replaceState({}, document.title, window.location.pathname);
                    return { success: true, user: result.user };
                } catch (error) {
                    console.error("Error finalizando Magic Link:", error);
                    return { success: false, error: error };
                }
            }
        }
        return { success: false, notLink: true };
    },

    logout: async () => {
        try {
            const authStatus = ensureAuthReady();
            if (authStatus.ready) {
                await signOut(auth);
            }
        } catch (error) {
            console.error("Logout Failed (Force Reloading):", error);
        } finally {
            // CRITICAL: Force reload to clear all memory state
            window.location.reload();
        }
    },

    // Método para suscribirse a cambios de estado
    onStateChanged: (callback) => {
        const authStatus = ensureAuthReady();
        if (!authStatus.ready) {
            callback(null, null);
            return () => {};
        }

        return onAuthStateChanged(auth, async (user) => {
            window.LumenfallAuth.currentUser = user;
            if (user) {
                const data = await handleUserProfile(user);
                window.LumenfallAuth.userData = data;
                callback(user, data);
            } else {
                // EXPLICIT CLEANUP for Guest State
                window.LumenfallAuth.currentUser = null;
                window.LumenfallAuth.userData = null;
                callback(null, null);
            }
        });
    }
};
