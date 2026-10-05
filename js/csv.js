// CSV reading and writing.

// Splits text into rows of trimmed cells. Commas inside double quotes are kept;
// the quote characters themselves are dropped. Rows with no content are skipped.
function parseCSV(text) {
  return text.trim().split(/\r?\n/).map(line => {
    const cells = [];
    let cell = '', inQuotes = false;
    for (const c of line) {
      if (c === '"') inQuotes = !inQuotes;
      else if (c === ',' && !inQuotes) { cells.push(cell.trim()); cell = ''; }
      else cell += c;
    }
    cells.push(cell.trim());
    return cells;
  }).filter(cells => cells.some(c => c));
}

// Turns rows of values into CSV text, quoting every cell.
function toCSV(rows) {
  return rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}
