// ============================================================
// MATRIMONIO RIEDEL PALMA & SOLÍS SOTO 2026
// Google Apps Script — Backend API
// ============================================================

const SHEET_ID    = '1D-_7ZK_DbTrM79JHuGajoU3p-HaqFxJzs2kBEvVYVbM';
const FOLDER_NAME = 'Matrimonio 2026 — Comprobantes';
const CACHE_TTL   = 300; // 5 minutos

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const action = (e.parameter && e.parameter.action) || 'all';
    const bust   = e.parameter && e.parameter.bust;
    const ss     = SpreadsheetApp.openById(SHEET_ID);
    if (action === 'guests')     return json(getGuests(ss, bust));
    if (action === 'pagos')      return json(getPagos(ss, bust));
    if (action === 'gastos')     return json(getGastos(ss));
    if (action === 'banquetera') return json(getBanquetera(ss));
    return json({ gastos: getGastos(ss), pagos: getPagos(ss) });
  } catch (err) {
    return json({ error: err.message });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);
    if (payload.action === 'addPago')           return json(addPago(ss, payload.data));
    if (payload.action === 'uploadComprobante') return json(uploadComprobante(ss, payload));
    if (payload.action === 'deletePago')         return json(deletePago(ss, payload.id));
    if (payload.action === 'deleteGuest')       return json(deleteGuest(ss, payload.id));
    if (payload.action === 'addGuest')          return json(addGuest(ss, payload.data));
    return json({ error: 'Accion no reconocida' });
  } catch (err) {
    return json({ error: err.message });
  }
}

// ── INVITADOS ─────────────────────────────────────────────────
// Pestaña "Invitados - Lista"
// Col A = ID (numérico) | Col B = Nombre | Col C = Apellido | Col D = Invitación
// Invitación: "Riedel Palma" | "Anto" | "Chico" | "Solís" | "Soto"
function getGuests(ss, bust) {
  const cache = CacheService.getScriptCache();
  const ckey  = 'guests_v3';
  if (!bust) {
    const hit = cache.get(ckey);
    if (hit) return JSON.parse(hit);
  }

  const sh = ss.getSheetByName('Invitados - Lista');
  if (!sh) return { error: 'Pestana "Invitados - Lista" no encontrada' };

  const rows   = sh.getDataRange().getValues();
  const result = { riedel: [], chico: [], solis: [] };

  for (let i = 1; i < rows.length; i++) {
    const r          = rows[i];
    const rowId      = r[0];
    const nombre     = String(r[1] || '').trim();
    const apellido   = String(r[2] || '').trim();
    const invitacion = String(r[3] || '').trim();
    const tipo       = String(r[4] || '').trim();
    if (!nombre && !apellido) continue;

    const nombreCompleto = [nombre, apellido].filter(Boolean).join(' ');
    const entry = { id: rowId, n: nombreCompleto, g: '', tipo };

    const inv = invitacion.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');

    if (inv === 'riedel palma' || inv === 'riedel') {
      result.riedel.push(entry);
    } else if (inv === 'anto') {
      result.riedel.push({ id: rowId, n: nombreCompleto, g: 'Anto', tipo });
    } else if (inv === 'chico') {
      result.chico.push(entry);
    } else if (inv === 'solis') {
      result.solis.push({ id: rowId, n: nombreCompleto, g: 'Solís', tipo });
    } else if (inv === 'soto') {
      result.solis.push({ id: rowId, n: nombreCompleto, g: 'Soto', tipo });
    }
  }

  try { cache.put(ckey, JSON.stringify(result), CACHE_TTL); } catch(e) {}
  return result;
}

