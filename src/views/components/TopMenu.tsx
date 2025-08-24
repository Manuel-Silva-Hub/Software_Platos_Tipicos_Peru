// src/views/components/TopMenu.tsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function TopMenu() {
  const navigate = useNavigate();

  return (
    <nav style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 16 }}>
      <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#0b63ff", fontWeight: 500, cursor: "pointer" }}>Home</button>
      <button onClick={() => navigate("/dishes")} style={{ background: "none", border: "none", color: "#0b63ff", fontWeight: 500, cursor: "pointer" }}>Dishes</button>
      <button onClick={() => navigate("/about")} style={{ background: "none", border: "none", color: "#0b63ff", fontWeight: 500, cursor: "pointer" }}>About</button>
      <button onClick={() => navigate("/contact")} style={{ background: "none", border: "none", color: "#0b63ff", fontWeight: 500, cursor: "pointer" }}>Contact</button>
    </nav>
  );
}
