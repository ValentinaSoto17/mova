const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// La API devuelve 'YYYY-MM-DD' o 'YYYY-MM-DD HH:mm:ss' (hora de la base)
export function parseDate(s) {
  if (!s) return null;
  const [d, t = '00:00:00'] = String(s).split(' ');
  const [y, m, day] = d.split('-').map(Number);
  const [hh, mm] = t.split(':').map(Number);
  return new Date(y, m - 1, day, hh || 0, mm || 0);
}

export const fDate = (s) => {
  const d = parseDate(s);
  return d ? `${d.getDate()} ${MESES[d.getMonth()]}` : '—';
};
export const fDateLong = (s) => {
  const d = parseDate(s);
  return d ? `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}. ${d.getFullYear()}` : '—';
};
export const fTime = (s) => {
  const d = parseDate(s);
  return d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
};
export const fDay = (s) => DIAS[parseDate(s)?.getDay() ?? 0];

export function fRelative(s) {
  const d = parseDate(s);
  if (!d) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'recién';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `hace ${Math.floor(diff / 86400)} d`;
  return fDate(s);
}

export const fDuration = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return isoDate(d);
};

export const fullName = (u) => (u ? `${u.nombre} ${u.apellido}` : '');

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buen día';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
};

// Clasificación orientativa de la presión arterial (adultos)
export function bpStatus(sis, dia) {
  if (!sis || !dia) return null;
  if (sis >= 140 || dia >= 90) return { label: 'Alta', kind: 'danger' };
  if (sis >= 130 || dia >= 80) return { label: 'Elevada', kind: 'warning' };
  if (sis < 90 || dia < 60) return { label: 'Baja', kind: 'info' };
  return { label: 'Normal', kind: 'success' };
}
