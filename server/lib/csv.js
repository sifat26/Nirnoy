function escapeField(v) {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Build a CSV string from a header array and array-of-arrays rows. */
export function toCsv(headers, rows) {
  const head = headers.map(escapeField).join(',');
  const body = rows.map((r) => r.map(escapeField).join(',')).join('\r\n');
  return rows.length ? `${head}\r\n${body}` : head;
}
