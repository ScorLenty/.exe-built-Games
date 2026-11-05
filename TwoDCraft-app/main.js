const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { startServer } = require('./server');
let hub = null;

// Сохранения: Документы\TwoDCraft\saves\world.json
const saveDir = () => path.join(app.getPath('documents'), 'TwoDCraft', 'saves');
const saveFile = () => path.join(saveDir(), 'world.json');
const backupFile = () => path.join(saveDir(), 'world.backup.json');

const modFile = () => path.join(app.getPath('documents'), 'TwoDCraft', 'mods', 'mod.json');
ipcMain.on('save-info', (e) => { e.returnValue = { file: saveFile(), mod: modFile() }; });

ipcMain.on('mod-read', (e) => {
  try {
    e.returnValue = fs.existsSync(modFile()) ? fs.readFileSync(modFile(), 'utf8') : null;
  } catch (err) {
    e.returnValue = null;
  }
});

ipcMain.on('mod-write', (e, data) => {
  try {
    fs.mkdirSync(path.dirname(modFile()), { recursive: true });
    fs.writeFileSync(modFile(), data);
    e.returnValue = { ok: true };
  } catch (err) {
    e.returnValue = { ok: false, err: String(err) };
  }
});

ipcMain.on('save-read', (e) => {
  try {
    e.returnValue = fs.existsSync(saveFile()) ? fs.readFileSync(saveFile(), 'utf8') : null;
  } catch (err) {
    e.returnValue = null;
  }
});

ipcMain.on('save-write', (e, data) => {
  try {
    fs.mkdirSync(saveDir(), { recursive: true });
    const f = saveFile(), b = backupFile(), tmp = f + '.tmp';
    // резервная копия предыдущего сохранения, не чаще раза в 10 минут
    if (fs.existsSync(f) && (!fs.existsSync(b) || Date.now() - fs.statSync(b).mtimeMs > 600000)) {
      fs.copyFileSync(f, b);
    }
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, f);
    e.returnValue = { ok: true };
  } catch (err) {
    e.returnValue = { ok: false, err: String(err) };
  }
});

ipcMain.on('save-del', (e) => {
  try { fs.rmSync(saveFile(), { force: true }); } catch (err) {}
  e.returnValue = true;
});

ipcMain.handle('host-start', async (e, opts) => {
  try {
    if (hub) hub.stop();
    hub = await startServer({ port: opts.port || 7777, max: opts.max || 5, world: opts.world });
    return { ok: true, port: hub.port, ips: hub.ips };
  } catch (err) {
    hub = null;
    return { ok: false, err: String((err && err.message) || err) };
  }
});
ipcMain.handle('host-stop', () => { if (hub) { hub.stop(); hub = null; } return true; });
app.on('before-quit', () => { if (hub) hub.stop(); });

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 520,
    title: 'TwoDCraft',
    backgroundColor: '#87ceeb',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile('index.html');
  // F11 - полноэкранный режим
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
