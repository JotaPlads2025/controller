/**
 * shared/auth.js — Módulo compartido de autenticación Recíbelo
 * Importar en cada módulo con:
 *   import { db, nk, fmt, fmtD, safeId, setupAuth } from "/shared/auth.js";
 */
import { initializeApp }                                    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc }                        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signInWithPopup, OAuthProvider,
         GoogleAuthProvider, signOut, onAuthStateChanged }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ── FIREBASE ─────────────────────────────────────────────────
const _CFG = {
  apiKey:            "AIzaSyBXzxAnZZicHX-VoQDvcJ0rHqP3_pyu0-U",
  authDomain:        "proyectos-ctrl.firebaseapp.com",
  projectId:         "proyectos-ctrl",
  storageBucket:     "proyectos-ctrl.firebasestorage.app",
  messagingSenderId: "87976835637",
  appId:             "1:87976835637:web:50ccffcbccd8e550c34f7c"
};

export const app  = initializeApp(_CFG);
export const db   = getFirestore(app);
export const auth = getAuth(app);

// ── AUTH PROVIDERS ────────────────────────────────────────────
const _msProvider = new OAuthProvider("microsoft.com");
_msProvider.setCustomParameters({ tenant: "recibelo.cl" });
const _googleProvider = new GoogleAuthProvider();

// ── UTILITIES ─────────────────────────────────────────────────
/**
 * nk(s) — normaliza strings para matching de clientes.
 * Elimina acentos, variantes de apóstrofe, convierte / → -, lowercase.
 */
