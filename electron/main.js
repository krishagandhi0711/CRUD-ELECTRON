import { app, BrowserWindow, ipcMain } from 'electron';
// STEP 1: Import Electron modules
// - app: Controls application lifecycle
// - BrowserWindow: Creates windows
// - ipcMain: Listens for messages from renderer

import path from 'path';
import { fileURLToPath } from 'url';
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Determine if we're in development or production
const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;
// STEP 2: Detect if we're in development or production
// In dev: Vite runs a server (http://localhost:5173)
// In prod: We load static HTML files

const notesFile=path.join(app.getPath("userData"),"notes.json")

// ensure notes.js exists
if(!fs.existsSync(notesFile)){
  fs.writeFileSync(notesFile,JSON.stringify([]));
}

process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

let win = null;

function createWindow() {
  // ✅ CRITICAL FIX: In dev, __dirname is dist-electron, but preload.js is in electron/
  // We need to go back to the project root and then into electron/
  const preloadPath = isDev
    ? path.join(process.env.APP_ROOT, 'electron', 'preload.js')  // Dev: go to source
    : path.join(__dirname, 'preload.js');                        // Prod: use compiled
  // STEP 3: Set correct preload path
  // Dev: Points to source file (electron/preload.js)
  // Prod: Points to compiled file (dist-electron/preload.js)
  
  win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });


  win.webContents.on("did-finish-load",()=>{
    // read saved notes
    let savedNotes=JSON.parse(fs.readFileSync(notesFile));

    // send to renderer
    win.webContents.send("load-notes",savedNotes);
  })
  // when the ui is fully loaded
  // --> "did-finish-load" event fires
  // we read notes.json 
  // send all notes to react using "load-notes"

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

// ✅ IPC Handler - Listen for messages from React
ipcMain.on("save-note",(event,note)=>{
    const notes=JSON.parse(fs.readFileSync(notesFile));
    notes.push(note);
    fs.writeFileSync(notesFile,JSON.stringify(notes));

    // send updated notes back to renderer
    event.sender.send("load-notes", notes);
  })

ipcMain.on("update-notes",(event,updatedNotes)=>{
  fs.writeFileSync(notesFile,JSON.stringify(updatedNotes));
  event.sender.send("load-notes",updatedNotes);
});

ipcMain.on('say-hello', (event, data) => {
  console.log('📩 [Main] Message from React:', data);
  // Send response back to renderer
  event.sender.send('say-hello', `Backend received: "${data}"`);
});
// ipcMain.on(channel, callback) - Listens for messages from renderer
// event.sender.send(channel, data) - Sends response back to renderer
// event.sender - Automatically knows which window sent the message

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);

// ✅ Summary of main.js workflow
// 1. Import necessary Electron & Node.js modules.
// 2. Convert import.meta.url → __dirname (for ES Modules).
// 3. Set up paths for dev server and production build.
// 4. Create a BrowserWindow instance.
// 5. Load either Vite dev server or built HTML.
// 6. Send messages to Renderer (IPC).
// 7. Handle window close & macOS activate events.
// 8. Run createWindow() when Electron is ready.
