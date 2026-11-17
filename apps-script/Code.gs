/**
 * Trailhead sync: lets the Trailhead app save to and load from this Google Sheet.
 *
 * Setup (once, about 5 minutes; see SETUP.md):
 *   1. In the "Trailhead Data" sheet: Extensions > Apps Script. Replace everything with this file.
 *   2. Change PASSCODE below to a phrase only your leaders know. Save.
 *   3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone. Deploy, allow access.
 *   4. Copy the Web app URL. In Trailhead > Settings > Shared Google Sheet, paste it with the passcode.
 *
 * The app keeps working offline and syncs when it has a signal.
 * The Activities, Youth, Leaders and Attendance tabs are refreshed on every save for reading
 * and printing. Edit in the app, not in those tabs: the app overwrites them.
 */
const PASSCODE = 'CHANGE-ME';

const DATA_TAB = '_data';       // hidden tab holding the full app data as JSON
const CHUNK = 45000;            // Sheets allows 50,000 characters per cell
const VIEW_TABS = ['Activities', 'Youth', 'Leaders', 'Attendance'];

function doGet() {
  return json({ ok: true, app: 'trailhead', message: 'Trailhead sync is running. Connect from the app.' });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: 'bad-request' }); }
  if (PASSCODE === 'CHANGE-ME') return json({ ok: false, error: 'passcode-not-set' });
  if (req.key !== PASSCODE) return json({ ok: false, error: 'wrong-passcode' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const stored = readData();
    if (req.action === 'pull') return json({ ok: true, rev: stored.rev, data: stored.data });
    if (req.action === 'push') {
      if (Number(req.baseRev) !== stored.rev) {
        // Someone else saved first. Send back the latest so the app can merge and retry.
        return json({ ok: false, error: 'conflict', rev: stored.rev, data: stored.data });
      }
      const rev = stored.rev + 1;
      writeData(rev, req.data);
      if (req.tables) writeTables(req.tables);
      return json({ ok: true, rev: rev });
    }
    return json({ ok: false, error: 'unknown-action' });
  } finally {
    lock.releaseLock();
  }
}

function readData() {
  const sh = dataSheet();
  const rev = Number(sh.getRange('B1').getValue()) || 0;
  const last = sh.getLastRow();
  if (last < 1) return { rev: 0, data: null };
  const text = sh.getRange(1, 1, last, 1).getValues().map(function (r) { return r[0]; }).join('');
  return { rev: rev, data: text ? JSON.parse(text) : null };
}

function writeData(rev, data) {
  const sh = dataSheet();
  const text = JSON.stringify(data);
  const rows = [];
  for (let i = 0; i < text.length; i += CHUNK) rows.push([text.slice(i, i + CHUNK)]);
  sh.getRange('A:A').clearContent();
  sh.getRange(1, 1, rows.length, 1).setNumberFormat('@').setValues(rows);
  sh.getRange('B1').setValue(rev);
  sh.getRange('C1').setValue(new Date());
}

function dataSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(DATA_TAB);
  if (!sh) {
    sh = ss.insertSheet(DATA_TAB);
    sh.getRange('B1').setValue(0);
    sh.hideSheet();
  }
  return sh;
}

function writeTables(tables) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  VIEW_TABS.forEach(function (name) {
    const rows = tables[name];
    if (!rows || !rows.length) return;
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    sh.clearContents();
    const width = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    const padded = rows.map(function (r) { const c = r.slice(); while (c.length < width) c.push(''); return c; });
    sh.getRange(1, 1, padded.length, width).setNumberFormat('@').setValues(padded);
    sh.getRange(1, 1, 1, width).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  const blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0) ss.deleteSheet(blank);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Optional: run once from the editor to check the script can reach the sheet. */
function testSetup() {
  dataSheet();
  Logger.log(PASSCODE === 'CHANGE-ME' ? 'Change PASSCODE before deploying.' : 'Looks good. Deploy as a web app.');
}
