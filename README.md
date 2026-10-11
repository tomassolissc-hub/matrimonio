# Matrimonio Riedel Palma & Solís Soto 2026

Site de seguimiento de gastos, invitados y pagos para el matrimonio.

**URL**: https://tomassolissc-hub.github.io/matrimonio/

---

## Setup (una sola vez)

### 1. Google Apps Script

1. Abre el Google Sheet del matrimonio.
2. Menú → **Extensiones → Apps Script**.
3. Borra el código que viene por defecto.
4. Pega el contenido del archivo `gas/Code.gs` de este repo.
5. Guarda (Ctrl+S).
6. Haz clic en **Implementar → Nueva implementación**.
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo (tu cuenta)**
   - Quién puede acceder: **Cualquier persona**
7. Haz clic en **Implementar**. Autoriza los permisos cuando te lo pida.
8. Copia la **URL del servicio web** que aparece (empieza con `https://script.google.com/macros/s/...`).

### 2. Conectar el frontend con el backend

1. Abre el archivo `js/api.js` en este repo.
2. En la primera línea que dice `const GAS_URL = 'TU_URL_AQUI';`, reemplaza `TU_URL_AQUI` con la URL que copiaste.
3. Guarda y haz commit.

### 3. Estructura del Google Sheet

El Apps Script espera estas pestañas con estos nombres exactos:

| Pestaña | Columnas |
|---------|----------|
| `Gastos` | A: Ítem · B: Neto_R · C: Neto_C · D: Neto_S · E: Bruto_R · F: Bruto_C · G: Bruto_S · H: Pagado_R · I: Pagado_C · J: Pagado_S |
| `Invitados Riedel` | A: Nombre · B: Grupo (Anto / Riedel Palma) |
| `Invitados Chico` | A: Nombre · B: Grupo |
| `Invitados Solís Soto` | A: Nombre · B: Grupo (Solís / Soto) |
| `Pagos` | ← Se crea automáticamente la primera vez que registras un pago |

**Fila 1 de cada pestaña debe ser encabezado** (el Apps Script la salta).

### 4. GitHub Pages

1. Crea el repo en GitHub: `tomassolissc-hub/matrimonio`.
2. Sube todos estos archivos al repo.
3. Ve a **Settings → Pages**.
4. Source: **Deploy from a branch** → branch `main` → carpeta `/ (root)`.
5. Guarda. En ~1 minuto estará disponible en `https://tomassolissc-hub.github.io/matrimonio/`.

---

## Cómo actualizar datos

- **Gastos / invitados**: edita el Google Sheet directamente. El site siempre lee los datos en tiempo real.
- **Nuevo pago**: desde la página [Pagos](https://tomassolissc-hub.github.io/matrimonio/pagos.html), llena el formulario. Los comprobantes se guardan automáticamente en una carpeta de Drive llamada "Matrimonio 2026 — Comprobantes".
- **Cambios al site** (diseño, funcionalidad): edita los archivos HTML/CSS/JS y haz push al repo. GitHub Pages publica automáticamente.

---

## Estructura del proyecto

```
matrimonio/
├── index.html        Panel general con totales y últimos pagos
├── gastos.html       Desglose de gastos por ítem y familia
├── invitados.html    Lista de invitados con búsqueda y filtros
├── pagos.html        Historial de pagos + formulario con upload
├── css/
│   └── style.css     Sistema de diseño compartido
├── js/
│   └── api.js        Módulo de comunicación con Apps Script
└── gas/
    └── Code.gs       Backend Google Apps Script (pegar en el editor)
```
