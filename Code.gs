/*************************************************************
 * TASTE TEST - Google Apps Script backend
 *
 * Deploy the web app ONCE (see SETUP_GUIDE.md). After that you
 * NEVER edit the Sheet by hand and NEVER redeploy — the host
 * creates and runs every taste test from the website.
 *
 * The Sheet is just storage:
 *   Setup        - the current session's config (managed by the app)
 *   Submissions  - the current session's live responses
 *   History      - one summary row per finished session (auto, dated)
 *   Archive      - every finished session's raw per-person rows (auto, dated)
 *
 * Session states (Setup!B2):  idle -> open -> closed -> (saved) -> idle
 *************************************************************/

const SETUP_SHEET = 'Setup';
const SUB_SHEET   = 'Submissions';
const HIST_SHEET  = 'History';
const ARCH_SHEET  = 'Archive';
const DEFAULT_PW  = '1234';

/* ---------- Menu (one-time / recovery only) ---------- */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Taste Test')
    .addItem('First-time setup: Create tabs', 'createTemplate_')
    .addItem('Set / reset Host Password', 'setHostPasswordMenu_')
    .addToUi();
}

function createTemplate_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SETUP_SHEET) || ss.insertSheet(SETUP_SHEET);
  sh.clear();
  writeSetupSkeleton_(sh);
  sh.getRange('B1').setValue('');
  sh.getRange('B2').setValue('idle');
  sh.getRange('B4').setValue(0);

  const sub = ss.getSheetByName(SUB_SHEET) || ss.insertSheet(SUB_SHEET);
  sub.clear(); ensureSubHeaders_(sub);
  ensureHistory_(); ensureArchive_();
  getAdminPw_(); // seeds default password if unset

  SpreadsheetApp.getUi().alert('Tabs ready. Now deploy the web app once (SETUP_GUIDE.md). ' +
    'The default host password is "' + DEFAULT_PW + '" — change it from the website or the Taste Test menu.');
}

function writeSetupSkeleton_(sh) {
  sh.getRange('A1').setValue('Event Name');
  sh.getRange('A2').setValue('Status (idle/open/closed)');
  sh.getRange('A3').setValue('(managed by the app)');
  sh.getRange('A4').setValue('Expected Participants');
  sh.getRange('A6').setValue('Item Name'); sh.getRange('B6').setValue('Sample Letter');
  sh.getRange('A1:A6').setFontWeight('bold');
  sh.getRange('A6:B6').setBackground('#ffe0b2').setFontWeight('bold');
  sh.setColumnWidth(1, 220); sh.setColumnWidth(2, 150);
  sh.getRange('D1').setValue('This tab is managed by the Taste Test website — you don\'t need to edit it by hand.');
  sh.getRange('D1').setFontWeight('bold');
}

function setHostPasswordMenu_() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Set Host Password', 'Enter a new host password (min 3 chars):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const pw = r.getResponseText().trim();
  if (pw.length < 3) { ui.alert('Too short.'); return; }
  PropertiesService.getScriptProperties().setProperty('ADMIN_PW', pw);
  ui.alert('Host password updated.');
}

