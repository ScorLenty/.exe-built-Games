const { contextBridge, ipcRenderer } = require('electron');
const info = ipcRenderer.sendSync('save-info');
contextBridge.exposeInMainWorld('twod', {
  path: info.file,
  modPath: info.mod,
  modRead: () => ipcRenderer.sendSync('mod-read'),
  modWrite: (s) => {
    const r = ipcRenderer.sendSync('mod-write', s);
    if (!r.ok) throw new Error(r.err);
  },
  read: () => ipcRenderer.sendSync('save-read'),
  write: (s) => {
    const r = ipcRenderer.sendSync('save-write', s);
    if (!r.ok) throw new Error(r.err);
  },
  del: () => ipcRenderer.sendSync('save-del'),
  hostStart: (o) => ipcRenderer.invoke('host-start', o),
  hostStop: () => ipcRenderer.invoke('host-stop')
});
