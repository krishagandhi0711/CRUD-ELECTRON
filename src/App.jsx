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
  const [filterCategory,setFilterCategory]=useState("All Notes");
  const [searchText, setSearchText]=useState("");
  const [sortOrder,setSortOrder]=useState("newest");
  const [deadline,setDeadline]=useState(null);
  const [notification, setNotification] = useState(null);


  const addNote=()=>{
    if (note.trim()==="") return;
    const newNote={
      text:note,
      createdAt:new Date().toISOString(),
      // readable timestamp;
      category:selectedCategory,
      deadline:deadline? new Date(deadline).toISOString():null
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
    setNote(notes[index].text);
    setDeadline(notes[index].deadline? notes[index].deadline.slice(0,16):"");
  }

  const saveEdit=()=>{
    const updatedNotes=[...notes];

    updatedNotes[editIndex]={
      ...updatedNotes[editIndex],
      text:note,
      deadline: deadline? new Date(deadline).toISOString():null
    };
    setNotes(updatedNotes);
    window.ipcRenderer.send("update-notes",updatedNotes);
    setEditIndex(null);
    setNote("");
    setDeadline(null);
  }

  const displayedNotes=notes.filter(note=>{
    if(filterCategory!=="All Notes" && note.category!==filterCategory){
      return false;
    };
    if(!note.text.toLowerCase().includes(searchText.toLowerCase())){
      return false;
    };
    return true;
  });

  displayedNotes.sort((a,b)=>{
    const dateA=new Date(a.createdAt);
    const dateB=new Date(b.createdAt);

    if (sortOrder=="newest") return dateB-dateA;
    else return dateA-dateB;
  })
      
  // Runs one time only when React UI loads.
  useEffect(()=>{
    if(!window.ipcRenderer) return;

    const handleLoadNotes=(loadedNotes)=>{
      setNotes(loadedNotes);
    };
    window.ipcRenderer.on("load-notes",handleLoadNotes);

  const timer = setInterval(() => {
  const now = new Date();
  setNotes((prevNotes) => {
    return prevNotes.map((n) => {
      if (n.deadline) {
        const noteDeadline = new Date(n.deadline);
        if (noteDeadline <= now && !n.notified) {
          setNotification("Deadline reached for note: " + n.text);
          return { ...n, notified: true };
        }
      }
      return n; 
    });
  });
}, 1000);
    return()=>{
      window.ipcRenderer.off("load-notes",handleLoadNotes);
      clearInterval(timer);
    };
  },[notes]);

  return(
    <div className="layout">
      <div className="sidebar">
        <h2>Categories</h2>
        <ul>
          {["All Notes","General","Work","Ideas","Personal"].map((cat)=>(
            <li key={cat}
            onClick={()=>setFilterCategory(cat)}
            className={filterCategory===cat?"active-category":""}
            >
              {cat}
            </li>
          ))}
        </ul>
      </div>

    <div className="container main-area">
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

        <input type="datetime-local" value={deadline}
        onChange={(e)=>setDeadline(e.target.value)}/>

      {/* onChange controls what happens when someone types in input box
      e=event object(it contains information about the input box event)*/}
      <button onClick={editIndex!==null?saveEdit:addNote} className="add-btn">
        {editIndex!==null?"Save Edit":"Add Note"}</button>

        {notification && (
          <div className="notification">
            {notification}
            <button onClick={()=>setNotification(null)} className="close-notif">X</button>
            </div>
        )}

      <h3>Notes:</h3>

      <input type="text" className="search-box" placeholder="Search notes..." 
      value={searchText} onChange={(e)=>setSearchText(e.target.value)}/>

      <select value={sortOrder}
      onChange={(e)=>setSortOrder(e.target.value)}
      className="sort-dropdown"
      >
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
      </select>

      <ul className="notes-list">
        {displayedNotes.map((n,i)=>(
           <li key={i} className="note-item">
            <div className="note-text">{n.text}</div>
            <div className="note-meta">
              <div className="note-date">{n.createdAt}</div>
              {n.deadline && (
                <div className="note-deadline">
                  <b>Deadline:</b> {new Date(n.deadline).toLocaleString()}
                  </div>
              )}
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
        </div>
  );
};

export default App;