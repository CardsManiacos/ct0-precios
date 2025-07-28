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
    return res.status(400).json({ error: "Faltan parámetros" });
  }

  try {
    console.log("📨 Petición recibida:");
    console.log("→ Carta:", carta);
    console.log("→ Expansión:", expansion);
    console.log("→ JWT usado:", CT_JWT.slice(0, 30) + "...");

    // Paso 1: obtener lista de expansiones
    const expansionsRes = await fetch("https://api.cardtrader.com/api/v2/expansions", {
      headers: {
        Authorization: `Bearer ${CT_JWT}`
      }
    });

    if (!expansionsRes.ok) {
      throw new Error("Error al obtener expansiones");
    }

    const json = await expansionsRes.json();
    const list = json.data || json;

    const expansionObj = list.find(
      e => e.slug === expansion.toLowerCase()
    );

    if (!expansionObj) {
      return res.status(404).json({
        error: "Expansión no encontrada",
        expansion
      });
    }

    const expansion_id = expansionObj.id;
    console.log("✅ ID de expansión encontrado:", expansion_id);

    // Paso 2: buscar carta
    const cardRes = await fetch(
      `https://api.cardtrader.com/api/v2/cards/search?expansion_id=${expansion_id}&q=${encodeURIComponent(carta)}`,
      {
        headers: {
          Authorization: `Bearer ${CT_JWT}`
        }
      }
    );

    if (!cardRes.ok) {
      throw new Error(`Error al buscar carta: ${cardRes.status}`);
    }

    const cardJson = await cardRes.json();
    const cards = cardJson.data || cardJson;

    if (!cards.length) {
      return res.status(404).json({
        error: "Carta no encontrada",
        expansion_id,
        carta
      });
    }

    const cartaEncontrada = cards[0];

    return res.json({
      expansion_id,
      carta: cartaEncontrada.name,
      blueprint_id: cartaEncontrada.blueprint_id
    });

  } catch (err) {
    console.error("🔥 Error:", err);
    return res.status(500).json({
      error: "Error interno",
      detalle: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});
