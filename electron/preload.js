const { contextBridge, ipcRenderer } = require('electron');
// // STEP 1: Import Electron modules
// - contextBridge: Safely exposes APIs to renderer
// - ipcRenderer: Communicates with main process

const validChannels=[
  "save-note",
  "update-notes",
  "load-notes",
  "say-hello"
];

contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (channel, data) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  on: (channel, callback) => {
  
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  
  off: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
