// frontend/src/App.jsx
import React, { useEffect, useState } from "react";
import { fetchEvents, addEvent } from "./services/api";

/*
  NOTE: the project has an uploaded image file that can be used as a logo/header.
  Use this local path as the URL if you want the app to display it (it will be converted
  to a real URL by your environment/tooling):
  /mnt/data/66895a0f-0ea1-4d28-a8ff-2dff1f1f1801.png
*/

const LOGO_URL = "/mnt/data/66895a0f-0ea1-4d28-a8ff-2dff1f1f1801.png";

export default function App() {
  const [events, setEvents] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  // fetch list of events from backend
  async function loadEvents() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchEvents();
      // server returns { items } or { results } or direct array — handle common shapes
      const list =
        res && Array.isArray(res.items)
          ? res.items
          : res && Array.isArray(res.results)
          ? res.results
          : Array.isArray(res)
          ? res
          : [];
      setEvents(list);
    } catch (err) {
      console.error("Failed to load events", err);
      setError("Failed to load events. Check backend is running and API path is correct.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  // add event handler
  async function handleAdd(e) {
    e.preventDefault();
    if (!text.trim()) return setError("Please enter some text before adding.");
    setAdding(true);
    setError(null);
    setSuccessMsg("");
    try {
      // Call backend: this uses addEvent from services/api which posts to /api/events
      const res = await addEvent(text.trim());
      // server returns { message, id } on success
      setSuccessMsg(res?.message || "Saved");
      setText("");
      // reload events (could also optimistically append)
      await loadEvents();
    } catch (err) {
      console.error("Add failed", err);
      setError("Failed to add event. See console for details.");
    } finally {
      setAdding(false);
      // auto-clear success after a moment
      setTimeout(() => setSuccessMsg(""), 2500);
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        {/* if your environment serves the local path as a URL, the logo will show */}
        <img src={LOGO_URL} alt="logo" style={styles.logo} onError={(e) => (e.target.style.display = "none")} />
        <h1 style={{ margin: 0 }}>Time Travelers Archive</h1>
      </header>

      <main style={styles.container}>
        <section style={styles.card}>
          <h2>Add New Document</h2>

          <form onSubmit={handleAdd}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or type the document text here..."
              style={styles.textarea}
              rows={8}
            />

            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
              <button style={styles.button} disabled={adding}>
                {adding ? "Adding..." : "Add Document"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setText("Example: My memory of 1995 ...");
                }}
                style={styles.ghost}
              >
                Fill example
              </button>

              {successMsg ? <div style={styles.success}>{successMsg}</div> : null}
              {error ? <div style={styles.error}>{error}</div> : null}
            </div>
          </form>
        </section>

        <section style={styles.card}>
          <h2>Documents</h2>

          <div style={{ marginBottom: 10 }}>
            <button style={styles.smallBtn} onClick={loadEvents} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div>Loading events...</div>
          ) : events.length === 0 ? (
            <div>No documents yet — add one above.</div>
          ) : (
            <ul style={styles.list}>
              {events.map((ev) => (
                <li key={ev._id || ev.id || Math.random()} style={styles.listItem}>
                  <div style={styles.itemHeader}>
                    <strong style={{ fontSize: 16 }}>{ev.title || "Untitled"}</strong>
                    <small style={{ color: "#666" }}>{ev.date ? ` • ${ev.date}` : ""}</small>
                  </div>
                  <div style={styles.itemText}>{ev.text ? ev.text.slice(0, 400) : "(no text)"}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer style={styles.footer}>
        <small>Backend: http://localhost:4000/api — make sure backend is running (nodemon server.js)</small>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "system-ui, Arial, sans-serif",
    color: "#111",
    minHeight: "100vh",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    padding: "20px 28px",
    background: "#1f2937",
    color: "white",
  },
  logo: {
    width: 48,
    height: 48,
    objectFit: "cover",
    borderRadius: 8,
  },
  container: {
    padding: 24,
    flex: 1,
    maxWidth: 980,
    margin: "0 auto",
    width: "100%",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    padding: 20,
    borderRadius: 8,
    marginBottom: 18,
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
  },
  textarea: {
    width: "100%",
    padding: 12,
    fontSize: 15,
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontFamily: "inherit",
  },
  button: {
    background: "#111827",
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: 8,
    cursor: "pointer",
  },
  ghost: {
    background: "#f3f4f6",
    color: "#111827",
    border: "none",
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
  },
  smallBtn: {
    background: "#efefef",
    border: "1px solid #ddd",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },
  success: {
    color: "#064e3b",
    background: "#d1fae5",
    padding: "6px 10px",
    borderRadius: 6,
  },
  error: {
    color: "#7f1d1d",
    background: "#fee2e2",
    padding: "6px 10px",
    borderRadius: 6,
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  listItem: {
    padding: 12,
    borderBottom: "1px solid #eee",
  },
  itemHeader: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  itemText: {
    color: "#111",
    whiteSpace: "pre-wrap",
  },
  footer: {
    padding: 12,
    textAlign: "center",
    borderTop: "1px solid #eee",
    fontSize: 13,
    color: "#666",
  },
};
