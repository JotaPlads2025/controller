# Contexto del Proyecto — Recíbelo Platform
> Este archivo es leído automáticamente por Cowork al conectar esta carpeta.
> Mantenerlo actualizado cada vez que haya cambios estructurales relevantes.

## Archivos de conocimiento (memory/)

| Archivo | Descripción |
|---|---|
| `memory/miper-recibelo.json` | MIPER completo: 77 riesgos, 6 áreas, VEP calculados, medidas preventivas, requisitos legales. Base: DS 44/2024 + Guía ISP v3. Consultar para preguntas sobre prevención de riesgos, puestos expuestos, medidas por cargo. |

## Estándar de módulos — LEER ANTES DE CREAR O EDITAR CUALQUIER MÓDULO

Plantilla oficial: `public/MODULO_TEMPLATE.html` — copiar siempre desde ahí.

### Layout obligatorio (todos los módulos)

```
body (display:flex)
└── #app (display:flex; flex-direction:column)   ← JS: style.display='flex' al autenticar
    ├── <header>                                  ← ANCHO COMPLETO (56px height)
    │   ├── izq: logo recibelo.cl2.png + badge-module
    │   └── der: info contextual + user-chip (avatar + nombre + "salir")
    └── .app-shell (display:flex; flex:1)
        ├── <nav class="sidebar">                 ← NUNCA position:fixed
        │   ├── div.nav-section "Módulos"
        │   └── a.nav-item × módulo (id="nav-X" style="display:none" — setupAuth los muestra)
        │       (item activo: sin id, class="nav-item active", siempre visible)
        └── <main class="main-content">           ← flex:1, overflow-y:auto
```

### Reglas críticas

| Regla | Bien ✅ | Mal ❌ |
|---|---|---|
| Sidebar | `flex-shrink:0` dentro de `.app-shell` | `position:fixed` |
| User info | En `<header>` con `id="user-avatar"` y `id="user-name"` | En sidebar-footer |
| Logout | `onclick="doSignOut()"` (de setupAuth) | `onclick="cerrarSesion()"` propio |
| Auth | `setupAuth({ modulo, onReady })` de `/shared/auth.js` | Firebase manual duplicado |
| Colores | Variables CSS de `:root` (ver template) | Colores hardcodeados |
| Módulo activo en sidebar | `<a href="/X" class="nav-item active">` sin id | Con `style="display:none"` |
| Mostrar #app | `document.getElementById('app').style.display = 'flex'` | Cambiar flex-direction por separado |

### CSS variables estándar (`:root`)

```css
--bg:#0f1117  --card:#1a1d27  --card2:#20243a  --border:#2a2d3e
--text:#e8eaf0  --muted:#6b7280  --muted2:#4b5563
--azul:#3b82f6  --verde:#22c55e  --rojo:#ef4444  --amarillo:#f59e0b
--orange:#FF6B35  --violeta:#8b5cf6
```

### Estado de normalización por módulo

| Módulo | Layout | Auth | Notas |
|---|---|---|---|
| `/sla` | ✅ Template | ✅ setupAuth | Referencia más limpia |
| `/retiros` | ✅ Template | ⚠️ Auth propio (MSAL) | MSAL necesario para SharePoint |
| `/operacional` | ⚠️ Sidebar fixed | ✅ setupAuth | Pendiente normalizar sidebar |
| `/finanzas` | ⚠️ Sidebar fixed | ✅ setupAuth | Pendiente normalizar sidebar |
| `/asistencia_ruta` | ✅ Template | ✅ setupAuth | OK |
| `/` (controller) | ⚠️ Auth emails[] plano | ⚠️ Auth propio | Migración pendiente (ver próxima sesión) |

---

## Qué es este proyecto

Plataforma modular interna de Recíbelo, construida sobre Firebase. Cuatro módulos activos.

**Owner**: José Pablo Ballesteros (Jota) — Jefatura de Proyectos / Control Operacional.

---

## Módulos de la plataforma