export function nk(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’‚‛`´']/g, "")
    .replace(/\//g, "-");
}

/** fmt(n) — formatea número como moneda CLP sin símbolo. */
export function fmt(n) {
  return Math.round(n || 0).toLocaleString("es-CL");
}

/** fmtD(d) — formatea fecha ISO "YYYY-MM-DD" como fecha local. */
export function fmtD(d) {
  return d ? new Date(d + "T12:00:00").toLocaleDateString("es-CL") : "—";
}

/**
 * safeId(s) — limpia string para usarlo como doc ID en Firestore.
 * Reemplaza /, elimina puntos iniciales, elimina __.
 */
export function safeId(s) {
  return String(s || "")
    .replace(/\//g, "-")
    .replace(/^\.+/, "_")
    .replace(/__/g, "_")
    .substring(0, 500) || "_";
}

// ── ROLES ─────────────────────────────────────────────────────
/**
 * Determina si el array de roles de un usuario le da acceso a un módulo.
 * asistencia_ruta: también accesible con rol "controller".
 */
const _MODULO_ROL = {
  controller:      r => r.includes("controller") || r.includes("admin"),
  asistencia_ruta: r => r.includes("asistencia_ruta") || r.includes("controller") || r.includes("admin"),
  operacional:     r => r.includes("operacional") || r.includes("admin"),
  finanzas:        r => r.includes("finanzas") || r.includes("admin"),
};

// ── SIDEBAR ───────────────────────────────────────────────────
/**
 * Muestra u oculta un link del sidebar buscando por IDs:
 * "nav-{id}" (usado en asistencia_ruta, operacional, finanzas)
 * "sidebar-{id}" (usado en controller / index.html)
 */
function _showNav(id, visible) {
  const el = document.getElementById("nav-" + id)
           || document.getElementById("sidebar-" + id);
  if (el) el.style.display = visible ? "flex" : "none";
}

/** Aplica visibilidad del sidebar según los roles del usuario. */
function _aplicarSidebar(roles) {
  _showNav("controller",   _MODULO_ROL.controller(roles));
  _showNav("asistencia",   _MODULO_ROL.asistencia_ruta(roles));
  _showNav("operacional",  _MODULO_ROL.operacional(roles));
  _showNav("finanzas",     _MODULO_ROL.finanzas(roles));
}

// ── ACCESO ────────────────────────────────────────────────────
/**
 * Obtiene los roles del usuario desde Firestore y evalúa acceso al módulo.
 * Retorna { roles: string[], hasAccess: boolean }
 */
async function _getAcceso(user, modulo) {
  try {
    const sn = await getDoc(doc(db, "config", "acceso"));
    if (!sn.exists()) return { roles: [], hasAccess: true };
    const data  = sn.data();
    const email = (user.email || "").toLowerCase();

    if (data.roles) {
      const k     = Object.keys(data.roles).find(k => k.toLowerCase() === email);
      const roles = k ? (data.roles[k] || []) : [];
      const fn    = modulo ? _MODULO_ROL[modulo] : null;
      const hasAccess = fn ? fn(roles) : true;
      return { roles, hasAccess };
    }

    // Fallback: estructura antigua con array de emails
    const hasAccess = (data.emails || []).map(e => e.toLowerCase()).includes(email);
    return { roles: [], hasAccess };
  } catch (e) {
    return { roles: [], hasAccess: true };
  }
}

// ── SETUP AUTH ────────────────────────────────────────────────
/**
 * setupAuth({ modulo, onReady, loginErrorId? })
 *
 * @param {string}   modulo       — "controller" | "asistencia_ruta" | "operacional" | "finanzas"
 * @param {Function} onReady      — async (user, roles) => void
 * @param {string}   loginErrorId — ID del div de error en el login (default "login-error")
 *
 * Maneja el ciclo completo:
 *   loading → login popup → verificar rol → aplicar sidebar → mostrar app → llamar onReady
 */
export function setupAuth({ modulo, onReady, loginErrorId = "login-error" }) {

  async function _doLogin(provider) {
    const errEl = document.getElementById(loginErrorId);
    if (errEl) errEl.textContent = "";
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged manejará el resultado
    } catch (e) {
      if (e.code !== "auth/cancelled-popup-request") {
        const msg = e.code === "auth/popup-closed-by-user"
          ? "Cerraste la ventana de inicio de sesión."
          : e.message;
        if (errEl) errEl.textContent = msg;
      }
    }
  }

  // Exponemos ambas convenciones de nombres usadas en los distintos módulos
  window.signInMS            = () => _doLogin(_msProvider);
  window.signInGoogle        = () => _doLogin(_googleProvider);
  window.signInWithMicrosoft = () => _doLogin(_msProvider);
  window.signInWithGoogle    = () => _doLogin(_googleProvider);
  window.doSignOut           = async () => {
    if (confirm("¿Cerrar sesión?")) await signOut(auth);
  };

  onAuthStateChanged(auth, async user => {
    // Ocultar spinner de carga inicial
    const loadingEl = document.getElementById("loading") || document.getElementById("app-loading");
    if (loadingEl) loadingEl.style.display = "none";

    if (user) {
      const { roles, hasAccess } = await _getAcceso(user, modulo);

      if (!hasAccess) {
        // Mostrar error ANTES de signOut para que no se pierda en el re-render
        const errEl = document.getElementById(loginErrorId);
        if (errEl) errEl.textContent = "Sin acceso a este módulo. Pide acceso a Jota.";
        const loginEl = document.getElementById("login-screen");
        if (loginEl) loginEl.style.display = "flex";
        const appEl = document.getElementById("app");
        if (appEl) appEl.style.display = "none";
        await signOut(auth); // dispara onAuthStateChanged con user=null (no limpia el error)
        return;
      }

      // Aplicar sidebar según roles
      _aplicarSidebar(roles);

      // Mostrar app, ocultar login
      const loginEl = document.getElementById("login-screen");
      const appEl   = document.getElementById("app");
      if (loginEl) loginEl.style.display = "none";
      if (appEl)   appEl.style.display   = "flex";

      // Rellenar user chip
      const avatarEl = document.getElementById("user-avatar");
      const nameEl   = document.getElementById("user-name");
      if (avatarEl) avatarEl.textContent = (user.displayName || user.email || "?").charAt(0).toUpperCase();
      if (nameEl)   nameEl.textContent   = user.displayName || user.email;

      // Callback del módulo
      if (onReady) await onReady(user, roles);

    } else {
      // Sin usuario — mostrar login (sin borrar mensaje de error si lo hay)
      const appEl   = document.getElementById("app");
      const loginEl = document.getElementById("login-screen");
      if (appEl)   appEl.style.display   = "none";
      if (loginEl) loginEl.style.display = "flex";
    }
  });
}
