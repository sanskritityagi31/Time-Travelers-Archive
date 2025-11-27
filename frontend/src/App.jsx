// frontend/src/App.jsx
import React, { useEffect, useState } from "react";
import { fetchEvents, addEvent, semanticSearch, login } from "./services/api";

export default function App() {
  const [events, setEvents] = useState([]);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [token, setToken] = useState(localStorage.getItem("tt_token") || "");
  const [message, setMessage] = useState("");

  async function loadEvents() {
    try {
      const res = await fetchEvents();
      setEvents(res.items || []);
    } catch (err) {
      console.error(err);
      setMessage("Failed to load events");
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await addEvent({ title: text.slice(0, 40), text }, token);
      setText("");
      setMessage("Added event, reloading...");
      loadEvents();
    } catch (err) {
      console.error(err);
      setMessage("Add failed: " + err.message);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    try {
      const res = await semanticSearch(query);
      setEvents(res.results || []);
    } catch (err) {
      console.error(err);
      setMessage("Search failed: " + err.message);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email = prompt("email?");
    const password = prompt("password?");
    if (!email || !password) return;
    try {
      const r = await login(email, password);
      setToken(r.token);
      localStorage.setItem("tt_token", r.token);
      setMessage("Logged in");
    } catch (err) {
      setMessage("Login failed: " + err.message);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", fontFamily: "serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Time Travelers Archive (dev)</h1>
        <div>
          <button onClick={handleLogin}>Login</button>
        </div>
      </header>

      <section style={{ marginTop: 24 }}>
        <form onSubmit={handleAdd}>
          <h2>Add Document</h2>
          <textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ width: "100%" }}
          />
          <div style={{ marginTop: 8 }}>
            <button type="submit">Add Document</button>
          </div>
        </form>
      </section>

      <section style={{ marginTop: 24 }}>
        <form onSubmit={handleSearch}>
          <h2>Semantic Search</h2>
          <input value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: "80%" }} />
          <button type="submit">Search</button>
        </form>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Results</h2>
        <div>
          {events.length === 0 && <p>No results</p>}
          {events.map((ev) => (
            <article key={ev._id} style={{ border: "1px solid #ddd", padding: 12, marginBottom: 8 }}>
              <h3>{ev.title || "(no title)"}</h3>
              <small>{ev.date}</small>
              <p>{ev.text?.slice(0, 300)}</p>
            </article>
          ))}
        </div>
      </section>

      <footer style={{ marginTop: 40 }}>
        <div>{message}</div>
      </footer>
    </div>
  );
}
