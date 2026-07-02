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
  home:            r => true,   // cualquier usuario autenticado
  controller:      r => r.includes("controller") || r.includes("admin"),
  asistencia_ruta: r => r.includes("asistencia_ruta") || r.includes("controller") || r.includes("admin"),
  operacional:     r => r.includes("operacional") || r.includes("admin"),
  finanzas:        r => r.includes("finanzas") || r.includes("admin"),
  sla:             r => r.includes("sla") || r.includes("controller") || r.includes("admin"),
  incidencias:     r => r.includes("incidencias") || r.includes("controller") || r.includes("admin"),
  retiros:         r => r.includes("retiros")    || r.includes("controller") || r.includes("admin"),
  growth:          r => r.includes("growth")     || r.includes("controller") || r.includes("admin"),
};

// ── SIDEBAR — FUENTE ÚNICA ────────────────────────────────────────────────────
/**
 * _MODULOS_SIDEBAR — lista canónica de todos los módulos.
 * Para agregar un módulo nuevo: solo editar este array.
 * auth.js lo inyecta en el <nav> de todos los módulos automáticamente.
 */
const _MODULOS_SIDEBAR = [
  { modulo: "controller",      icon: "🏠", label: "Inicio",            url: "/",                role: "controller"      },
  { modulo: "asistencia_ruta", icon: "🚚", label: "Asistencia Ruta",  url: "/asistencia_ruta", role: "asistencia_ruta" },
  { modulo: "operacional",     icon: "⚙️",  label: "Operacional",      url: "/operacional",     role: "operacional"     },
  { modulo: "finanzas",        icon: "💰", label: "Finanzas",          url: "/finanzas",        role: "finanzas"        },
  { modulo: "sla",             icon: "📊", label: "SLA CX",            url: "/sla",             role: "sla"             },
  { modulo: "incidencias",     icon: "📋", label: "Incidencias",       url: "/incidencias",     role: "incidencias"     },
  { modulo: "retiros",         icon: "🚛", label: "Retiros",           url: "/retiros",         role: "retiros"         },
  { modulo: "growth",          icon: "📈", label: "Growth",            url: "/growth",          role: "growth"          },
];

/**
 * _RECURSOS — links públicos (sin rol) siempre visibles al fondo del sidebar.
 * Para agregar Mercado Flex: descomentar la línea correspondiente.
 */
const _RECURSOS = [
  { emoji: "🟢", label: "Falabella Directo", url: "/falabella/" },
  // { emoji: "🟡", label: "Mercado Flex",      url: "/mercado-flex/" },
];

/**
 * _aplicarSidebar(roles, activeModule)
 * Reconstruye el <nav> completo desde la fuente única _MODULOS_SIDEBAR.
 * Muestra solo los módulos accesibles para el usuario.
 * Marca como .active el módulo actual.
 * Inyecta sección Recursos al fondo.
 */
