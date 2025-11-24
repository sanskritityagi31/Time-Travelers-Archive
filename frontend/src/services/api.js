const API_BASE = "http://localhost:4000/api";

export async function fetchEvents() {
  const res = await fetch(`${API_BASE}/events`);
  return res.json();
}

export async function addEvent(text) {
  const res = await fetch(`${API_BASE}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // TEMP: title and date hardcoded (you can add UI later)
    body: JSON.stringify({ title: "Untitled", date: "", text }),
  });
  return res.json();
}
