// Page wiring: import the two CSVs, run the match, review/edit results, export.

const PREVIEW_ROWS = 200;  // max rows shown in each import preview table
const STATUS_LABELS = { exact: 'Exact', fuzzy: 'Fuzzy', none: 'No Match' };

let dictionary = [];      // [{ sku, title }]
let customerTitles = [];  // [{ idx, title }]
let results = [];         // from matchTitles(), plus an `editing` flag per row

const $ = id => document.getElementById(id);

// Escapes text for safe use inside innerHTML.
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------- Steps 1 & 2: import ----------

// Connects a drop zone and its hidden file input (ids `${prefix}-drop`, `${prefix}-file`, ...).
// `load` turns parsed CSV rows into app data and returns it; `previewRow` renders one item.
function setupImport(prefix, noun, load, previewRow) {
  const zone = $(prefix + '-drop');
  const input = $(prefix + '-file');

  function importFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const items = load(parseCSV(reader.result));
      $(prefix + '-count').textContent = items.length + ' rows';
      $(prefix + '-tbody').innerHTML = items.slice(0, PREVIEW_ROWS).map(previewRow).join('');
      $(prefix + '-status').querySelector('span').textContent = `Loaded ${items.length} ${noun} from "${file.name}"`;
      $(prefix + '-status').hidden = false;
      $(prefix + '-table-wrap').hidden = false;
      $('run-btn').disabled = !(dictionary.length && customerTitles.length);
    };
    reader.readAsText(file);
  }

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    importFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => importFile(input.files[0]));
}

// Dictionary: column 1 is the SKU, column 2 the product title.
setupImport('dict', 'products',
  rows => {
    dictionary = rows.filter(r => r.length >= 2).map(r => ({ sku: r[0], title: r[1] }));
    return dictionary;
  },
  d => `<tr><td class="sku-cell">${esc(d.sku)}</td><td>${esc(d.title)}</td></tr>`
);

// Customer list: column 1 is the title (falls back to the whole row if column 1 is blank).
setupImport('cust', 'titles',
  rows => {
    customerTitles = rows.map((r, i) => ({ idx: i + 1, title: r[0] || r.join(' ') }));
    return customerTitles;
  },
  c => `<tr><td class="sku-cell">${c.idx}</td><td>${esc(c.title)}</td></tr>`
);

// ---------- Step 3: settings & run ----------

$('threshold').addEventListener('input', e => {
  $('threshold-val').textContent = e.target.value;
});

$('run-btn').addEventListener('click', () => {
  results = matchTitles(dictionary, customerTitles, $('algo-select').value, parseInt($('threshold').value));
  renderResults();
  $('results-card').hidden = false;
  $('results-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ---------- Step 4: review & edit ----------

function renderResults() {
  const countStatus = status => results.filter(r => r.status === status).length;
  $('results-count').textContent = results.length + ' matches';
  $('stat-total').textContent = results.length;
  $('stat-exact').textContent = countStatus('exact');
  $('stat-fuzzy').textContent = countStatus('fuzzy');
  $('stat-none').textContent = countStatus('none');
  $('stat-edited').textContent = results.filter(r => r.edited).length;

  $('results-tbody').innerHTML = results.map((r, i) => r.editing ? editRow(r, i) : resultRow(r, i)).join('');
}

function resultRow(r, i) {
  const confClass = r.confidence >= 80 ? '' : r.confidence >= 50 ? 'medium' : 'low';
  return `<tr data-index="${i}">
    <td class="sku-cell">${r.idx}</td>
    <td>${esc(r.customerTitle)}</td>
    <td class="sku-cell">${esc(r.sku)}${r.edited ? '<span class="changed-indicator" title="Manually edited"></span>' : ''}</td>
    <td>${esc(r.title)}</td>
    <td>
      <div class="conf-bar">
        <div class="conf-track"><div class="conf-fill ${confClass}" style="width:${r.confidence}%"></div></div>
        <span>${r.confidence}%</span>
      </div>
    </td>
    <td><span class="match-status ${r.status}">${STATUS_LABELS[r.status]}</span></td>
    <td><button class="edit-btn" data-action="edit">Edit</button></td>
  </tr>`;
}

// Same row, with a dropdown of every dictionary product in place of the match.
function editRow(r, i) {
  const options = dictionary.map(d =>
    `<option value="${esc(d.sku)}" data-title="${esc(d.title)}" ${d.sku === r.sku ? 'selected' : ''}>${esc(d.sku)} — ${esc(d.title.slice(0, 40))}${d.title.length > 40 ? '…' : ''}</option>`
  ).join('');
  return `<tr data-index="${i}">
    <td class="sku-cell">${r.idx}</td>
    <td>${esc(r.customerTitle)}</td>
    <td colspan="2"><div class="inline-edit"><select>${options}</select></div></td>
    <td></td>
    <td></td>
    <td>
      <div class="inline-edit">
        <button class="save-btn" data-action="save">Save</button>
        <button class="cancel-btn" data-action="cancel">Cancel</button>
      </div>
    </td>
  </tr>`;
}

// One listener handles the Edit / Save / Cancel buttons on every row.
$('results-tbody').addEventListener('click', e => {
  const button = e.target.closest('button[data-action]');
  if (!button) return;
  const row = button.closest('tr');
  const result = results[row.dataset.index];
  const action = button.dataset.action;

  if (action === 'save') {
    const option = row.querySelector('select').selectedOptions[0];
    result.sku = option.value;
    result.title = option.dataset.title;
    result.edited = true;
  }
  result.editing = action === 'edit';
  renderResults();
});

// ---------- Export ----------

$('export-btn').addEventListener('click', () => {
  const rows = [['Customer Title', 'Matched SKU', 'Matched Product Title', 'Confidence %', 'Match Type', 'Manually Edited']];
  for (const r of results) {
    rows.push([r.customerTitle, r.sku, r.title, r.confidence, STATUS_LABELS[r.status], r.edited ? 'Yes' : 'No']);
  }

  const url = URL.createObjectURL(new Blob([toCSV(rows)], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sku_matches_' + new Date().toISOString().slice(0, 10) + '.csv';
  link.click();
  URL.revokeObjectURL(url);
});
