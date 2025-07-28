const express = require("express");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 3000;

const CT_JWT = process.env.CT_JWT;

// Middleware para permitir CORS (por ejemplo, desde Google Sheets)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// Endpoint principal
app.get("/precioCT0", async (req, res) => {
  const { carta, expansion } = req.query;

  if (!carta || !expansion) {
    return res.status(400).json({ error: "Faltan parámetros: carta y expansion son obligatorios" });
  }

  try {
    console.log("📨 Petición recibida:");
    console.log("→ Carta:", carta);
    console.log("→ Expansión:", expansion);
    console.log("→ JWT usado:", CT_JWT ? CT_JWT.slice(0, 30) + "..." : "undefined");

    const expansionRes = await fetch("https://api.cardtrader.com/api/v2/expansions", {
      headers: {
        Authorization: `Bearer ${CT_JWT}`
      }
    });

    console.log("🔍 Código de respuesta:", expansionRes.status);

    if (!expansionRes.ok) {
      const errorText = await expansionRes.text();
      console.log("❌ Error al obtener expansiones:", errorText);
      throw new Error(`Error ${expansionRes.status}: ${errorText}`);
    }

    const data = await expansionRes.json();
    const expansiones = Array.isArray(data) ? data : data.data;

    console.log("📦 Número de expansiones:", expansiones.length);

    // 🔎 Mostrar la primera expansión entera
    console.log("🔎 Primera expansión (para inspección completa):");
    console.log(JSON.stringify(expansiones[0], null, 2));

    // 🔎 Mostrar claves y nombre de cada expansión
    console.log("🔎 Claves disponibles en las expansiones:");
    expansiones.slice(0, 20).forEach(e => {
      console.log("- keys:", Object.keys(e).join(", "));
      console.log("→ name:", e.name);
    });

    // Intento de búsqueda de slug genérico por si alguno sí lo tuviera
    const expansionObj = expansiones.find((e) => {
      return (
        e.slug?.toLowerCase() === expansion.toLowerCase() ||
        e.url_slug?.toLowerCase() === expansion.toLowerCase() ||
        e.code?.toLowerCase() === expansion.toLowerCase()
      );
    });

    if (!expansionObj) {
      console.log("❓ No se encontró la expansión con ningún slug/código:", expansion);
      return res.status(404).json({ error: "Expansión no encontrada", expansion });
    }

    console.log("✅ Expansión encontrada:", expansionObj.name, "ID:", expansionObj.id);

    return res.json({
      expansionSolicitada: expansion,
      expansionEncontrada: expansionObj.name,
      expansion_id: expansionObj.id
    });

  } catch (error) {
    console.error("🔥 Error interno:", error.message);
    return res.status(500).json({ error: "Error interno del servidor", detalle: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});

