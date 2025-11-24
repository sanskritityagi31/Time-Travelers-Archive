import React from "react";

export default function Navbar() {
  return (
    <nav style={styles.nav}>
      <h2>🕒 Time Travelers Archive</h2>
    </nav>
  );
}

const styles = {
  nav: {
    padding: "15px 20px",
    background: "#222",
    color: "white",
    fontSize: "20px",
  },
};