/* ---------- Web endpoints ---------- */

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || 'config';

  // config is the boot call for every visitor — cache it so bursts are cheap
  if (action === 'config') {
    const cache = CacheService.getScriptCache();
    const hit = cache.get('cfg');
    if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
    const setup = getSetup_();
    const idle = setup.status === 'idle';
    const s = JSON.stringify({
      ok: true, eventName: setup.eventName, status: setup.status,
      sampleCount: idle ? 0 : setup.items.length,
      items: idle ? [] : setup.items.map(function (i) { return i.name; }),
      expected: setup.expected, submitted: countSubs_()
    });
    cache.put('cfg', s, 8); // seconds
    return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
  }

  const setup = getSetup_();
  if (action === 'status') {
    const key = (e.parameter.key || '');
    const isHost = key === getAdminPw_();
    return json_({ ok: true, status: setup.status, eventName: setup.eventName,
      submitted: countSubs_(), expected: setup.expected, isHost: isHost,
      submittedNames: submittedNames_() });
  }
  if (action === 'results') {
    const key = (e.parameter.key || '');
    if (setup.status !== 'closed' && key !== getAdminPw_()) return json_({ ok: false, error: 'locked' });
    return json_(buildResults_(setup));
  }
  return json_({ ok: false, error: 'unknown action' });
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad json' }); }
  const action = body.action;
  const setup = getSetup_();

  if (action === 'submit') {
    if (setup.status !== 'open') return json_({ ok: false, error: 'closed' });
    return json_(saveSubmission_(body, setup));
  }

  // ---- host-only actions ----
  const isHost = String(body.key) === getAdminPw_();
  if (['close', 'reopen', 'newsession', 'createSession', 'setPassword'].indexOf(action) !== -1 && !isHost) {
    return json_({ ok: false, error: 'bad passcode' });
  }

  if (action === 'close')  { setStatus_('closed'); clearConfigCache_(); return json_({ ok: true, status: 'closed' }); }
  if (action === 'reopen') { setStatus_('open');   clearConfigCache_(); return json_({ ok: true, status: 'open' }); }

  if (action === 'newsession') {           // "Save & start new" — archive then free the board
    archiveCurrent_();
    clearSubs_();
    setStatus_('idle');
    clearConfigCache_();
    return json_({ ok: true, status: 'idle' });
  }

  if (action === 'createSession') {
    return json_(createSession_(body));
  }

  if (action === 'setPassword') {
    const np = String(body.newPw || '').trim();
    if (np.length < 3) return json_({ ok: false, error: 'too short' });
    PropertiesService.getScriptProperties().setProperty('ADMIN_PW', np);
    return json_({ ok: true });
  }

  return json_({ ok: false, error: 'unknown action' });
}

/* ---------- Session creation ---------- */

function createSession_(body) {
  const items = (body.items || [])
    .map(function (it) { return { name: String(it.name || '').trim(), correct: norm_(it.letter) }; })
    .filter(function (it) { return it.name; });

  const issues = validateItems_(items);
  if (!String(body.eventName || '').trim()) issues.unshift('Event name is required.');
  if (issues.length) return { ok: false, error: 'invalid', issues: issues };

  archiveCurrent_(); // safety: never overwrite an un-archived session that has data

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SETUP_SHEET) || ss.insertSheet(SETUP_SHEET);
  writeSetupSkeleton_(sh);
  sh.getRange('B1').setValue(String(body.eventName).trim());
  sh.getRange('B2').setValue('open');
  sh.getRange('B4').setValue(Number(body.expected || 0));

  const last = sh.getLastRow();
  if (last >= 7) sh.getRange(7, 1, last - 6, 2).clearContent();
  sh.getRange(7, 1, items.length, 2).setValues(items.map(function (it) { return [it.name, it.correct]; }));

  PropertiesService.getScriptProperties().setProperty('currentSessionId', String(Date.now()));
  clearSubs_();
  clearConfigCache_();
  return { ok: true };
}

function validateItems_(items) {
  const issues = [];
  const n = items.length;
  if (n < 2) issues.push('Add at least 2 items.');
  const expected = [];
  for (let i = 0; i < n; i++) expected.push(String.fromCharCode(65 + i));
  const last = n ? expected[n - 1] : '-';
  const seen = {};
  items.forEach(function (it) {
    if (!it.correct) { issues.push('"' + it.name + '" is missing its letter.'); return; }
    if (!/^[A-Z]$/.test(it.correct)) issues.push('"' + it.name + '" has "' + it.correct + '" — use a single letter A–' + last + '.');
    if (seen[it.correct]) issues.push('Letter ' + it.correct + ' is used more than once.');
    seen[it.correct] = true;
  });
  expected.forEach(function (L) { if (!seen[L]) issues.push('No item uses letter ' + L + ' (use A through ' + last + ', no gaps).'); });
  Object.keys(seen).forEach(function (L) { if (expected.indexOf(L) === -1) issues.push('Letter ' + L + ' is out of range (use A through ' + last + ').'); });
  return issues;
}

/* ---------- Archiving (never loses data) ---------- */

