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
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";

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
    analytics = getAnalytics(app);
    console.log("⚡ Lumenfall System: Main Breaker Active (Firebase Init).");
} catch (e) {
    console.error("❌ Lumenfall System: Breaker Failure (Firebase Init Error):", e);
}

// --- 3. Generación de Código de Juego ---
function generateGameCode() {
    // Genera un código numérico de 6 dígitos
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// --- 4. Lógica de Perfil de Usuario ---
async function handleUserProfile(user) {
    if (!user) return null;

    const userRef = doc(db, "users", user.uid);

    try {
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            // Usuario ya registrado
            console.log("✅ Operador Identificado:", user.email);
            return userSnap.data();
        } else {
            // Nuevo Usuario: Generar Código y Crear Perfil
            const newCode = generateGameCode();
            console.log("🆕 Nuevo Operador Detectado. Generando Credenciales...");

            const userData = {
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0], // Usar parte del email si no hay nombre
                photoURL: user.photoURL || null,
                gameCode: newCode,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                roles: ['user']
            };

            await setDoc(userRef, userData);

            // Simular envío de correo
            alert(`📨 SYSTEM ALERT:\n\nBienvenido, Operador.\nSe ha enviado un CÓDIGO DE ACCESO CLASIFICADO a tu correo (${user.email}).\n\nUtilízalo para desbloquear la Primera Puerta.`);

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
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login Google Failed:", error);
            alert("Error de autenticación con Google: " + error.message);
        }
    },

    // 2. GitHub
    loginWithGithub: async () => {
        const provider = new GithubAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login GitHub Failed:", error);
            alert("Error de autenticación con GitHub: " + error.message);
        }
    },

    // 3. Magic Link (Email sin contraseña)
    sendMagicLink: async (email) => {
        const actionCodeSettings = {
            // URL a la que se redirige después de hacer clic.
            // Debe estar en la lista de dominios autorizados de Firebase Console.
            url: window.location.href, // Redirige a la misma página donde estaba
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
            await signOut(auth);
            window.location.reload();
        } catch (error) {
            console.error("Logout Failed:", error);
        }
    },

    // Método para suscribirse a cambios de estado
    onStateChanged: (callback) => {
        onAuthStateChanged(auth, async (user) => {
            window.LumenfallAuth.currentUser = user;
            if (user) {
                const data = await handleUserProfile(user);
                window.LumenfallAuth.userData = data;
                callback(user, data);
            } else {
                window.LumenfallAuth.userData = null;
                callback(null, null);
            }
        });
    }
};