// ── PAGOS ─────────────────────────────────────────────────────
// Lee desde pestaña "Pagos" (única fuente de verdad)
function getPagos(ss, bust) {
  const cache = CacheService.getScriptCache();
  const ckey  = 'pagos_v2';
  if (!bust) {
    const hit = cache.get(ckey);
    if (hit) return JSON.parse(hit);
  }

  const result = [];
  const sh = ss.getSheetByName('Pagos');
  if (sh && sh.getLastRow() > 1) {
    const rows = sh.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r[0]) continue;
      let fecha = '';
      if (r[1]) {
        try { fecha = Utilities.formatDate(new Date(r[1]), 'America/Santiago', 'dd/MM/yyyy'); } catch(e) {}
      }
      result.push({
        id:          String(r[0]),
        fecha,
        familia:     String(r[2] || '').trim(),
        concepto:    String(r[3] || '').trim(),
        monto:       Number(r[4]) || 0,
        comprobante: String(r[5] || '').trim(),
      });
    }
  }

  try { cache.put(ckey, JSON.stringify(result), CACHE_TTL); } catch(e) {}
  return result;
}

// ── ELIMINAR PAGO ─────────────────────────────────────────────
function deletePago(ss, id) {
  const sh = ss.getSheetByName('Pagos');
  if (!sh) return { error: 'Hoja Pagos no encontrada' };
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sh.deleteRow(i + 1);
      try { CacheService.getScriptCache().remove('pagos_v2'); } catch(e) {}
      return { ok: true };
    }
  }
  return { error: 'Pago no encontrado (ID: ' + id + ')' };
}

// ── GASTOS ────────────────────────────────────────────────────
function getGastos(ss) {
  const sh = ss.getSheetByName('Gastos');
  if (!sh) return { error: 'Pestana Gastos no encontrada' };
  const rows = sh.getDataRange().getValues();
  const items = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    items.push({ item:r[0], rn:r[1]||0, cn:r[2]||0, sn:r[3]||0,
                 rb:r[4]||0, cb:r[5]||0, sb:r[6]||0, pr:r[7]||0, pc:r[8]||0, ps:r[9]||0 });
  }
  const totals = items.reduce((acc, x) => {
    acc.rn+=x.rn; acc.rb+=x.rb; acc.cn+=x.cn; acc.cb+=x.cb; acc.sn+=x.sn; acc.sb+=x.sb;
    acc.tn+=x.rn+x.cn+x.sn; acc.tb+=x.rb+x.cb+x.sb;
    acc.pr+=x.pr; acc.pc+=x.pc; acc.ps+=x.ps; acc.pt+=x.pr+x.pc+x.ps;
    return acc;
  }, { rn:0,rb:0,cn:0,cb:0,sn:0,sb:0,tn:0,tb:0,pr:0,pc:0,ps:0,pt:0 });
  return { items, totals };
}

// ── BANQUETERA (calculada desde invitados) ────────────────────
// Col J (índice 9) = "Magdalena Vial IVA inc" — precio ya con IVA 9,5%
// Mapeo: Riedel Palma / Anto → r  |  Chico → c  |  Solís / Soto → s
function getBanquetera(ss) {
  const cache = CacheService.getScriptCache();
  const ckey  = 'banquetera_v1';
  const hit   = cache.get(ckey);
  if (hit) return JSON.parse(hit);

  const sh = ss.getSheetByName('Invitados - Lista');
  if (!sh) return { error: 'Hoja "Invitados - Lista" no encontrada' };

  const rows = sh.getDataRange().getValues();
  const sums = { r: 0, c: 0, s: 0 };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const nombre   = String(row[1] || '').trim();
    const apellido = String(row[2] || '').trim();
    if (!nombre && !apellido) continue;

    const inv = String(row[3] || '').trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
    const precio = Number(row[9]) || 0; // Col J

    if (inv === 'riedel palma' || inv === 'riedel' || inv === 'anto') {
      sums.r += precio;
    } else if (inv === 'chico') {
      sums.c += precio;
    } else if (inv === 'solis' || inv === 'soto') {
      sums.s += precio;
    }
  }

  // Precio col J ya incluye IVA 9,5% → es bruto; neto = bruto / 1.095
  const result = {
    rb: Math.round(sums.r),
    cb: Math.round(sums.c),
    sb: Math.round(sums.s),
    rn: Math.round(sums.r / 1.095),
    cn: Math.round(sums.c / 1.095),
    sn: Math.round(sums.s / 1.095),
  };
  result.tb = result.rb + result.cb + result.sb;
  result.tn = result.rn + result.cn + result.sn;

  try { cache.put(ckey, JSON.stringify(result), CACHE_TTL); } catch(e) {}
  return result;
}

