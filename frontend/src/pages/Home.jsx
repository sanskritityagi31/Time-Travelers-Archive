import React, { useState } from "react";
import { addDocument, searchDocuments } from "../services/api";

export default function Home() {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const handleAdd = async () => {
    if (!text.trim()) return alert("Please enter text!");
    const response = await addDocument(text);
    alert(response.message || "Document added!");
    setText("");
  };

  const handleSearch = async () => {
    if (!query.trim()) return alert("Please enter search text!");
    const response = await searchDocuments(query);
    setResults(response.results || []);
  };

  return (
    <div style={styles.container}>
      <h1>Time Travelers Archive</h1>

      {/* Add Document */}
      <div style={styles.box}>
        <h2>Add New Document</h2>
        <textarea
          placeholder="Enter historical text..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={styles.textarea}
        />

        <button onClick={handleAdd} style={styles.button}>
          Add Document
        </button>
      </div>

      {/* Search Section */}
      <div style={styles.box}>
        <h2>Semantic Search</h2>
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.input}
        />

        <button onClick={handleSearch} style={styles.button}>
          Search
        </button>

        {/* Results */}
        <div style={styles.results}>
          {results.map((r, i) => (
            <div key={i} style={styles.resultBox}>
              {r.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    maxWidth: "800px",
    margin: "auto",
  },
  box: {
    marginBottom: "30px",
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "10px",
  },
  textarea: {
    width: "100%",
    height: "100px",
    padding: "10px",
    marginBottom: "10px",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
  },
  button: {
    padding: "10px 20px",
    background: "#222",
    color: "white",
    border: "none",
    cursor: "pointer",
    borderRadius: "5px",
  },
  results: { marginTop: "20px" },
  resultBox: {
    padding: "10px",
    background: "#f1f1f1",
    marginBottom: "8px",
    borderRadius: "5px",
  },
};
