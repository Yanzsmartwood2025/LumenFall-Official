import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    FacebookAuthProvider,
    signInWithCustomToken,
    signInAnonymously,
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
                displayName: user.displayName || "Agente Desconocido",
                gameCode: newCode,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                roles: ['user'] // Roles futuros: admin, beta-tester, etc.
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
    userData: null, // Datos extendidos desde Firestore (incluyendo gameCode)

    // Métodos de Login
    loginWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login Google Failed:", error);
            alert("Error de autenticación con Google.");
        }
    },

    loginWithFacebook: async () => {
        const provider = new FacebookAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login Facebook Failed:", error);
            alert("Error de autenticación con Facebook.");
        }
    },

    logout: async () => {
        try {
            await signOut(auth);
            window.location.reload(); // Recargar para limpiar estados
        } catch (error) {
            console.error("Logout Failed:", error);
        }
    },

    // Método para suscribirse a cambios de estado desde otras páginas
    onStateChanged: (callback) => {
        onAuthStateChanged(auth, async (user) => {
            window.LumenfallAuth.currentUser = user;
            if (user) {
                // Cargar datos adicionales (código de juego, etc.)
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

// --- 6. Inicio Automático / Anónimo ---
(async () => {
    // Si ya hay usuario, onAuthStateChanged lo manejará.
    // Si queremos inicio anónimo automático si no hay user:
    /*
    if (!auth.currentUser && !initialAuthToken) {
        try {
            await signInAnonymously(auth);
            console.log("👻 Acceso Anónimo Iniciado.");
        } catch (error) {
            console.error("Anonymous Auth Failed:", error);
        }
    }
    */
   // NOTA: Para este requerimiento, preferimos que el usuario se loguee explícitamente para obtener el código.
})();
