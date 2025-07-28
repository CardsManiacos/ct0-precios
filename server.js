const express = require("express");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 3000;

const CT_JWT = process.env.CT_JWT;

// Middleware CORS para permitir peticiones externas (como Google Sheets)
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

    // Llamada a la API de expansiones
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

    // Ver si la respuesta es un array directo o un objeto { data: [...] }
    const expansiones = Array.isArray(data) ? data : data.data;

    console.log("📦 Número de expansiones:", expansiones.length);
    console.log("🔎 Slugs disponibles:");
    expansiones.forEach(e => {
      console.log(`- ${e.slug} → ${e.name}`);
    });

    // Buscar expansión por slug
    const expansionObj = expansiones.find(e => e.slug === expansion.toLowerCase());

    if (!expansionObj) {
      console.log("❓ No se encontró la expansión:", expansion);
      return res.status(404).json({ error: "Expansión no encontrada", expansion });
    }

    console.log("✅ Expansión encontrada:", expansionObj.name, "ID:", expansionObj.id);

    // Devolver resultado de prueba
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