function _aplicarSidebar(roles, activeModule) {
  // Busca sidebar en cualquier variante: <nav class="sidebar">, <nav> (Controller), o .app-shell nav
  const sidebar = document.querySelector("nav.sidebar")
               || document.querySelector(".app-shell nav")
               || document.querySelector("nav");
  if (!sidebar) return;

  // CSS de sección Recursos (inyectar una sola vez)
  if (!document.getElementById("_sb-css")) {
    const st = document.createElement("style");
    st.id = "_sb-css";
    st.textContent =
      "nav.sidebar,nav{display:flex!important;flex-direction:column!important}" +
      ".nav-recursos{margin-top:auto;border-top:1px solid var(--border,#2a2d3e);padding-top:4px}" +
      ".nav-item-rec{font-size:12px!important;opacity:.8}" +
      ".nav-item-rec .ext{font-size:10px;margin-left:auto;opacity:.5}";
    document.head.appendChild(st);
  }

  // Items de módulos filtrados por rol
  const modItems = _MODULOS_SIDEBAR
    .filter(m => _MODULO_ROL[m.role] && _MODULO_ROL[m.role](roles))
    .map(m => {
      const active = (m.modulo === activeModule) ? " active" : "";
      return '<a href="' + m.url + '" class="nav-item' + active + '">' + m.icon + " " + m.label + "</a>";
    }).join("");

  // Items de recursos
  const recItems = _RECURSOS.map(r =>
    '<a href="' + r.url + '" target="_blank" rel="noopener" class="nav-item nav-item-rec">' +
    r.emoji + " " + r.label + ' <span class="ext">&#8599;</span></a>'
  ).join("");

  // Reconstruir sidebar
  sidebar.innerHTML =
    '<div class="nav-section">Módulos</div>' + modItems +
    '<div class="nav-recursos"><div class="nav-section">Recursos</div>' + recItems + "</div>";
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


// ── WEATHER ───────────────────────────────────────────────────
function _injectWeatherStyles() {
  if (document.getElementById("_weather-style")) return;
  const style = document.createElement("style");
  style.id = "_weather-style";
  style.textContent =
    "#weather-strip{display:flex;gap:6px;padding:4px 24px;background:var(--card,#fff);border-bottom:1px solid var(--border,#e5e7eb);overflow-x:auto;scrollbar-width:none;justify-content:flex-end;}" +
    "#weather-strip::-webkit-scrollbar{display:none}" +
    ".w-day{display:flex;flex-direction:column;align-items:center;gap:1px;min-width:52px;padding:4px 6px;border-radius:8px;background:var(--bg,#f8f9fa);font-size:11px;line-height:1.3;flex-shrink:0;}" +
    ".w-day .w-name{font-weight:600;color:var(--muted,#6b7280);text-transform:capitalize;}" +
    ".w-day .w-ico{font-size:18px;}" +
    ".w-day .w-temp{color:var(--fg,#111);white-space:nowrap;}" +
    ".w-day.today{background:var(--accent,#2563eb)!important;}" +
    ".w-day.today .w-name,.w-day.today .w-temp{color:#fff!important;}" +
    "#weather-strip.loading{justify-content:center;align-items:center;font-size:12px;color:var(--muted,#9ca3af);min-height:36px;padding:6px 24px;}";
  document.head.appendChild(style);
}

function _wmoEmoji(code) {
  if (code === 0)  return "☀️";   // ☀️
  if (code <= 2)   return "🌤️"; // 🌤️
  if (code === 3)  return "☁️";   // ☁️
  if (code <= 48)  return "🌫️"; // 🌫️
  if (code <= 57)  return "🌦️"; // 🌦️
  if (code <= 67)  return "🌧️"; // 🌧️
  if (code <= 77)  return "❄️";   // ❄️
  if (code <= 82)  return "🌦️"; // 🌦️
  if (code <= 86)  return "🌨️"; // 🌨️
  return "⛈️"; // ⛈️
}

async function _fetchWeather(strip) {
  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=-33.45&longitude=-70.67" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=America%2FSantiago&forecast_days=7";
    const res  = await fetch(url);
    const data = await res.json();
    const { time, weather_code, temperature_2m_max, temperature_2m_min } = data.daily;
    const DAYS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
    strip.className = "";
    strip.innerHTML = time.map(function(t, i) {
      const d      = new Date(t + "T12:00:00");
      const isToday = i === 0;
      const name   = isToday ? "Hoy" : DAYS[d.getDay()];
      const emoji  = _wmoEmoji(weather_code[i]);
      const max    = Math.round(temperature_2m_max[i]);
      const min    = Math.round(temperature_2m_min[i]);
      return "<div class='w-day" + (isToday ? " today" : "") + "'>" +
        "<span class='w-name'>" + name + "</span>" +
        "<span class='w-ico'>" + emoji + "</span>" +
        "<span class='w-temp'>" + max + "° / " + min + "°</span>" +
        "</div>";
    }).join("");
  } catch(e) {
    if (strip) strip.style.display = "none";
  }
}

function _insertWeatherStrip() {
  if (document.getElementById("weather-strip")) return;
  _injectWeatherStyles();
  const strip = document.createElement("div");
  strip.id        = "weather-strip";
  strip.className = "loading";
  strip.textContent = "Cargando clima…";
  const header = document.querySelector("header");
  if (header && header.nextSibling) {
    header.parentNode.insertBefore(strip, header.nextSibling);
  } else if (header) {
    header.parentNode.appendChild(strip);
  }
  _fetchWeather(strip);
}

// ── SETUP AUTH ────────────────────────────────────────────────
/**
 * setupAuth({ modulo, onReady, loginErrorId? })
 *
 * @param {string}   modulo       — "controller" | "asistencia_ruta" | "operacional" | "finanzas" | "sla" | "incidencias"
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

      // Aplicar sidebar según roles (fuente única en auth.js)
      _aplicarSidebar(roles, modulo);

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

/** Exportada para módulos que no usan setupAuth() (ej: Controller). */
export { _insertWeatherStrip as insertWeatherStrip };
                                                                                                   