import { useState, useEffect } from "react";
import { Authenticator, Divider } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";
import { getUrl, uploadData } from "aws-amplify/storage";
import { generateClient } from "aws-amplify/data";
import outputs from "../amplify_outputs.json";
import "./index.css"; // Make sure this line is included

/**
 * @type {import('aws-amplify/data').Client<import('../amplify/data/resource').Schema>}
 */
Amplify.configure(outputs);
const client = generateClient({ authMode: "userPool" });

export default function App() {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const { data: notes } = await client.models.Note.list();
    await Promise.all(
      notes.map(async (note) => {
        if (note.image) {
          const link = await getUrl({
            path: ({ identityId }) => `media/${identityId}/${note.image}`,
          });
          note.image = link.url;
        }
        return note;
      })
    );
    setNotes(notes);
  }

  async function createNote(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const imageFile = form.get("image");

    const { data: newNote } = await client.models.Note.create({
      name: form.get("name"),
      description: form.get("description"),
      image: imageFile?.name,
    });

    if (newNote.image && imageFile) {
      await uploadData({
        path: ({ identityId }) => `media/${identityId}/${newNote.image}`,
        data: imageFile,
      }).result;
    }

    fetchNotes();
    event.target.reset();
  }

  async function deleteNote({ id }) {
    await client.models.Note.delete({ id });
    fetchNotes();
  }

  return (
    <Authenticator>
      {({ signOut }) => (
        <div className="app">
          <h1 className="title">📝 My Notes App</h1>

          <form onSubmit={createNote} className="note-form">
            <input type="text" name="name" placeholder="Note Name" required className="input" />
            <input
              type="text"
              name="description"
              placeholder="Note Description"
              required
              className="input"
            />
            <input type="file" name="image" accept="image/*" className="file-input" />
            <button type="submit" className="btn btn-primary">Create Note</button>
          </form>

          <Divider className="divider" />

          <h2 className="subtitle">📌 Current Notes</h2>
          <div className="notes-grid">
            {notes.map((note) => (
              <div key={note.id || note.name} className="note-card">
                <h3 className="note-title">{note.name}</h3>
                <p className="note-desc">{note.description}</p>
                {note.image && (
                  <img src={note.image} alt={`visual for ${note.name}`} className="note-img" />
                )}
                <button onClick={() => deleteNote(note)} className="btn btn-danger">
                  Delete Note
                </button>
              </div>
            ))}
          </div>

          <button onClick={signOut} className="btn btn-secondary">Sign Out</button>
        </div>
      )}
    </Authenticator>
  );
}
