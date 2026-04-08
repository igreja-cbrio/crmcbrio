/**
 * Export utilities for CRM CBRio
 * CSV and PDF export from table data
 */

/**
 * Export data as CSV file
 * @param {string[]} headers - Column headers
 * @param {any[][]} rows - Array of row arrays
 * @param {string} filename - File name without extension
 */
export function exportCSV(headers, rows, filename = 'export') {
  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}_${dateStr()}.csv`);
}

/**
 * Export data as PDF-like printable HTML
 * Opens a print dialog with formatted table
 * @param {string} title - Report title
 * @param {string[]} headers - Column headers
 * @param {any[][]} rows - Array of row arrays
 * @param {object} options - { subtitle, footer }
 */
export function exportPDF(title, headers, rows, options = {}) {
  const { subtitle, footer } = options;
  const now = new Date().toLocaleString('pt-BR');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px; color: #1a1a1a; font-size: 12px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #00B39D; padding-bottom: 16px; }
    .header h1 { font-size: 18px; font-weight: 700; color: #00B39D; }
    .header .subtitle { font-size: 12px; color: #666; margin-top: 4px; }
    .header .meta { text-align: right; font-size: 11px; color: #999; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { padding: 8px 12px; font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; border-bottom: 2px solid #e5e5e5; background: #fafafa; }
    td { padding: 8px 12px; font-size: 11px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) { background: #f9f9f9; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee; font-size: 10px; color: #999; display: flex; justify-content: space-between; }
    .total { margin-top: 12px; font-size: 12px; font-weight: 600; text-align: right; color: #333; }
    @media print {
      body { padding: 16px; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>CBRio ERP — ${title}</h1>
      ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
    </div>
    <div class="meta">
      Gerado em: ${now}<br/>
      Total: ${rows.length} registro(s)
    </div>
  </div>
  <table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
  <div class="total">${rows.length} registro(s)</div>
  <div class="footer">
    <span>${footer || 'CBRio ERP'}</span>
    <span>${now}</span>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function dateStr() {
  return new Date().toISOString().slice(0, 10);
}