function archiveCurrent_() {
  const props = PropertiesService.getScriptProperties();
  const cur = props.getProperty('currentSessionId') || '';
  const lastArch = props.getProperty('lastArchivedId') || '';
  const subs = readSubs_();
  if (!subs.length) return false;
  if (cur && cur === lastArch) return false; // this session already archived

  const setup = getSetup_();
  const res = buildResults_(setup);
  const now = new Date();

  const hist = ensureHistory_();
  const top = res.leaderboard[0] || { name: '—', score: 0 };
  const fav = res.groupRanking[0] || { item: '—', sample: '—' };
  const grText = res.groupRanking.map(function (r, i) { return (i + 1) + '. ' + r.item + ' (' + r.sample + ') avg ' + r.avgRank; }).join('  |  ');
  const akText = res.answerKey.map(function (a) { return a.sample + '=' + a.item; }).join(', ');
  const lbText = res.leaderboard.map(function (l) { return l.name + ' (' + l.score + ')'; }).join(', ');
  hist.appendRow([now, setup.eventName, res.totalParticipants, top.name + ' (' + top.score + ')',
                  fav.item + ' (' + fav.sample + ')', grText, lbText, akText, JSON.stringify(res)]);

  const arch = ensureArchive_();
  subs.forEach(function (s) {
    arch.appendRow([now, setup.eventName, s.name, s.score, JSON.stringify(s.matches), JSON.stringify(s.ranking)]);
  });

  if (cur) props.setProperty('lastArchivedId', cur);
  return true;
}

/* ---------- Core logic ---------- */

function norm_(v) { return String(v == null ? '' : v).trim().toUpperCase(); }
function scoreOf_(matches, items) { let s = 0; items.forEach(function (it) { if (norm_(matches[it.name]) === it.correct) s++; }); return s; }

function getAdminPw_() {
  const p = PropertiesService.getScriptProperties();
  let pw = p.getProperty('ADMIN_PW');
  if (!pw) { pw = DEFAULT_PW; p.setProperty('ADMIN_PW', pw); }
  return pw;
}

function getSetup_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SETUP_SHEET);
  if (!sh) return { eventName: '', status: 'idle', expected: 0, items: [] };
  // Read the whole config block (A1:B<last>) in ONE round-trip instead of several.
  const last = Math.max(sh.getLastRow(), 6);
  const vals = sh.getRange(1, 1, last, 2).getValues();
  const eventName = String(vals[0][1] || '');            // B1
  const status = String(vals[1][1] || 'idle').toLowerCase().trim(); // B2
  const expected = Number(vals[3][1] || 0);              // B4
  const items = [];
  for (let i = 6; i < vals.length; i++) {                // row 7 onward
    if (vals[i][0] === '' || vals[i][0] === null) continue;
    items.push({ name: String(vals[i][0]).trim(), correct: norm_(vals[i][1]) });
  }
  return { eventName: eventName, status: status, expected: expected, items: items };
}

function saveSubmission_(body, setup) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SUB_SHEET) || ss.insertSheet(SUB_SHEET);
  ensureSubHeaders_(sh);
  const name = String(body.name || '').trim();
  if (!name) return { ok: false, error: 'no name' };
  const matches = body.matches || {};
  const ranking = (body.ranking || []).map(norm_);
  const score = scoreOf_(matches, setup.items);
  const row = [new Date(), name, String(body.device || ''), JSON.stringify(matches), JSON.stringify(ranking), score];
  const data = sh.getDataRange().getValues();
  let foundRow = -1;
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][1]).trim().toLowerCase() === name.toLowerCase()) { foundRow = r + 1; break; }
  }
  if (foundRow > 0) sh.getRange(foundRow, 1, 1, row.length).setValues([row]);
  else sh.appendRow(row);
  return { ok: true, replaced: foundRow > 0 };
}

