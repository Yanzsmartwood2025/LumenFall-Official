// Lumenfall central session bridge.
// Identity is owned by AJNLIQ128 Firebase; profile/progress lives in AJN Supabase.
// Existing UI/game code keeps using window.LumenfallAuth for compatibility.

const AJN_ORIGIN = 'https://ajnliq128.vercel.app';
const SESSION_KEY = 'ajn_lumenfall_id_token';
const TOKEN_REQUEST = 'AJN_LUMENFALL_TOKEN_REQUEST';
const TOKEN_RESPONSE = 'AJN_LUMENFALL_TOKEN_RESPONSE';
const LOGOUT_REQUEST = 'AJN_LUMENFALL_LOGOUT_REQUEST';

let currentToken = null;
let authReady = false;
let currentUser = null;
let currentProfile = null;
let currentStorage = null;
const listeners = new Set();

function cleanHashAndReadToken() {
    try {
        const hash = window.location.hash.startsWith('#')
            ? window.location.hash.slice(1)
            : window.location.hash;
        const params = new URLSearchParams(hash);
        const token = params.get('idToken');

        if (token) {
            sessionStorage.setItem(SESSION_KEY, token);
            const clean = window.location.pathname + window.location.search;
            window.history.replaceState({}, document.title, clean);
            return token;
        }

        return sessionStorage.getItem(SESSION_KEY);
    } catch (error) {
        console.warn('Lumenfall: no se pudo recuperar la sesión central.', error);
        return null;
    }
}

function emitAuthState() {
    listeners.forEach((callback) => {
        try {
            callback(currentUser, currentProfile);
        } catch (error) {
            console.error('Lumenfall: listener de autenticación falló.', error);
        }
    });
}

function centralEntryUrl() {
    return `${AJN_ORIGIN}/joziel/lumenfall`;
}

function openCentralLogin() {
    try {
        window.top.location.href = centralEntryUrl();
    } catch {
        window.location.href = centralEntryUrl();
    }
}

function requestParentToken(forceRefresh = false) {
    return new Promise((resolve) => {
        if (window.parent === window) {
            resolve(null);
            return;
        }

        const requestId = `lf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        let settled = false;

        const timeout = window.setTimeout(() => {
            if (settled) return;
            settled = true;
            window.removeEventListener('message', onMessage);
            resolve(null);
        }, 6000);

        function onMessage(event) {
            if (event.origin !== AJN_ORIGIN) return;
            if (event.data?.type !== TOKEN_RESPONSE) return;
            if (event.data?.requestId !== requestId) return;

            settled = true;
            window.clearTimeout(timeout);
            window.removeEventListener('message', onMessage);

            const token = typeof event.data?.token === 'string' ? event.data.token : null;
            if (token) {
                try {
                    sessionStorage.setItem(SESSION_KEY, token);
                } catch {}
            }
            resolve(token);
        }

        window.addEventListener('message', onMessage);
        window.parent.postMessage(
            { type: TOKEN_REQUEST, requestId, forceRefresh },
            AJN_ORIGIN,
        );
    });
}

async function fetchCentralSession(token, allowRefresh = true) {
    if (!token) return null;

    const response = await fetch(`${AJN_ORIGIN}/api/lumenfall/session`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        cache: 'no-store',
    });

    if (response.status === 401 && allowRefresh) {
        const refreshed = await requestParentToken(true);
        if (refreshed) {
            currentToken = refreshed;
            return fetchCentralSession(refreshed, false);
        }
    }

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`AJN Lumenfall session HTTP ${response.status}: ${text.slice(0, 300)}`);
    }

    return response.json();
}

async function establishSession(token) {
    currentToken = token || null;

    if (!currentToken) {
        authReady = true;
        currentUser = null;
        currentProfile = null;
        currentStorage = null;
        emitAuthState();
        return;
    }

    try {
        const session = await fetchCentralSession(currentToken);
        if (!session?.ok || !session?.user) {
            throw new Error('La sesión central no devolvió un usuario válido.');
        }

        currentUser = {
            uid: session.user.uid,
            email: session.user.email || null,
            displayName: session.user.displayName || null,
            photoURL: session.user.photoURL || null,
        };

        currentProfile = {
            ...(session.profile || {}),
            gameCode: session.profile?.gameCode || null,
        };

        currentStorage = session.storage || null;
        window.LumenfallCloud = currentStorage;

        authReady = true;
        window.LumenfallAuth.currentUser = currentUser;
        window.LumenfallAuth.userData = currentProfile;
        window.LumenfallAuth.storage = currentStorage;

        console.log('⚡ Lumenfall System: sesión central AJN activa.');
        emitAuthState();
    } catch (error) {
        console.error('❌ Lumenfall System: no se pudo validar la sesión AJN.', error);
        authReady = true;
        currentUser = null;
        currentProfile = null;
        currentStorage = null;
        try {
            sessionStorage.removeItem(SESSION_KEY);
        } catch {}
        emitAuthState();
    }
}

window.LumenfallAuth = {
    app: null,
    auth: null,
    db: null,
    analytics: null,
    currentUser: null,
    userData: null,
    storage: null,

    loginWithGoogle: async () => {
        openCentralLogin();
        return { success: false, redirected: true };
    },

    loginWithGithub: async () => {
        openCentralLogin();
        return { success: false, redirected: true };
    },

    sendMagicLink: async () => {
        openCentralLogin();
        return {
            success: false,
            redirected: true,
            error: new Error('El acceso por correo ahora se gestiona desde AJNLIQ128.'),
        };
    },

    checkAndSignInWithMagicLink: async () => {
        return { success: false, notLink: true };
    },

    logout: async () => {
        try {
            sessionStorage.removeItem(SESSION_KEY);
        } catch {}

        currentToken = null;
        currentUser = null;
        currentProfile = null;
        currentStorage = null;
        window.LumenfallAuth.currentUser = null;
        window.LumenfallAuth.userData = null;
        window.LumenfallAuth.storage = null;
        emitAuthState();

        if (window.parent !== window) {
            window.parent.postMessage({ type: LOGOUT_REQUEST }, AJN_ORIGIN);
        } else {
            openCentralLogin();
        }
    },

    onStateChanged: (callback) => {
        listeners.add(callback);
        if (authReady) {
            queueMicrotask(() => callback(currentUser, currentProfile));
        }
        return () => listeners.delete(callback);
    },

    getIdToken: async (forceRefresh = false) => {
        if (forceRefresh || !currentToken) {
            const refreshed = await requestParentToken(forceRefresh);
            if (refreshed) currentToken = refreshed;
        }
        return currentToken;
    },

    saveProgress: async ({ progress, settings } = {}) => {
        const token = await window.LumenfallAuth.getIdToken(false);
        if (!token) return { success: false, error: 'No central session' };

        const response = await fetch(`${AJN_ORIGIN}/api/lumenfall/session`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ progress, settings }),
        });

        const data = await response.json().catch(() => ({}));
        return response.ok
            ? { success: true, data }
            : { success: false, error: data?.error || `HTTP ${response.status}` };
    },
};

const initialToken = cleanHashAndReadToken();

if (initialToken) {
    establishSession(initialToken);
} else {
    requestParentToken(false)
        .then((token) => establishSession(token))
        .catch(() => establishSession(null));
}
