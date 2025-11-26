# Complete Electron IPC Tutorial - Understanding Everything

## 📚 Table of Contents
1. [What is Electron?](#what-is-electron)
2. [The Three Processes](#the-three-processes)
3. [Security Model](#security-model)
4. [IPC Communication Flow](#ipc-communication-flow)
5. [Code Breakdown](#code-breakdown)
6. [Writing Your Own IPC Channels](#writing-your-own)
7. [Common Patterns](#common-patterns)
8. [Troubleshooting Guide](#troubleshooting)

---

## What is Electron?

Electron lets you build **desktop applications** using **web technologies** (HTML, CSS, JavaScript/React).

### Think of it like this:
- **Chrome browser** = Displays web pages
- **Electron** = Chrome browser + Node.js powers + Desktop app features

### Real Examples:
- VS Code
- Discord
- Slack
- Figma Desktop

---

## The Three Processes

Electron has **3 separate environments** that need to communicate:

```
┌─────────────────────────────────────────────────────┐
│                    YOUR ELECTRON APP                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐      ┌──────────────┐            │
│  │ Main Process │◄────►│   Preload    │            │
│  │  (Backend)   │      │   (Bridge)   │            │
│  │              │      │              │            │
│  │ - Node.js    │      │ - Restricted │            │
│  │ - File system│      │ - Security   │            │
│  │ - Native APIs│      │   layer      │            │
│  └──────────────┘      └──────┬───────┘            │
│                               │                     │
│                               ▼                     │
│                    ┌──────────────────┐             │
│                    │ Renderer Process │             │
│                    │   (Frontend)     │             │
│                    │                  │             │
│                    │ - React/HTML/CSS │             │
│                    │ - UI Logic       │             │
│                    │ - NO Node.js     │             │
│                    └──────────────────┘             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 1. **Main Process** (`electron/main.js`)
- **What it is:** The "backend" of your app
- **What it can do:**
  - Create windows
  - Access file system (read/write files)
  - Use Node.js modules
  - Access native OS features
  - Control app lifecycle (open, close, minimize)
- **Analogy:** Like a Node.js server, but for a desktop app

### 2. **Renderer Process** (`src/App.jsx`)
- **What it is:** The "frontend" - what users see
- **What it can do:**
  - Display UI (HTML, CSS, React)
  - Handle user interactions (clicks, forms)
  - Run JavaScript (but NO Node.js access for security)
- **Analogy:** Like a web browser tab - it's isolated for security

### 3. **Preload Script** (`electron/preload.js`)
- **What it is:** A secure **bridge** between Main and Renderer
- **Why it exists:** Security! Renderer shouldn't access Node.js directly
- **What it does:** Exposes ONLY specific, safe functions to the frontend
- **Analogy:** Like an API gateway - controls what the frontend can access

---

## Security Model

### ⚠️ Why is this complicated?

**Without security:**
```javascript
// BAD - Don't do this!
// If renderer had full Node.js access:
const fs = require('fs');
fs.unlinkSync('/important/system/file');  // Malicious code could delete files!
```

If a hacker injected JavaScript into your app (XSS attack), they could:
- Delete files
- Steal data
- Install malware

### ✅ Electron's Solution: Context Isolation

```
Renderer Process (React)
    ↓
    Can ONLY call functions you explicitly expose
    ↓
Preload Script (Security Bridge)
    ↓
    Only allows whitelisted operations
    ↓
Main Process (Full Node.js powers)
```

**Key Security Settings:**
```javascript
webPreferences: {
  contextIsolation: true,    // ✅ Keep renderer isolated
  nodeIntegration: false,    // ✅ No direct Node.js access
  preload: 'path/to/preload.js'  // ✅ Safe bridge only
}
```

---

## IPC Communication Flow

### What is IPC?
**IPC = Inter-Process Communication** (how separate processes talk to each other)

### The Flow:

```
USER CLICKS BUTTON
    ↓
┌──────────────────────────────────────────────────────┐
│ 1. RENDERER (React/App.jsx)                          │
│    User clicks "Send Message" button                 │
│    ↓                                                  │
│    window.ipcRenderer.send('say-hello', 'Hi!')       │
└──────────────────────────────────────────────────────┘
    ↓
┌──────────────────────────────────────────────────────┐
│ 2. PRELOAD (electron/preload.js)                     │
│    - Receives the call                               │
│    - Checks if 'say-hello' is a valid channel        │
│    - If valid, forwards to Main Process              │
│    ↓                                                  │
│    ipcRenderer.send(channel, data)                   │
└──────────────────────────────────────────────────────┘
    ↓
┌──────────────────────────────────────────────────────┐
│ 3. MAIN (electron/main.js)                           │
│    - Receives message on 'say-hello' channel         │
│    - Processes it (e.g., save to file, API call)     │
│    - Sends response back                             │
│    ↓                                                  │
│    event.sender.send('say-hello', 'Got it!')         │
└──────────────────────────────────────────────────────┘
    ↓
┌──────────────────────────────────────────────────────┐
│ 4. PRELOAD (electron/preload.js)                     │
│    - Receives response from Main                     │
│    - Forwards to Renderer                            │
└──────────────────────────────────────────────────────┘
    ↓
┌──────────────────────────────────────────────────────┐
│ 5. RENDERER (React/App.jsx)                          │
│    - Listener receives the message                   │
│    - Updates UI with setMessage()                    │
│    - User sees "Backend received: Hi!"               │
└──────────────────────────────────────────────────────┘
```

---

## Code Breakdown

### 1. Main Process (`electron/main.js`)

```javascript
import { app, BrowserWindow, ipcMain } from 'electron';

// STEP 1: Import Electron modules
// - app: Controls application lifecycle
// - BrowserWindow: Creates windows
// - ipcMain: Listens for messages from renderer

const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;

// STEP 2: Detect if we're in development or production
// In dev: Vite runs a server (http://localhost:5173)
// In prod: We load static HTML files

function createWindow() {
  const preloadPath = isDev
    ? path.join(process.env.APP_ROOT, 'electron', 'preload.js')
    : path.join(__dirname, 'preload.js');

  // STEP 3: Set correct preload path
  // Dev: Points to source file (electron/preload.js)
  // Prod: Points to compiled file (dist-electron/preload.js)

  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: preloadPath,        // Load the bridge script
      contextIsolation: true,      // Security: Isolate renderer
      nodeIntegration: false,      // Security: No Node.js in renderer
    },
  });

  // STEP 4: Create a window with security enabled

  if (isDev) {
    win.loadURL(VITE_DEV_SERVER_URL);  // Dev: Load from Vite server
  } else {
    win.loadFile('dist/index.html');   // Prod: Load static file
  }
}

// STEP 5: Listen for messages from renderer
ipcMain.on('say-hello', (event, data) => {
  console.log('Received:', data);
  
  // Do something with the data (save file, API call, etc.)
  
  // Send response back to the renderer
  event.sender.send('say-hello', `Backend received: "${data}"`);
});

// STEP 6: Start the app
app.whenReady().then(createWindow);
```

**Key Concepts:**
- `ipcMain.on(channel, callback)` - **Listens** for messages from renderer
- `event.sender.send(channel, data)` - **Sends** response back to renderer
- `event.sender` - Automatically knows which window sent the message

---

### 2. Preload Script (`electron/preload.js`)

```javascript
const { contextBridge, ipcRenderer } = require('electron');

// STEP 1: Import Electron modules
// - contextBridge: Safely exposes APIs to renderer
// - ipcRenderer: Communicates with main process

// STEP 2: Expose ONLY specific functions to renderer
contextBridge.exposeInMainWorld('ipcRenderer', {
  
  // Function to SEND messages to main process
  send: (channel, data) => {
    const validChannels = ['say-hello'];
    
    // STEP 3: Whitelist - only allow specific channels
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  // Function to RECEIVE messages from main process
  on: (channel, callback) => {
    const validChannels = ['say-hello', 'main-process-message'];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => {
        callback(...args);  // Call the React callback with the data
      });
    }
  },
  
  // Function to REMOVE listeners
  off: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// STEP 4: Now renderer can use window.ipcRenderer.send() safely!
```

**Key Concepts:**
- `contextBridge.exposeInMainWorld(name, api)` - Makes `window.ipcRenderer` available in React
- **Whitelist pattern** - Only allows specific channels for security
- `require()` not `import` - Preload must use CommonJS syntax

---

### 3. Renderer Process (`src/App.jsx`)

```javascript
import React, { useEffect, useState } from "react";

const App = () => {
  const [message, setMessage] = useState("");

  // STEP 1: Set up listener when component mounts
  useEffect(() => {
    if (!window.ipcRenderer) return;

    // STEP 2: Listen for messages from main process
    window.ipcRenderer.on("say-hello", (msg) => {
      setMessage(msg);  // Update React state
    });

    // STEP 3: Cleanup on unmount
    return () => {
      window.ipcRenderer.off("say-hello");
    };
  }, []);

  // STEP 4: Send message when button is clicked
  const handleClick = () => {
    window.ipcRenderer.send("say-hello", "Hello from React!");
  };

  return (
    <div>
      <button onClick={handleClick}>Send Message</button>
      {message && <p>{message}</p>}
    </div>
  );
};
```

**Key Concepts:**
- `window.ipcRenderer` - Available because preload exposed it
- `useEffect` - Sets up listener when component mounts
- Cleanup function - Removes listener when component unmounts
- `send()` - Sends message to main process
- `on()` - Receives messages from main process

---

## Writing Your Own IPC Channels

### Example 1: Save a File

**1. Add to preload.js whitelist:**
```javascript
const validChannels = ['say-hello', 'save-file'];  // Add new channel
```

**2. Add handler in main.js:**
```javascript
import fs from 'fs';

ipcMain.on('save-file', (event, data) => {
  const { filename, content } = data;
  
  fs.writeFileSync(filename, content);
  
  event.sender.send('save-file-reply', { success: true });
});
```

**3. Use in React:**
```javascript
const saveFile = () => {
  window.ipcRenderer.send('save-file', {
    filename: 'myfile.txt',
    content: 'Hello World'
  });
};

useEffect(() => {
  window.ipcRenderer.on('save-file-reply', (result) => {
    console.log('File saved:', result.success);
  });
}, []);
```

---

### Example 2: Get System Info

**1. Update preload.js:**
```javascript
contextBridge.exposeInMainWorld('ipcRenderer', {
  // ... existing code ...
  
  // Add invoke for async operations
  invoke: (channel, data) => {
    const validChannels = ['get-system-info'];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
  }
});
```

**2. Add handler in main.js:**
```javascript
import os from 'os';

ipcMain.handle('get-system-info', async () => {
  return {
    platform: os.platform(),
    arch: os.arch(),
    memory: os.totalmem(),
    cpus: os.cpus().length
  };
});
```

**3. Use in React:**
```javascript
const [systemInfo, setSystemInfo] = useState(null);

const getInfo = async () => {
  const info = await window.ipcRenderer.invoke('get-system-info');
  setSystemInfo(info);
};
```

---

## Common Patterns

### Pattern 1: Request-Response (Async)

Use `handle/invoke` for operations that need a response:

```javascript
// Main process
ipcMain.handle('fetch-data', async (event, id) => {
  const data = await database.get(id);
  return data;
});

// Renderer
const data = await window.ipcRenderer.invoke('fetch-data', 123);
```

### Pattern 2: One-Way Message

Use `on/send` for fire-and-forget:

```javascript
// Main process
ipcMain.on('log-event', (event, message) => {
  console.log(message);
});

// Renderer
window.ipcRenderer.send('log-event', 'Button clicked');
```

### Pattern 3: Main → Renderer Push

Main process can push updates to renderer:

```javascript
// Main process
setInterval(() => {
  win.webContents.send('cpu-usage', getCpuUsage());
}, 1000);

// Renderer
useEffect(() => {
  window.ipcRenderer.on('cpu-usage', (usage) => {
    setCpuUsage(usage);
  });
}, []);
```

---

## Troubleshooting Guide

### Problem: "ipcRenderer is not defined"

**Cause:** Preload script not loading

**Fix:**
1. Check preload path in main.js
2. Verify preload.js exists
3. Check contextIsolation is true
4. Look for preload errors in console

### Problem: "Channel not working"

**Cause:** Channel name mismatch

**Fix:**
1. Verify exact spelling in all 3 files
2. Check whitelist in preload.js
3. Use console.log to debug

### Problem: "Message sent but no response"

**Cause:** No listener or wrong channel

**Fix:**
1. Check ipcMain.on() exists in main.js
2. Verify event.sender.send() is called
3. Check channel names match

---

## Practice Exercises

### Exercise 1: Counter
Create a counter that syncs between main and renderer:
- Click button in UI → increment counter in main process
- Main process sends updated count back to UI

### Exercise 2: File Reader
- Add a "Select File" button
- Use dialog.showOpenDialog() in main process
- Read file content and display in UI

### Exercise 3: Real-time Clock
- Main process sends current time every second
- Display updating clock in UI

---

## Key Takeaways

1. **Three Processes:** Main (backend), Renderer (frontend), Preload (bridge)
2. **Security First:** Always use contextIsolation and whitelist channels
3. **Communication:** Use IPC to send messages between processes
4. **Patterns:** 
   - `on/send` for one-way messages
   - `handle/invoke` for async request-response
5. **Paths Matter:** Dev vs production paths are different

---

## Next Steps

1. Build a simple todo app with file saving
2. Add multiple windows and communication between them
3. Explore native dialogs (file picker, notifications)
4. Learn about auto-updater for distributing updates
5. Study Electron security best practices

You're now ready to build your own Electron apps! 🚀