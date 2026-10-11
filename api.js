// ============================================================
// api.js — Módulo de comunicación con Google Apps Script
// Reemplaza GAS_URL con la URL del web app desplegado
// ============================================================

const GAS_URL = 'https://script.google.com/macros/s/AKfycbw6SkKsW3iWrvtb8VLtf8li59af36nXxreQeSfKzG5jyUwLbDh0O0u2RmOl1BRFZc3kLg/exec';

// ── Formateo ─────────────────────────────────────────────────
export function fmt(n) {
  if (n == null || isNaN(n)) return '—';
  return Math.round(n).toLocaleString('de-DE');
}

// ── Tema ─────────────────────────────────────────────────────
export function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);

  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  updateThemeIcon(btn);
  btn.addEventListener('click', () => {
    const curr = document.documentElement.getAttribute('data-theme');
    const next = curr === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(btn);
  });
}
function updateThemeIcon(btn) {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.textContent = dark ? '☀️' : '🌙';
}

// ── Nav activo ────────────────────────────────────────────────
export function highlightNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}

// ── GET ───────────────────────────────────────────────────────
export async function apiFetch(action) {
  const res = await fetch(`${GAS_URL}?action=${action}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ── POST ──────────────────────────────────────────────────────
export async function apiPost(payload) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // text/plain evita preflight CORS
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ── Upload comprobante ────────────────────────────────────────
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Toast ─────────────────────────────────────────────────────
export function toast(msg, ok = true) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.background = ok ? '' : '#c0392b';
  el.classList.remove('hide');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hide'), 3500);
}

// ── Loading helpers ───────────────────────────────────────────
export function showLoading(el) {
  el.innerHTML = '<div class="loading"><div class="spinner"></div> Cargando…</div>';
}
export function showError(el, msg) {
  el.innerHTML = `<div class="error-msg">⚠️ ${msg}</div>`;
}

// ── Colores familia ───────────────────────────────────────────
export const FAMILIA = {
  riedel: { label: 'Riedel Palma', cls: 'badge-r', color: 'var(--r-color)' },
  chico:  { label: 'Chico',        cls: 'badge-c', color: 'var(--c-color)' },
  solis:  { label: 'Solís Soto',   cls: 'badge-s', color: 'var(--s-color)' },
};