// ── AGREGAR PAGO ──────────────────────────────────────────────
function addPago(ss, data) {
  const sh = getOrCreatePagosSheet(ss);
  const id = 'P' + new Date().getTime();
  sh.appendRow([ id, new Date(), data.familia||'', data.concepto||'', data.monto||0, '' ]);
  try { CacheService.getScriptCache().remove('pagos_v2'); } catch(e) {}
  return { ok: true, id };
}

// ── SUBIR COMPROBANTE ─────────────────────────────────────────
function uploadComprobante(ss, payload) {
  const folder = getOrCreateFolder();
  const blob   = Utilities.newBlob(
    Utilities.base64Decode(payload.fileData),
    payload.mimeType,
    payload.fileName
  );
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const url = file.getUrl();

  let allUrls = url;
  if (payload.pagoId) {
    const id = String(payload.pagoId);
    if (id.startsWith('G')) {
      // ID corresponde a una fila de la pestaña "Gastos" (índice en el array de rows)
      const rowIdx = parseInt(id.slice(1));
      const sh = ss.getSheetByName('Gastos');
      if (sh) {
        const cell     = sh.getRange(rowIdx + 1, 6);
        const existing = String(cell.getValue() || '').trim();
        allUrls = existing ? existing + ',' + url : url;
        cell.setValue(allUrls);
      }
      try { CacheService.getScriptCache().remove('pagos_v2'); } catch(e) {}
    } else {
      // ID de pestaña "Pagos" (P + timestamp)
      const sh   = getOrCreatePagosSheet(ss);
      const data = sh.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
          const existing = String(data[i][5] || '').trim();
          allUrls = existing ? existing + ',' + url : url;
          sh.getRange(i+1, 6).setValue(allUrls);
          break;
        }
      }
      try { CacheService.getScriptCache().remove('pagos_v2'); } catch(e) {}
    }
  }
  return { ok: true, url, allUrls };
}

// ── HELPERS ───────────────────────────────────────────────────
function getOrCreatePagosSheet(ss) {
  let sh = ss.getSheetByName('Pagos');
  if (!sh) {
    sh = ss.insertSheet('Pagos');
    sh.appendRow(['ID','Fecha','Familia','Concepto','Monto','Comprobante_URL']);
    sh.setFrozenRows(1);
    sh.getRange('A1:F1').setFontWeight('bold');
    sh.setColumnWidth(1,120); sh.setColumnWidth(2,100); sh.setColumnWidth(3,100);
    sh.setColumnWidth(4,200); sh.setColumnWidth(5,100); sh.setColumnWidth(6,300);
  }
  return sh;
}

function getOrCreateFolder() {
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);
}

// ── AGREGAR INVITADO ──────────────────────────────────────────
function addGuest(ss, data) {
  const sh = ss.getSheetByName('Invitados - Lista');
  if (!sh) return { error: 'Hoja "Invitados - Lista" no encontrada' };
  const rows = sh.getDataRange().getValues();
  let maxId = 0;
  for (let i = 1; i < rows.length; i++) {
    const id = Number(rows[i][0]);
    if (!isNaN(id) && id > maxId) maxId = id;
  }
  const newId = maxId + 1;
  sh.appendRow([newId, data.nombre || '', data.apellido || '', data.invitacion || '', data.tipo || '']);
  try { CacheService.getScriptCache().remove('guests_v3'); } catch(e) {}
  try { CacheService.getScriptCache().remove('banquetera_v1'); } catch(e) {}
  return { ok: true, id: newId };
}

// ── ELIMINAR INVITADO ─────────────────────────────────────────
function deleteGuest(ss, id) {
  const sh = ss.getSheetByName('Invitados - Lista');
  if (!sh) return { error: 'Hoja no encontrada' };
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sh.deleteRow(i + 1);
      try { CacheService.getScriptCache().remove('guests_v3'); } catch(e) {}
      return { ok: true };
    }
  }
  return { error: 'Invitado no encontrado (ID: ' + id + ')' };
}