| Ruta | Archivo local | Estado | Descripción |
|---|---|---|---|
| `/` (raíz) | `public/index.html` | ✅ Activo | Controller de Procesos — auditoría documental |
| `/asistencia_ruta` | `public/asistencia_ruta/index.html` | ✅ Activo | Monitor de rutas horario para equipo de cierre |
| `/operacional` | `public/operacional/index.html` | ✅ Activo | Liquidaciones conductores, Primera Milla, Bonos, Tarifas — rol `operacional` |
| `/finanzas` | `public/finanzas/index.html` | ✅ Activo | Facturación de cara a clientes — rol `finanzas` |
| `/sla` | `public/sla/index.html` | ✅ Activo | Análisis SLA CX — efectividad de entregas diaria — rol `sla` |
| *(compartido)* | `public/shared/auth.js` | ✅ Activo | Módulo ES compartido: Firebase init, nk/fmt/safeId, setupAuth() |

**URL base**: https://proyectos-ctrl.web.app
**Archivo de edición local**: `dashboard_procesos.html` → copiar a `public/index.html` antes de cada deploy.

---


---

## Módulo compartido — `public/shared/auth.js`

Elimina la duplicación de ~60 líneas de código Firebase en los 4 módulos.

**Exporta:**
- `app`, `db`, `auth` — instancias Firebase (singleton)
- `nk(s)` — normaliza strings para matching de clientes
- `fmt(n)` — formatea número como CLP
- `fmtD(d)` — formatea fecha ISO a fecha local
- `safeId(s)` — limpia string para usar como doc ID en Firestore
- `setupAuth({ modulo, onReady, loginErrorId? })` — ciclo completo de auth

**Uso en cada módulo:**
```javascript
import { db, nk, fmt, safeId, setupAuth } from "/shared/auth.js";
// importar solo lo que necesita el módulo de Firestore:
import { doc, getDoc, setDoc, collection, getDocs } from "https://...firebase-firestore.js";

setupAuth({
  modulo: "finanzas",  // "controller" | "asistencia_ruta" | "operacional" | "finanzas"
  onReady: async (user, roles) => {
    // user = Firebase User, roles = string[] desde /config/acceso
    cargarDatos();
  }
});
```

**IDs de sidebar soportados:** `nav-{controller|asistencia|operacional|finanzas}` y `sidebar-{...}` (Controller usa `sidebar-*`).

## Firebase — Proyecto: `proyectos-ctrl`

| Campo | Valor |
|---|---|
| Project ID | `proyectos-ctrl` |
| Auth Domain | `proyectos-ctrl.firebaseapp.com` |
| Base de datos | Firestore (NoSQL) |
| Plan | Spark (gratuito) |
| Hosting URL | https://proyectos-ctrl.web.app |

**firebaseConfig completo** (para scripts de sync):
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBXzxAnZZicHX-VoQDvcJ0rHqP3_pyu0-U",
  authDomain: "proyectos-ctrl.firebaseapp.com",
  projectId: "proyectos-ctrl",
  storageBucket: "proyectos-ctrl.firebasestorage.app",
  messagingSenderId: "87976835637",
  appId: "1:87976835637:web:50ccffcbccd8e550c34f7c"
};
```

**Deploy** (desde PowerShell en la carpeta raíz):
```powershell
cd "C:\Users\jball\OneDrive\Escritorio\Procesos Recibelo"
firebase deploy --only hosting
```

---

## Autenticación

Proveedores habilitados en Firebase Authentication:
- **Microsoft OAuth** (Azure AD tenant: recibelo.cl) — para cuentas `@recibelo.cl`
- **Google OAuth** — para cuentas Gmail (ej: Winni)

Redirect URI registrado en Azure AD: `https://proyectos-ctrl.firebaseapp.com/__/auth/handler`

Flujo: login → popup proveedor → verificar email en `/config/acceso` → si no está → signOut automático + mensaje de error.

---

## Control de acceso por roles

Gestionado en Firestore, **sin tocar código**. Documento `/config/acceso` con estructura `roles`:

