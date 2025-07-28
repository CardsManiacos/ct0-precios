const express = require("express");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 3000;

const CT_JWT = process.env.CT_JWT;

// Middleware CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/precioCT0", async (req, res) => {
  const { carta, expansion } = req.query;

  if (!carta || !expansion) {
    return res.status(400).json({ error: "Faltan parámetros: carta y expansion son obligatorios" });
  }

  try {
    console.log("📨 Petición recibida con:");
    console.log("Carta:", carta);
    console.log("Expansión:", expansion);
    console.log("JWT que estoy usando:", CT_JWT ? CT_JWT.slice(0, 30) + "..." : "undefined");

    // Petición a la API de CardTrader
    const expansionRes = await fetch("https://api.cardtrader.com/api/v2/expansions", {
      headers: {
        Authorization: `Bearer ${CT_JWT}`
      }
    });

    console.log("🔍 Status de respuesta de expansiones:", expansionRes.status);

    if (!expansionRes.ok) {
      const errorText = await expansionRes.text();
      console.log("❌ Error de CardTrader:", errorText);
      throw new Error(`Error de CardTrader: ${expansionRes.status}`);
    }

    const data = await expansionRes.json();
    console.log("📦 Número de expansiones recibidas:", data.length);

    // 🔎 MOSTRAR TODOS LOS SLUGS
    console.log("🔎 Slugs disponibles:");
    data.forEach(e => console.log(`- ${e.slug} → ${e.name}`));

    // Buscar expansión por slug exacto
    const expansionObj = data.find((e) => e.slug === expansion.toLowerCase());

    if (!expansionObj) {
      console.log("❓ No se encontró la expansión:", expansion);
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
