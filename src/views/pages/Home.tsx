// src/views/pages/Home.tsx
import React from "react";
import TopMenu from "../components/TopMenu";

export default function Home() {
  return (
    <>
      <TopMenu />

      {/* =======================
          HERO / INTRO SECTION
          ======================= */}
      <section
        id="hero"
        style={{
          textAlign: "center",
          padding: "60px 20px",
          background: "linear-gradient(120deg, #6b7280, #6b7280)",
        }}
      >
        <h1 style={{ fontSize: 48, marginBottom: 16 }}>Bienvenidos a la Cocina Peruana</h1>
        <p style={{ fontSize: 20, maxWidth: 600, margin: "0 auto", lineHeight: 1.5 }}>
          Explore las ricas tradiciones culinarias de Perú y descubra sus diversos sabores de la costa, 
          la sierra y la selva..
        </p>
      </section>

      <section id="about" style={{ padding: "40px 20px", background: "#004F92" }}>
        <h2 style={{ fontSize: 32, marginBottom: 16 }}>Acerca de</h2>
        <p>
          Este sitio web muestra la rica gastronomía de Perú. Aprende sobre sus ingredientes, 
          historia y significado cultural de cada plato.
        </p>
      </section>

      <section id="contact" style={{ padding: "40px 20px" }}>
        <h2 style={{ fontSize: 32, marginBottom: 16 }}>Contact</h2>
        <p>
          For inquiries, feedback, or collaboration opportunities, please reach out via email
          or social media.
        </p>
      </section>
    </>
  );
}

