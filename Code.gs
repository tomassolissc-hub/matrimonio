// ============================================================
// MATRIMONIO RIEDEL PALMA & SOLÍS SOTO 2026
// Google Apps Script — Backend API
// ============================================================

const SHEET_ID   = '1D-_7ZK_DbTrM79JHuGajoU3p-HaqFxJzs2kBEvVYVbM';
const FOLDER_NAME = 'Matrimonio 2026 — Comprobantes';

// ── CORS helper ──────────────────────────────────────────────
function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── GET endpoint ─────────────────────────────────────────────
function doGet(e) {
  try {
    const action = (e.parameter && e.parameter.action) || 'all';
    const ss = SpreadsheetApp.openById(SHEET_ID);

    if (action === 'guests')  return json(getGuests(ss));
    if (action === 'pagos')   return json(getPagos(ss));
    if (action === 'gastos')  return json(getGastos(ss));
    return json({ gastos: getGastos(ss), pagos: getPagos(ss) });

  } catch (err) {
    return json({ error: err.message });
  }
}

// ── POST endpoint ─────────────────────────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);

    if (payload.action === 'addPago') {
      return json(addPago(ss, payload.data));
    }
    if (payload.action === 'uploadComprobante') {
      return json(uploadComprobante(ss, payload));
    }
    return json({ error: 'Acción no reconocida' });

  } catch (err) {
    return json({ error: err.message });
  }
}

// ── GASTOS ────────────────────────────────────────────────────
// Lee la pestaña "Gastos" con columnas:
// A: Item | B: Neto_R | C: Neto_C | D: Neto_S |
// E: Bruto_R | F: Bruto_C | G: Bruto_S |
// H: Pagado_R | I: Pagado_C | J: Pagado_S
function getGastos(ss) {
  const sh = ss.getSheetByName('Gastos');
  if (!sh) return { error: 'Pestaña Gastos no encontrada' };

  const rows = sh.getDataRange().getValues();
  const headers = rows[0];
  const items = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    items.push({
      item: r[0],
      rn: r[1] || 0,  cn: r[2] || 0,  sn: r[3] || 0,
      rb: r[4] || 0,  cb: r[5] || 0,  sb: r[6] || 0,
      pr: r[7] || 0,  pc: r[8] || 0,  ps: r[9] || 0,
    });
  }

  // Totales calculados
  const totals = items.reduce((acc, x) => {
    acc.rn += x.rn; acc.rb += x.rb;
    acc.cn += x.cn; acc.cb += x.cb;
    acc.sn += x.sn; acc.sb += x.sb;
    acc.tn += x.rn + x.cn + x.sn;
    acc.tb += x.rb + x.cb + x.sb;
    acc.pr += x.pr; acc.pc += x.pc; acc.ps += x.ps;
    acc.pt += x.pr + x.pc + x.ps;
    return acc;
  }, { rn:0, rb:0, cn:0, cb:0, sn:0, sb:0, tn:0, tb:0, pr:0, pc:0, ps:0, pt:0 });

  return { items, totals };
}

// ── INVITADOS ─────────────────────────────────────────────────
// Lee pestañas: "Invitados Riedel", "Invitados Chico", "Invitados Solís Soto"
// Columnas: A: Nombre | B: Grupo
function getGuests(ss) {
  const tabs = {
    riedel: 'Invitados Riedel',
    chico:  'Invitados Chico',
    solis:  'Invitados Solís Soto',
  };

  const result = {};
  for (const [key, name] of Object.entries(tabs)) {
    const sh = ss.getSheetByName(name);
    if (!sh) { result[key] = []; continue; }
    const rows = sh.getDataRange().getValues().slice(1); // skip header
    result[key] = rows
      .filter(r => r[0])
      .map(r => ({ n: r[0], g: r[1] || '' }));
  }
  return result;
}

// ── PAGOS ─────────────────────────────────────────────────────
// Lee / crea pestaña "Pagos"
// Columnas: A: ID | B: Fecha | C: Familia | D: Concepto | E: Monto | F: Comprobante_URL
function getPagos(ss) {
  const sh = getOrCreatePagosSheet(ss);
  const rows = sh.getDataRange().getValues();
  if (rows.length <= 1) return [];

  return rows.slice(1).map(r => ({
    id:           r[0],
    fecha:        r[1] ? Utilities.formatDate(new Date(r[1]), 'America/Santiago', 'dd/MM/yyyy') : '',
    familia:      r[2],
    concepto:     r[3],
    monto:        r[4] || 0,
    comprobante:  r[5] || '',
  })).filter(p => p.id);
}

// ── AGREGAR PAGO ──────────────────────────────────────────────
function addPago(ss, data) {
  const sh = getOrCreatePagosSheet(ss);
  const id = 'P' + new Date().getTime();
  const fecha = new Date();

  sh.appendRow([
    id,
    fecha,
    data.familia  || '',
    data.concepto || '',
    data.monto    || 0,
    data.comprobante || '',
  ]);

  return { ok: true, id };
}

// ── SUBIR COMPROBANTE ─────────────────────────────────────────
function uploadComprobante(ss, payload) {
  // payload: { fileData: base64, fileName, mimeType, pagoId }
  const folder = getOrCreateFolder();
  const blob = Utilities.newBlob(
    Utilities.base64Decode(payload.fileData),
    payload.mimeType,
    payload.fileName
  );
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const url = file.getUrl();

  // Si viene con pagoId, actualizar la fila existente
  if (payload.pagoId) {
    const sh = getOrCreatePagosSheet(ss);
    const data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === payload.pagoId) {
        sh.getRange(i + 1, 6).setValue(url);
        break;
      }
    }
  }

  return { ok: true, url };
}

// ── HELPERS ───────────────────────────────────────────────────
function getOrCreatePagosSheet(ss) {
  let sh = ss.getSheetByName('Pagos');
  if (!sh) {
    sh = ss.insertSheet('Pagos');
    sh.appendRow(['ID', 'Fecha', 'Familia', 'Concepto', 'Monto', 'Comprobante_URL']);
    sh.setFrozenRows(1);
    sh.getRange('A1:F1').setFontWeight('bold');
    sh.setColumnWidth(1, 120);
    sh.setColumnWidth(2, 100);
    sh.setColumnWidth(3, 100);
    sh.setColumnWidth(4, 200);
    sh.setColumnWidth(5, 100);
    sh.setColumnWidth(6, 300);
  }
  return sh;
}

function getOrCreateFolder() {
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);
}
