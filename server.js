const express = require("express");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 3000;

const CT_JWT = process.env.CT_JWT;

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
    console.log("📨 Petición recibida:");
    console.log("→ Carta:", carta);
    console.log("→ Código de expansión:", expansion);

    // Buscar expansión por code
    const expansionRes = await fetch("https://api.cardtrader.com/api/v2/expansions", {
      headers: {
        Authorization: `Bearer ${CT_JWT}`
      }
    });

    const data = await expansionRes.json();
    const expansiones = Array.isArray(data) ? data : data.data;
    const expansionObj = expansiones.find(e => e.code?.toLowerCase() === expansion.toLowerCase());

    if (!expansionObj) {
      return res.status(404).json({ error: "Expansión no encontrada", expansion });
    }

    console.log("✅ Expansión encontrada:", expansionObj.name, "ID:", expansionObj.id);

    // Ahora buscamos la carta dentro de la expansión usando el nuevo endpoint correcto
    const cardsRes = await fetch(
      `https://api.cardtrader.com/api/v2/expansions/${expansionObj.id}/cards`,
      {
        headers: {
          Authorization: `Bearer ${CT_JWT}`
        }
      }
    );

    const cardData = await cardsRes.json();
    const cartas = cardData.data || cardData;

    const cartaObj = cartas.find(c =>
      c.name.toLowerCase().replace(/[^a-z0-9]/g, "") ===
      carta.toLowerCase().replace(/[^a-z0-9]/g, "")
    );

    if (!cartaObj) {
      return res.status(404).json({ error: "Carta no encontrada", carta });
    }

    return res.json({
      expansion_id: expansionObj.id,
      expansion_code: expansionObj.code,
      expansion_name: expansionObj.name,
      carta: cartaObj.name,
      blueprint_id: cartaObj.blueprint_id
    });

  } catch (error) {
    console.error("🔥 Error interno:", error.message);
    return res.status(500).json({ error: "Error interno del servidor", detalle: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});
