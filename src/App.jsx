import React, { useEffect, useState } from "react";

const App = () => {
  const [message, setMessage] = useState("");

  useEffect(() => {
    console.log('🔍 App mounted, checking for ipcRenderer...');
    console.log('window.ipcRenderer exists?', !!window.ipcRenderer);
    
    if (!window.ipcRenderer) {
      console.error("❌ ipcRenderer not available!");
      return;
    }

    console.log('✅ ipcRenderer is available');

    // Listen for messages from backend
    window.ipcRenderer.on("say-hello", (msg) => {
      console.log("📨 [React] Received from backend:", msg);
      setMessage(msg);
    });

    console.log('👂 Listener set up for "say-hello" channel');

    return () => {
      console.log('🧹 Cleaning up listener');
      window.ipcRenderer.off("say-hello");
    };
  }, []);

  const handleClick = () => {
    console.log('🖱️ Button clicked!');
    
    if (!window.ipcRenderer) {
      console.error("❌ ipcRenderer not available!");
      alert("ipcRenderer not available!");
      return;
    }
    
    const myMessage = "Hello from React!";
    console.log("📤 [React] Sending to backend:", myMessage);
    
    window.ipcRenderer.send("say-hello", myMessage);
    console.log('✅ Message sent!');
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Electron IPC Communication</h1>
      
      <div style={{ marginBottom: "20px", padding: "10px", backgroundColor: "#f0f0f0", borderRadius: "4px" }}>
        <p><strong>IPC Status:</strong> {window.ipcRenderer ? '✅ Connected' : '❌ Not Connected'}</p>
      </div>
      
      <button 
        onClick={handleClick}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "4px"
        }}
      >
        Send Message to Backend
      </button>
      
      {message && (
        <div style={{
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "#e8f5e9",
          borderRadius: "4px",
          border: "2px solid #4CAF50"
        }}>
          <strong>✅ Response from Backend:</strong>
          <p style={{ margin: "10px 0 0 0" }}>{message}</p>
        </div>
      )}
    </div>
  );
};

export default App;