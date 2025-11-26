const { contextBridge, ipcRenderer } = require('electron');
// // STEP 1: Import Electron modules
// - contextBridge: Safely exposes APIs to renderer
// - ipcRenderer: Communicates with main process

contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (channel, data) => {
    const validChannels = ['say-hello','save-note','update-notes'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  on: (channel, callback) => {
    const validChannels = ['say-hello', 'main-process-message','load-notes'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => {
        callback(...args);
      });
    }
  },
  
  off: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