```json
{
  "roles": {
    "jballesteros@recibelo.cl":  ["controller", "asistencia_ruta", "operacional", "finanzas"],
    "bconcha@recibelo.cl":       ["controller", "asistencia_ruta"],
    "cfuentes@recibelo.cl":      ["finanzas", "operacional"],
    "cgalvez@recibelo.cl":       ["asistencia_ruta"],
    "cmontes@recibelo.cl":       ["controller"],
    "dfigueroa@recibelo.cl":     ["finanzas", "operacional"],
    "gherrera@recibelo.cl":      ["asistencia_ruta"],
    "mrivera@recibelo.cl":       ["asistencia_ruta", "operacional"],
    "sflores@recibelo.cl":       ["controller"],
    "vmeza@recibelo.cl":         ["asistencia_ruta"],
    "wii.nni@gmail.com":         ["controller", "asistencia_ruta"],
    "inaki@recibelo.cl":         ["sla"],
    "Ylauquen@gmail.com":        ["asistencia_ruta"]
  }
}
```

**Para agregar/quitar accesos**: Firebase Console → Firestore → `config` → `acceso` → editar → Guardar. Cambio inmediato, sin redeploy.

**Lógica de sidebar por módulo** (implementada en cada `checkAccess`/`verificarAcceso`):
- `controller` → puede ver Controller en sidebar
- `asistencia_ruta` OR `controller` → puede ver Asistencia Ruta
- `operacional` → puede ver Operacional
- `finanzas` → puede ver Finanzas
- El sidebar solo muestra los módulos a los que tiene acceso (`display:flex` vs `display:none`)

> **CRÍTICO**: siempre usar `navEl.style.display = tieneRol ? "flex" : "none"` — nunca solo cambiar opacity/cursor, o el elemento queda invisible aunque tenga acceso.

---

## Colecciones Firestore

### `/areas/{areaId}`
IDs: `OP`, `CX`, `FIN`, `COM`, `GP`, `CTRL`, `LOG`, `IT`, `MKT`
Campos: codigo, nombre, responsable, estado

### `/procesos/{procesoId}`
Campos: codigo, nombre, area_id, area_nombre, responsable, nivel_madurez (int 1-4), nivel_label, tipo, version, archivo_md, subcarpeta, ubicacion_doc, tamano_kb, fecha_modificacion, estado, observaciones

### `/colaboradores/{colaboradorId}`
IDs: `COL001` a `COL069`
Campos: nombre, apellido_p, apellido_m, nombre_completo, cargo, funcion_1, funcion_2, funcion_3, funciones (array)

**Columna H "Activo"** (Excel Maestro únicamente — no en Firestore): `Si` / `No`. Indica si el colaborador sigue activo en Recíbelo. No se borran registros inactivos para mantener historial.

**Colaboradores nuevos (jun 2026):**
| ID | Nombre | Cargo | Función |
|---|---|---|---|
| COL065 | Bryan Lucas Aravena Figueroa | ASISTENTE COMERCIAL | Control de KPIs comercial y prospección |
| COL066 | Flabio Alexander Diaz Peñailillo | PICKER SUPERVISOR | Picker |
| COL067 | Leyla Isis Padilla Silva | AUXILIAR DE ASEO | Limpieza y orden |
| COL068 | Manuel Alejandro Quezada Salazar | ENCARGADO DE RESGUARDO OPERACIONAL, SEGURIDAD Y CONTINUIDAD | Seguridad, operaciones, infraestructura, mantenimiento |
| COL069 | Sebastián Eduardo Aguirre Alvarez | PICKER SUPERVISOR | Picker |

### `/funciones/{funcionId}`
IDs: `F001` a `F036`
Campos: numero, funcion, descripcion, area, depende_de

### `/config/acceso`
Control de acceso por módulo (ver sección anterior)

### `/historial/{changeId}` *(pendiente)*
Para registrar cambios: proceso_id, campo_modificado, valor_anterior, valor_nuevo, fecha, autor.

---

## Colecciones Firestore — Módulo Operacional (`/operacional`)

