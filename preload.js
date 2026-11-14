// The small, fixed set of desktop abilities Breakwater's page may use (window.bwDesktop).
const { contextBridge, ipcRenderer } = require('electron');
const sep = process.platform === 'win32' ? '\\' : '/';
contextBridge.exposeInMainWorld('bwDesktop', {
  sep,
  version: () => ipcRenderer.invoke('version'),
  platform: () => ipcRenderer.invoke('platform'),
  micAccess: () => ipcRenderer.invoke('mic-access'),
  openDialog: o => ipcRenderer.invoke('open-dialog', o),
  saveDialog: o => ipcRenderer.invoke('save-dialog', o),
  readFile: p => ipcRenderer.invoke('read-file', p),
  writeFile: (p, bytes) => ipcRenderer.invoke('write-file', p, bytes),
  stat: p => ipcRenderer.invoke('stat', p),
  listAudio: (roots, depth, cap) => ipcRenderer.invoke('list-audio', roots, depth, cap),
  prefs: () => ipcRenderer.invoke('prefs-get'),
  setPref: (k, v) => ipcRenderer.invoke('prefs-set', k, v),
  addRecent: p => ipcRenderer.invoke('recent-add', p),
  reveal: p => ipcRenderer.invoke('reveal', p),
  askSave: name => ipcRenderer.invoke('ask-save', name),
  setEdited: v => ipcRenderer.send('set-edited', v),
  closeOk: () => ipcRenderer.send('close-ok'),
  onOpenPath: fn => ipcRenderer.on('open-path', (e, p) => fn(p)),
  onCloseRequest: fn => ipcRenderer.on('close-request', () => fn()),
});
