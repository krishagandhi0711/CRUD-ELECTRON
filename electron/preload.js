// Use CommonJS syntax (require) not ES6 (import)
const { contextBridge, ipcRenderer } = require('electron');
// STEP 1: Import Electron modules
// - contextBridge: Safely exposes APIs to renderer
// - ipcRenderer: Communicates with main process


console.log('🔧 Preload script is running!');

// Expose IPC methods to the renderer process (React)
contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (channel, data) => {
    console.log('📤 [Preload] Sending:', channel, data);
    const validChannels = ['say-hello'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    } else {
      console.error('❌ [Preload] Invalid channel:', channel);
    }
  },
  
  on: (channel, callback) => {
    console.log('👂 [Preload] Setting up listener for:', channel);
    const validChannels = ['say-hello', 'main-process-message'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => {
        console.log('📨 [Preload] Received:', channel, args);
        callback(...args);
      });
    } else {
      console.error('❌ [Preload] Invalid channel:', channel);
    }
  },
  
  off: (channel) => {
    const validChannels = ['say-hello', 'main-process-message'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  }
});

console.log('✅ Preload script finished - window.ipcRenderer is ready');