### `/fin_tarifas/{comunaKey}`
Clave = nk(nombre_comuna). Campos: `nombre`, `zona`, `a:[lv,sab,dom]`, `m:[lv,sab,dom]`

### `/fin_uploads/{uid}`
Metadata de cada Excel subido. Campos: `tipo` (paqueteria|pm), `nombre`, `fecha_inicio`, `fecha_max`, `upload_fecha`, `cantidad`, `subido_por`

### `/fin_paquetes/{uid}`
Datos de conductores por upload de paquetería.

### `/fin_pm/{uid}`
Datos de Primera Milla por upload.

### `/fin_bonos/{id}`
Bonos manuales. Campos: `chofer`, `monto`, `motivo`, `fecha`, `subido_por`

### `/fin_conductores/{id}`
Conductores registrados. Campos: `nombre`, `estado`

### `/fin_feriados/{fecha}`
Feriados (id = fecha ISO yyyy-mm-dd)

### `/fin_pm_flotas/{key}`
Memoria de flotas especiales PM.

### `/fin_liquidaciones/{id}`
Liquidaciones cerradas (historial).

---

## Colecciones Firestore — Módulo Finanzas (`/finanzas`)

### `/fin_tarifas_clientes/{key}`
Tarifas por cliente para facturación. Clave = `safeId(origen + "_" + nk(nombre))`.
Campos: `nombre`, `origen` (RECIBELO|SHIPIT|ENVIAME|ALAS|DESPACHALO), + todas las columnas del Excel de tarifas mapeadas a snake_case (sameday, next_day, colina_same, colina_next_day, next_day_rural, tarifa_turbo, recargo_l, recargo_netday_l, recargo_xl_sameday, recargo_xl_nextday, recargo_xxl_sameday, recargo_xxl_nextday, recargo_xxxl, recargo_xxxl_nextday, recargo_5xl, tarifa_retiros).

