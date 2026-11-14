// Breakwater Studio desktop — the same app as the web version, with real files, a sound library and no permission prompts.
const { app, BrowserWindow, ipcMain, dialog, session, shell, Menu, systemPreferences } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

if (process.env.BW_TEST) app.commandLine.appendSwitch('use-fake-device-for-media-stream'); // automated tests only: a pretend microphone
const AUDIO = /\.(wav|mp3|ogg|flac|aif|aiff|m4a)$/i;
const OPENABLE = /\.(bwsong|json|zip|trk|mid|midi|wav|mp3|ogg|flac|aif|aiff|m4a)$/i;
let win = null, pending = [], closing = false, edited = false;

// ---- preferences (recent songs, library folders, window size) live in a small JSON file in the app's own folder
const prefsFile = () => path.join(app.getPath('userData'), 'prefs.json');
let prefs = { recent: [], library: [], bounds: null };
function loadPrefs() { try { prefs = Object.assign(prefs, JSON.parse(fs.readFileSync(prefsFile(), 'utf8'))); } catch (e) {} }
function savePrefs() { try { fs.mkdirSync(path.dirname(prefsFile()), { recursive: true }); fs.writeFileSync(prefsFile(), JSON.stringify(prefs, null, 1)); } catch (e) {} }

// ---- one window; a second launch (double-clicking a song) hands its file to the running app
if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on('second-instance', (e, argv) => { argv.filter(a => OPENABLE.test(a) && fs.existsSync(a)).forEach(openPath); if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('open-file', (e, p) => { e.preventDefault(); openPath(p); }); // macOS: double-clicked or dropped on the Dock icon
function openPath(p) { if (win && win.webContents && !win.webContents.isLoading()) win.webContents.send('open-path', p); else pending.push(p); }

function createWindow() {
  const b = prefs.bounds || { width: 1440, height: 920 };
  win = new BrowserWindow({
    ...b, minWidth: 980, minHeight: 640, show: false, title: 'Breakwater Studio', backgroundColor: '#6f84a1',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required' },
  });
  if (prefs.maximized) win.maximize();
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.on('did-finish-load', () => { const p = pending.splice(0); setTimeout(() => p.forEach(openPath), 400); });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; }); // links open in the normal browser
  win.on('close', e => {
    prefs.maximized = win.isMaximized(); if (!win.isMaximized() && !win.isFullScreen()) prefs.bounds = win.getBounds(); savePrefs();
    if (closing) return; e.preventDefault(); win.webContents.send('close-request'); // the app asks about unsaved changes, then calls back
  });
}

// ---- no permission prompts: the app may use the microphone/line-in and MIDI devices
function grantPermissions() {
  const allowed = new Set(['media', 'midi', 'midiSysex', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'speaker-selection', 'audioCapture', 'fileSystem']);
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb, details) => cb(allowed.has(perm) && !(perm === 'media' && details.mediaTypes && details.mediaTypes.includes('video'))));
  session.defaultSession.setPermissionCheckHandler((wc, perm) => allowed.has(perm));
  if (session.defaultSession.setDevicePermissionHandler) session.defaultSession.setDevicePermissionHandler(() => true);
}

// ---- menus: on the Mac the system menu bar needs the app and Edit menus (copy/paste in text boxes); Breakwater's own menus stay in the window
function buildMenu() {
  if (process.platform !== 'darwin') { Menu.setApplicationMenu(null); return; }
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { label: 'Edit', submenu: [{ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'togglefullscreen' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] },
    { role: 'windowMenu' },
  ]));
}

// ---- file system bridge (only what the app needs)
ipcMain.handle('version', () => app.getVersion());
ipcMain.handle('platform', () => process.platform);
ipcMain.handle('mic-access', async () => { // macOS asks once, the first time ever; everywhere else it's simply allowed
  if (process.platform !== 'darwin') return true;
  const st = systemPreferences.getMediaAccessStatus('microphone'); if (st === 'granted') return true;
  return systemPreferences.askForMediaAccess('microphone');
});
ipcMain.handle('open-dialog', async (e, o = {}) => {
  const props = [o.dirs ? 'openDirectory' : 'openFile']; if (o.multi) props.push('multiSelections'); if (o.dirs) props.push('createDirectory');
  const r = await dialog.showOpenDialog(win, { title: o.title, defaultPath: o.defaultPath, filters: o.filters, properties: props });
  return r.canceled ? null : r.filePaths;
});
ipcMain.handle('save-dialog', async (e, o = {}) => {
  const r = await dialog.showSaveDialog(win, { title: o.title, defaultPath: o.defaultPath || path.join(app.getPath('documents'), o.defaultName || 'Untitled'), filters: o.filters });
  return r.canceled ? null : r.filePath;
});
ipcMain.handle('read-file', async (e, p) => new Uint8Array(await fsp.readFile(p)));
ipcMain.handle('write-file', async (e, p, bytes) => { // write to a temporary file first, so a crash never leaves half a song
  await fsp.mkdir(path.dirname(p), { recursive: true }); const tmp = p + '.bw-tmp'; await fsp.writeFile(tmp, Buffer.from(bytes)); await fsp.rename(tmp, p); return true;
});
ipcMain.handle('stat', async (e, p) => { try { const s = await fsp.stat(p); return { size: s.size, mtime: s.mtimeMs, dir: s.isDirectory() }; } catch (er) { return null; } });
ipcMain.handle('list-audio', async (e, roots, maxDepth = 6, cap = 20000) => { // every sound file under these folders
  const out = [];
  async function walk(dir, rel, d) {
    if (out.length >= cap || d > maxDepth) return; let ents; try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch (er) { return; }
    for (const en of ents) { if (en.name.startsWith('.')) continue; const p = path.join(dir, en.name);
      if (en.isDirectory()) await walk(p, rel ? rel + '/' + en.name : en.name, d + 1); else if (AUDIO.test(en.name)) { out.push({ path: p, name: en.name, sub: rel }); if (out.length >= cap) return; } }
  }
  for (const r of roots) await walk(r, '', 0);
  return out;
});
ipcMain.handle('prefs-get', () => prefs);
ipcMain.handle('prefs-set', (e, k, v) => { prefs[k] = v; savePrefs(); return true; });
ipcMain.handle('recent-add', (e, p) => { prefs.recent = [p, ...prefs.recent.filter(x => x !== p)].slice(0, 12); savePrefs(); if (app.addRecentDocument) app.addRecentDocument(p); return prefs.recent; });
ipcMain.handle('reveal', (e, p) => shell.showItemInFolder(p));
ipcMain.handle('ask-save', async (e, name) => {
  const r = await dialog.showMessageBox(win, { type: 'question', buttons: ['Save', 'Don’t Save', 'Cancel'], defaultId: 0, cancelId: 2, message: `Save changes to “${name}”?`, detail: 'Your changes will be lost if you don’t save them.' });
  return ['save', 'discard', 'cancel'][r.response];
});
ipcMain.on('set-edited', (e, v) => { edited = !!v; if (win && process.platform === 'darwin') win.setDocumentEdited(edited); });
ipcMain.on('close-ok', () => { closing = true; if (win) win.close(); });

app.whenReady().then(() => {
  loadPrefs(); grantPermissions(); buildMenu();
  process.argv.slice(1).filter(a => OPENABLE.test(a) && fs.existsSync(a)).forEach(p => pending.push(p)); // Windows/Linux: opened by double-clicking a file
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => app.quit());