function buildResults_(setup) {
  const subs = readSubs_();
  const items = setup.items;
  const n = items.length;
  subs.forEach(function (s) { s.score = scoreOf_(s.matches, items); });

  const leaderboard = subs.map(function (s) { return { name: s.name, score: s.score }; })
    .sort(function (a, b) { return b.score - a.score || a.name.localeCompare(b.name); });

  const agg = {};
  items.forEach(function (it) { agg[it.correct] = { points: 0, rankSum: 0, count: 0 }; });
  subs.forEach(function (s) {
    (s.ranking || []).forEach(function (letter, idx) {
      const L = norm_(letter);
      if (!agg[L]) agg[L] = { points: 0, rankSum: 0, count: 0 };
      agg[L].points += (n - idx); agg[L].rankSum += (idx + 1); agg[L].count += 1;
    });
  });

  const matchAcc = {};
  items.forEach(function (it) { matchAcc[it.name] = 0; });
  subs.forEach(function (s) { items.forEach(function (it) { if (norm_(s.matches[it.name]) === it.correct) matchAcc[it.name]++; }); });

  const perItem = items.map(function (it) {
    const a = agg[it.correct] || { points: 0, rankSum: 0, count: 0 };
    return { item: it.name, sample: it.correct, points: a.points,
      avgRank: a.count ? Math.round((a.rankSum / a.count) * 100) / 100 : null,
      matchedCorrectly: matchAcc[it.name], matchPct: subs.length ? Math.round(100 * matchAcc[it.name] / subs.length) : 0 };
  });
  const groupRanking = perItem.slice().sort(function (a, b) { return b.points - a.points || (a.avgRank || 99) - (b.avgRank || 99); });

  return {
    ok: true, eventName: setup.eventName, status: setup.status,
    totalParticipants: subs.length, expected: setup.expected,
    leaderboard: leaderboard, groupRanking: groupRanking, perItem: perItem,
    answerKey: items.map(function (it) { return { item: it.name, sample: it.correct }; }),
    submissions: subs.map(function (s) { return { name: s.name, score: s.score, matches: s.matches, ranking: s.ranking }; })
  };
}

/* ---------- Sheet helpers ---------- */

function ensureSubHeaders_(sh) {
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Timestamp', 'Name', 'Device', 'Matches (JSON)', 'Ranking (JSON)', 'Match Score']);
    sh.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#ffe0b2'); sh.setFrozenRows(1);
  }
}
function ensureHistory_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(HIST_SHEET) || ss.insertSheet(HIST_SHEET);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Date', 'Event', 'Participants', 'Top Matcher', 'Crowd Favorite', 'Group Ranking', 'All Scores', 'Answer Key', 'Full Data (JSON)']);
    sh.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#ffe0b2'); sh.setFrozenRows(1);
    sh.setColumnWidth(6, 320); sh.setColumnWidth(8, 240);
  }
  return sh;
}
function ensureArchive_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ARCH_SHEET) || ss.insertSheet(ARCH_SHEET);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Date', 'Event', 'Name', 'Match Score', 'Matches (JSON)', 'Ranking (JSON)']);
    sh.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#ffe0b2'); sh.setFrozenRows(1);
  }
  return sh;
}
function readSubs_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SUB_SHEET);
  if (!sh) return [];
  const data = sh.getDataRange().getValues();
  const out = [];
  for (let r = 1; r < data.length; r++) {
    if (!data[r][1]) continue;
    let matches = {}, ranking = [];
    try { matches = JSON.parse(data[r][3] || '{}'); } catch (e) {}
    try { ranking = JSON.parse(data[r][4] || '[]'); } catch (e) {}
    out.push({ name: String(data[r][1]), matches: matches, ranking: ranking, score: Number(data[r][5] || 0) });
  }
  return out;
}
function countSubs_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SUB_SHEET);
  if (!sh) return 0;
  return Math.max(0, sh.getLastRow() - 1);
}
function submittedNames_() { return readSubs_().map(function (s) { return s.name; }); }
function clearSubs_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SUB_SHEET);
  if (!sh) return;
  sh.clear(); ensureSubHeaders_(sh);
}
function setStatus_(status) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SETUP_SHEET);
  if (sh) sh.getRange('B2').setValue(status);
}
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function clearConfigCache_() { try { CacheService.getScriptCache().remove('cfg'); } catch (e) {} }