**IMPORTANTE — función `nk()`**: normaliza nombres para matching. Elimina acentos, apostrofes (`'` U+2019, `` ` ``, `´`), convierte `/` a `-`, lowercase, trim.
```javascript
function nk(s){return String(s||"").trim().toLowerCase().replace(/\s+/g," ").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/['‘’‚‛`´']/g,"").replace(/\//g,"-");}
```

**`safeId()`**: limpia strings para usar como doc ID en Firestore (sin `/`, sin `.` inicial, sin `__`).

### `/fin_aliases/{nk(nombrePaquetes)}`
Mapeo manual de nombres distintos entre Excel de paquetes y matriz de tarifas.
Campos: `desde` (nombre raw del paquetes), `desde_nk`, `origen`, `hacia_key` (doc ID en fin_tarifas_clientes), `hacia_nombre`, `creado_por`, `creado_fecha`.
Se aplica automáticamente en `buscarTarifa()` como paso 0 antes de los demás fallbacks.

### `/fin_reembolsos/{id}`
Reembolsos/indemnizaciones por cliente.
Campos: `cliente_key`, `cliente_nombre`, `origen`, `monto`, `motivo` (Siniestro|Trazabilidad|Producto dañado|Otro), `descripcion`, `pedido_id` (opcional), `periodo` (YYYY-MM), `creado_por`, `creado_fecha`.
**Son informativos** — aparecen en el PDF pre-factura pero NO descuentan del total (confirmado con Finanzas mayo 2026). Algunos van con nota de crédito por fuera.

### `/fin_facturacion/{periodo}`
Snapshot de cierre de mes (YYYY-MM).
Campos: `periodo`, `fecha_cierre`, `cerrado_por`, `total`, `total_reembolsos`, `clientes`, `paquetes`, `incidencias`, `fuentes` (array de filenames), `detalle` (array de RESULTADOS).

---

## Módulo Finanzas — Arquitectura y lógica

### Flujo completo
1. **Tarifas** → subir Excel desde pestaña Tarifas → sync a `fin_tarifas_clientes` (borra todo antes de escribir para evitar duplicados)
2. **Paquetes** → cargar uno o más Excels en pestaña Carga → se combinan con flatMap
3. **Calcular** → botón "Calcular cobro" → procesa todas las filas → genera RESULTADOS + INCIDENCIAS
4. **Revisar incidencias** → SIN MATCH muestran botón "Mapear →" → alias se guarda y se re-procesa automáticamente
5. **Recalcular** → si se edita una tarifa sin recargar la página → botón "🔄 Recalcular" recarga tarifas de Firestore y vuelve a calcular con los Excels en memoria
6. **PDF/ZIP** → botón "📄 PDF ▾" → PDF individual (pide nombre) o ZIP todos los clientes
7. **Reembolsos** → pestaña Reembolsos → registrar por cliente/motivo/período/ID pedido (informativos, no descuentan)
8. **Cerrar mes** → botón "✅ Cerrar mes" → guarda snapshot en `fin_facturacion/{YYYY-MM}`
9. **Historial** → pestaña Historial → lista todos los cierres guardados con totales

### buscarTarifa() — cadena de fallbacks
0. Alias manual (`fin_aliases`)
1. Clave exacta: `origen_nk(nombre)`
2. Solo nombre: `nk(nombre)`
3. Cualquier clave que termine en `_nk(nombre)` (case-sensitive)
4. Código numérico al inicio del nombre
5. Fallback al integrador mismo (ej: Nombre CP "Jose Pablo" bajo ALAS → busca tarifa de ALAS SPA)

### Integradores
SHIPIT, ENVIAME, ALAS, DESPACHALO → usar `Nombre CP` como cliente real. RECIBELO → usar `Cliente`.

### Servicios y tamaños (desde columna Tags)
TURBO > NEXTDAY > SAMEDAY. Tamaños: L, XL, XXL, XXXL, 5XL/XXXXXL.

### Incidencias
- **SIN MATCH**: cliente no encontrado en tarifas → mostrar agrupado por cliente con botón Mapear
- **SIN TARIFA**: cliente existe pero la celda del servicio es null/0
- **TABLA**: tarifa variable, no calculable automáticamente

### PDF pre-factura (jsPDF + autoTable)
Incluye: período, cliente, desglose SD/ND/Turbo/Recargos/Total, sección de reembolsos si hay.
ZIP: JSZip con todos los clientes del período.

---

## Reglas de Firestore (actualizadas)

Aplicar en Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if false;
    }
    match /fin_tarifas_clientes/{doc} { allow write: if request.auth != null; }
    match /fin_tarifas/{doc}          { allow write: if request.auth != null; }
    match /fin_uploads/{doc}          { allow write: if request.auth != null; }
    match /fin_paquetes/{doc}         { allow write: if request.auth != null; }
    match /fin_pm/{doc}               { allow write: if request.auth != null; }
    match /fin_bonos/{doc}            { allow write: if request.auth != null; }
    match /fin_pm_flotas/{doc}        { allow write: if request.auth != null; }
    match /fin_liquidaciones/{doc}    { allow write: if request.auth != null; }
    match /fin_aliases/{doc}          { allow write: if request.auth != null; }
    match /fin_reembolsos/{doc}       { allow write: if request.auth != null; }
    match /fin_facturacion/{doc}      { allow write: if request.auth != null; }
    match /fin_feriados/{doc}         { allow write: if request.auth != null; }
    match /fin_conductores/{doc}      { allow write: if request.auth != null; }
    match /historial_ruta/{doc}       { allow write: if request.auth != null; }
    match /growth_snapshots/{doc}     { allow write: if request.auth != null; }
    match /growth_data/{doc}          { allow write: if request.auth != null; }
    match /growth_notas/{doc}         { allow write: if request.auth != null; }
  }
}
```

---

## CRITICO: Truncamiento de archivos grandes

**Sintoma**: Al editar archivos grandes de JS con la herramienta Edit o con bash heredocs, el archivo se puede truncar. Los emojis y template literals del JS rompen la escritura.

**Aplica a**: `dashboard_procesos.html` Y `public/finanzas/index.html` (1500+ líneas con template literals complejas).

**Solucion**: SIEMPRE usar Python para escribir o modificar el archivo:
```python
path = "/sessions/<session-id>/mnt/Procesos Recibelo/dashboard_procesos.html"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
# modificar content con str.replace()
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Lineas: {content.count(chr(10))}")
print("Final OK:", repr(content[-40:]))
```

Después de cualquier modificación, siempre copiar a public/:
```bash
cp "dashboard_procesos.html" "public/index.html"
```

---

## Estado del proyecto (mayo 2026)

- [x] Firebase proyecto creado (`proyectos-ctrl`)
- [x] Firestore poblado (38 procesos, 9 areas, 36 funciones, 69 colaboradores en Excel — Firestore aún en 64, pendiente sync)
- [x] Dashboard Controller publicado en https://proyectos-ctrl.web.app
- [x] Autenticacion Microsoft + Google implementada
- [x] Control de acceso via `/config/acceso` con estructura de roles por modulo
- [x] Logo Recibelo en login y header
- [x] Boton "Ficha PDF" en panel de detalle de cada proceso
- [x] Arquitectura modular definida (controller / asistencia_ruta / operacional / finanzas)
- [x] Modulo `/asistencia_ruta` — monitor de rutas, alarmas, delta comparison, cerrar dia
- [x] Modulo `/operacional` — Paqueteria, Primera Milla, Bonos, Tarifas, Admin, PDF por conductor, ZIP masivo
- [x] Modulo `/finanzas` — Cobros, Incidencias, Aliases, Tarifas sync, Reembolsos, PDF/ZIP pre-factura, Cerrar mes
- [x] Sidebar dinámico por roles — cada módulo muestra solo los links autorizados (`display:flex/none`)
- [x] Sistema de aliases (`fin_aliases`) — mapeo permanente de nombres distintos entre paquetes y tarifas
- [x] Multi-lote paquetes — cargar varios Excels y se combinan automáticamente
- [x] Incidencias agrupadas por cliente con botón "Mapear →" para crear alias en un clic
- [x] PDF pre-factura por cliente (jsPDF) + ZIP masivo de todos los clientes (JSZip)
- [x] Reembolsos/indemnizaciones — registro por cliente/período/motivo, aparecen en PDF
- [x] Cierre de mes — snapshot guardado en `fin_facturacion/{YYYY-MM}`
- [x] Pestaña Historial en /finanzas — lista cierres desde `fin_facturacion` con totales
- [x] Botón Recalcular — recarga tarifas de Firestore y recalcula sin re-subir Excel
- [x] Campo ID Pedido en formulario de reembolsos
- [x] Fix duplicados en sync tarifas — ahora borra todos antes de escribir
- [x] Fix dropdown cliente en reembolsos — position:absolute, z-index:200
- [x] Reglas Firestore: agregadas fin_feriados y fin_conductores
- [ ] BUG: ETA cruza medianoche en asistencia_ruta — fix pendiente (ver detalles abajo)
- [ ] Migrar Controller (/) al sistema de roles (actualmente usa emails[] plano)
- [x] Módulo compartido `public/shared/auth.js` — auth, nk, fmt, safeId, setupAuth()
- [x] Widget clima Open-Meteo (7 días, Santiago) — inyectado automáticamente en todos los módulos via shared/auth.js
- [x] Módulo `/sla` — SLA CX: merge ingreso+egreso, clasificación automática, revisión manual, export Excel
- [x] Módulo `/growth` — Seguimiento de clientes: tiers, canales, notas, historial mensual
- [ ] Campo `ubicacion_doc` (SharePoint links) por completar en procesos
- [ ] Coleccion `/historial` (Controller) por implementar
- [x] Reembolsos: confirmado con Finanzas → son informativos (no descuentan, van con nota de crédito)
- [x] Cobro de retiro PM (cara al cliente) — fórmula: `floor((200 - totalMes) / 10)` días × tarifa_retiros
  - Ej: 180 pedidos → 2 días cobrados · 150 pedidos → 5 días cobrados
  - Solo aplica si cliente tuvo < 200 retiros en el mes y tarifa_retiros > 0
  - Usa columna Fecha del Excel para agrupar (detecta: Fecha egreso/creación/inicio/ingreso/pedido)

---

## Módulo SLA CX (`/sla`)

### Flujo
1. Subir Excel ingreso y/o egreso del día anterior (mismo formato estándar)
2. Merge por columna J (ID interna), deduplicar — egreso tiene prioridad si aparece en ambos
3. Clasificar cada paquete no entregado con reglas automáticas
4. Mostrar resumen por cliente con SLA %
5. Tab Revisión → Iñaki ajusta clasificaciones manualmente con un click
6. Exportar Excel con detalle + hoja Resumen

### Fórmula SLA
`SLA = Completados / (Total − Pendientes − Incidencias Recíbelo) × 100`
- Pendientes = Estado ML (col T) = "Pendiente" OR Estado sistema en ["En ruta","En depósito","Redespacho"]
- Incidencias Recíbelo = paquetes clasificados como culpa Recíbelo (auto o manual)

### Columnas clave
| Col | Nombre | Uso |
|-----|--------|-----|
| A | Fecha creación | Días transcurridos |
| C | Fecha egreso | — |
| D | Cliente | Agrupación resultados |
| F | Tags | Detectar "oficina","FLEX" |
| J | ID interna | Merge + deduplicar |
| S | Estado sistema | "Completado" = entregado · "No Completado","Cancelado" = no entregado |
| T | Estado ML | "Pendiente" = excluir SLA |
| U | Estado SubML | "Buyer Rescheduled","Not Visited","Receiver Absent"... |
| AD | Comentario conductor | Texto libre chofer |
| AG | Motivo no entrega | Dropdown |
| AI | Hora entrega | Detectar horario tardío (≥20h / ≥22h) |

### Estados Estado ML (col T)
`cancelled`, `delivered`, `Pendiente`, `ready_to_ship`, `shipped`

### Estados SubML (col U)
`Buyer Rescheduled`, `Not Visited`, `Out for Delivery`, `Printed`, `Ready to Print`, `Receiver Absent`, (Vacías)

### Reglas de clasificación
- Motivo + comentario vacíos → 🔴 Recíbelo
- "Otros" sin comentario → 🔴 Recíbelo
- "Paquete no corresponde a ruta" → 🔴 Recíbelo
- "Sin moradores" + hora ≥22:00 → 🔴 Recíbelo | hora 20-22 → 🟠 Revisar | normal + SubML Receiver Absent → 🟡 Cliente
- "Reprogramar" + SubML Buyer Rescheduled → 🟡 Cliente | SubML Not Visited → 🔴 Recíbelo | resto → 🟠 Revisar
- "Domicilio laboral" + tag oficina + >1 día → 🔴 Recíbelo
- "Dirección errónea" sin comentario → 🔴 Recíbelo | con comentario → 🟠 Revisar
- "Se niega"/"No contesta" + hora ≥22:00 → 🔴 Recíbelo | 20-22 → 🟠 Revisar | normal → 🟡 Cliente

### Rol Firestore
Agregar en `/config/acceso`: `"inaki@recibelo.cl": ["sla"]` (o quien corresponda del equipo CX)

## Próxima sesión — prioridades

1. **DEPLOY PENDIENTE** — ejecutar `firebase deploy --only hosting` + hard refresh (Ctrl+Shift+R)
   - Incluye: Historial, Recalcular, ID Pedido, fix duplicados tarifas, fix dropdown, fórmula Retiro PM

2. **BUG CRÍTICO — ETA cruza medianoche** (`public/asistencia_ruta/index.html`)
   - Síntoma: ETA de "12:27 a.m." se marca VERDE porque `getHours()` devuelve 0 (menor que 22)
   - Fix: comparar contra datetime fijo en vez de número de hora:
     ```javascript
     const cutoff22 = new Date(); cutoff22.setHours(22, 0, 0, 0);
     const cutoff21 = new Date(); cutoff21.setHours(21, 0, 0, 0);
     etaClase = horaTermino >= cutoff22 ? "crit" : horaTermino >= cutoff21 ? "warn" : "ok";
     ```
   - Aplica en: cálculo de `etaClase` dentro de `procesarDatos`

3. **ubicacion_doc** — agregar links SharePoint a procesos en Controller que los tengan

4. **Migrar Controller** (/) al sistema de roles (actualmente usa emails[] plano)

---

## Lógica de facturación — Módulo Finanzas (cara al cliente)

### Fuentes de datos

| Archivo | Descripción |
|---|---|
| Excel de Tarifas | Hoja "Tarifas Nuevas". 655+ clientes, columnas según COL_MAP. Las tarifas YA incluyen alza de bencina. |
| Excel de Paquetes | Detalle general de egresos. Columnas clave: `Cliente`, `Tags`, `Nombre CP`, `Comuna`, `Estado sistema`. |

### Detección de servicio desde columna `Tags`

| Tag | Servicio |
|---|---|
| vacío / None | SAMEDAY estándar |
| contiene "Next Day" | NEXTDAY |
| contiene "Turbo" | TURBO |
| contiene "Tamaño L" | + recargo L |
| contiene "XL" (no XXL/XXXL) | + recargo XL |
| contiene "XXL" | + recargo XXL |
| contiene "XXXL" | + recargo XXXL |
| contiene "5XL" o "XXXXXL" | + recargo 5XL |

### Detección de zona desde columna `Comuna`

| Condición | Zona |
|---|---|
| "Colina" | COLINA |
| Lista de rurales | RURAL |
| Resto | NORMAL |

Comunas rurales: TALAGANTE, MARIA PINTO, PIRQUE, BUIN, NOS, CURACAVI, CALERA DE TANGO, SAN JOSE DE MAIPO, EL MONTE, LAMPA, PAINE, PENAFLOR, MELIPILLA.

### Valores especiales en tarifas

- `null` / `SIN SERV` / `SIN TARIFA` / `CPS` / `NOTA` / `SIN RECARGO` → 0, no cobrar
- `TABLA` → tarifa variable, marcar como incidencia TABLA
- `RECIBELO` no es integrador — es cliente directo

### Cobro de retiro Primera Milla (cara al cliente) — IMPLEMENTADO

Fórmula acordada con Finanzas (mayo 2026):
`días_cobrados = floor((200 - totalRetirosMes) / 10)`

- Solo aplica si `totalRetirosMes < 200` y `tarifa_retiros > 0`
- Ejemplo: 180 pedidos → (200-180)/10 = 2 días · 150 pedidos → (200-150)/10 = 5 días
- `tarifa_retiros` viene de la columna "Tarifa Retiros" en `fin_tarifas_clientes`
- El cobro se suma al total del cliente y aparece en el PDF pre-factura

---

## Lógica de pagos — Módulo Finanzas (cara al conductor)

### Tarifas por zona (vigentes julio 2025)

| Zona | Auto L-V | Moto L-V |
|---|---|---|
| 🔵 Azul claro | $1.100 | $1.000 |
| 🟠 Naranja | $1.200 | $1.000 |
| 🟡 Amarillo | $1.300 | $1.100 |
| 🔵 Azul oscuro | $1.400 | $1.200 |
| 🩷 Colina | $1.900 | $1.400 |

Sábado: +$100. Domingo: +$300.

### Reglas de negocio — pago al conductor

- Tag **Next Day**: tarifa fija ($1.200 en zonas amarillo/azul oscuro, $1.000 resto). Colina ignora ND.
- Tag **XXXL**: × 2. Tag **XXXXXL**: × 3.
- **Rodrigo Lillo**: +$100 en todos sus paquetes.
- **Excluidos**: TURBO, JS, REBAJAS, PHERO KENNETH MEIER, RURAL 12 HORAS, BODEGA EXTERNA.

> ⚠️ "Santiago centro" viene con `c` minúscula en el Excel — normalizar siempre.
