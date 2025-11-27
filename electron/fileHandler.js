import fs from "fs";
import path from "path";
import {app} from "electron";

const notesFile=path.join(app.getPath("userData"),"notes.json");

function ensureFile(){
    if(!fs.existsSync(notesFile)){
        fs.writeFileSync(notesFile,JSON.stringify([]));
    }
}

function readNotes(){
    ensureFile();
    return JSON.parse(fs.readFileSync(notesFile,"utf-8"));
}

function writeNotes(notes){
    ensureFile();
    fs.writeFileSync(notesFile,JSON.stringify(notes,null,2))
}

export {readNotes,writeNotes};