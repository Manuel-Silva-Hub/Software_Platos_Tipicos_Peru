import TopMenu from "../components/TopMenu";

export default function About() {
  return (
    <main style={{ maxWidth: 900, margin: "60px auto", padding: "0 20px" }}>
    
        <TopMenu />

      {/* =========================
          PAGE TITLE
          ========================= */}
      <h1 style={{ fontSize: 40, textAlign: "center", marginBottom: 24 }}>
        Acerca de nuestro proyecto
      </h1>

      {/* =========================
          INTRODUCTION
          ========================= */}
      <section style={{ marginBottom: 40 }}>
        <p style={{ fontSize: 18, lineHeight: 1.6 }}>
          Bienvenido a nuestro sitio web dedicado a mostrar la rica tradición culinaria del Perú. 
          Nuestro objetivo es compartir las historias, los ingredientes y los sabores regionales que 
          hacen que la cocina peruana sea tan única y diversa.
        </p>
      </section>

      {/* =========================
          OUR MISSION
          ========================= */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 32, marginBottom: 12 }}>Nuestra Mision</h2>
        <p style={{ fontSize: 16, lineHeight: 1.5 }}>
          Nuestro objetivo es conectar a los amantes de la comida de todo el mundo con auténticos platos peruanos. 
          Aprenda sobre los ingredientes, los métodos de cocción y el significado cultural detrás de cada plato..
        </p>
      </section>

      {/* =========================
          TEAM
          ========================= */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 32, marginBottom: 12 }}>Nuestro equipo</h2>
        <ul style={{ fontSize: 16, lineHeight: 1.6 }}>
          <li><strong>Manuel:</strong> Backend & API Integration</li>
          <li><strong>Artur:</strong> Frontend & Database Management</li>
        </ul>
      </section>

      {/* =========================
          CONTACT / FOLLOW US
          ========================= */}
      <section>
        <h2 style={{ fontSize: 32, marginBottom: 12 }}>Contáctenos y síganos</h2>
        <p style={{ fontSize: 16, lineHeight: 1.5 }}>
          ¿Tienes preguntas o quieres colaborar? Comuníquese por correo electrónico a {<a href="mailto:info@example.com">info@example.com</a>} o síganos en las redes sociales.
        </p>
      </section>
    </main>
  );
}
