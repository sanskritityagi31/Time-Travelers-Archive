// frontend/src/services/api.js
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000/api";

export async function fetchEvents(page = 1, limit = 10) {
  const res = await fetch(`${API_BASE}/events?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function addEvent({ title = "", date = "", text = "" }, token) {
  const res = await fetch(`${API_BASE}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({ title, date, text }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE.replace("/api", "/api")}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function register(email, password) {
  const res = await fetch(`${API_BASE.replace("/api", "/api")}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function semanticSearch(query, page = 1, limit = 10) {
  const res = await fetch(`${API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, page, limit }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
