import React, {useEffect, useState} from "react";
import "./App.css";

const App=()=>{
  const [note,setNote]=useState("");
  // one state for all current text
  const [notes,setNotes]=useState([]);
  // one state for all saved notes
  const [editIndex,setEditIndex]=useState(null);
  // Add a new state to store the index of the note being edited
  // null means no note is being edited.
  // When user clicks Edit, we set editIndex to that note’s index.
  const [selectedCategory,setSelectedCategory]=useState("General");

  const addNote=()=>{
    if (note.trim()==="") return;
    const newNote={
      text:note,
      createdAt:new Date().toLocaleDateString(),
      // readable timestamp;
      category:selectedCategory
    };
    setNotes([...notes,newNote]);
    // Copy all old notes in the new array
    // Add the new note at the end
    // If we don’t create a new array → UI may not refresh.

    // send only newly typed note to main process
    window.ipcRenderer.send("save-note",newNote);

    setNote("");
    // clear the input box
  }
  const deleteNote=(index)=>{
    const newNotes=[];
    for (let i=0; i<notes.length;i++){
      if(i!==index){
        newNotes.push(notes[i]);
      }
    }
    // const newNotes = notes.filter((_, i) => i !== indexToDelete);
    // _ → means “I don’t care about this value” (it’s the note text).
    // i → the current index in the array.
    // i !== indexToDelete → keep all notes except the one at the index we want to delete.

    setNotes(newNotes);

    window.ipcRenderer.send("update-notes",newNotes);
  }

  const editNote=(index)=>{
    setEditIndex(index);
  }

  const saveEdit=()=>{
    window.ipcRenderer.send("update-notes",notes);
    setEditIndex(null);
    setNote("");
  }

  // Runs one time only when React UI loads.
  useEffect(()=>{
    if(!window.ipcRenderer) return;

    const handleLoadNotes=(loadedNotes)=>{
      setNotes(loadedNotes);
    };
    window.ipcRenderer.on("load-notes",handleLoadNotes);
    return()=>{
      window.ipcRenderer.off("load-notes");
    }
  })
  return(
    <div className="container">
      <h1 className="title">My Notes</h1>
    <div>
      <h2>ADD NOTE</h2>
      <div className="input-area" >
        <input type="text"  placeholder="Write a note..." value={editIndex!==null?notes[editIndex].text:note} 
        onChange={(e)=>{
          if(editIndex!==null){
            const updatedNotes=[...notes];
            updatedNotes[editIndex].text=e.target.value;
            setNotes(updatedNotes);
          }
          else{
            setNote(e.target.value)
          }
        }}
        />
      </div>
        <select
        value={selectedCategory}
        onChange={(e)=>setSelectedCategory(e.target.value)}>
          <option value="General">General</option>
          <option value="Work">Work</option>
          <option value="Ideas">Ideas</option>
          <option value="Personal">Personal</option>
        </select>
        <br/><br/>

      {/* onChange controls what happens when someone types in input box
      e=event object(it contains information about the input box event)*/}
      <button onClick={editIndex!==null?saveEdit:addNote} className="add-btn">
        {editIndex!==null?"Save Edit":"Add Note"}</button>
      <h3>Notes:</h3>

      <ul className="notes-list">
        {notes.map((n,i)=>(

          <li key={i} className="note-item">
            <div className="note-text">{n.text}</div>
            <div className="note-meta">
              <div className="note-date">{n.createdAt}</div>
              <div className="category-tag"><b>Category:</b>{n.category}</div>
            </div>
            
            <div className="note-actions">
              <button onClick={()=>editNote(i)} className="edit-btn">Edit</button>
              <button onClick={()=>deleteNote(i)} className="delete-btn">Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
};

export default App;