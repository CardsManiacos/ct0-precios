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
    return res.status(400).json({ error: "Faltan parámetros: carta y expansion" });
  }

  try {
    console.log("📨 Petición recibida:");
    console.log("→ Carta:", carta);
    console.log("→ Expansión:", expansion);
    console.log("→ JWT usado:", CT_JWT.slice(0, 30) + "...");

    // 1. Obtener todas las expansiones
    const expRes = await fetch("https://api.cardtrader.com/api/v2/expansions", {
      headers: { Authorization: `Bearer ${CT_JWT}` }
    });

    if (!expRes.ok) {
      throw new Error(`Error ${expRes.status}: ${await expRes.text()}`);
    }

    const expData = await expRes.json();
    const expansiones = Array.isArray(expData) ? expData : expData.data;
    const expansionObj = expansiones.find(e => e.code?.toLowerCase() === expansion.toLowerCase());

    if (!expansionObj) {
      return res.status(404).json({ error: "Expansión no encontrada", expansion });
    }

    const expansion_id = expansionObj.id;
    console.log("✅ Expansion encontrada:", expansionObj.name, `(ID: ${expansion_id})`);

    // 2. Obtener todas las cartas de esa expansión
    const cardsRes = await fetch(`https://api.cardtrader.com/api/v2/expansions/${expansion_id}/cards`, {
      headers: { Authorization: `Bearer ${CT_JWT}` }
    });

    if (!cardsRes.ok) {
      throw new Error(`Error ${cardsRes.status}: ${await cardsRes.text()}`);
    }

    const cardsData = await cardsRes.json();
    const cartas = Array.isArray(cardsData) ? cardsData : cardsData.data;

    // 3. Buscar la carta por nombre
    const cartaObj = cartas.find(c => c.name.toLowerCase() === carta.toLowerCase());

    if (!cartaObj) {
      return res.status(404).json({ error: "Carta no encontrada en esta expansión", carta });
    }

    const blueprint_id = cartaObj.blueprint_id;
    console.log("✅ Carta encontrada:", cartaObj.name, `(Blueprint ID: ${blueprint_id})`);

    // 4. Buscar productos de esa carta
    const marketRes = await fetch(
      `https://api.cardtrader.com/api/v2/marketplace/products?blueprint_id=${blueprint_id}`,
      {
        headers: { Authorization: `Bearer ${CT_JWT}` }
      }
    );

    if (!marketRes.ok) {
      throw new Error(`Error ${marketRes.status}: ${await marketRes.text()}`);
    }

    const marketData = await marketRes.json();
    const productos = Array.isArray(marketData) ? marketData : marketData.data;

    const ct0 = productos.filter(p => p.via_cardtrader_zero === true);

    if (ct0.length === 0) {
      return res.json({
        carta: cartaObj.name,
        expansion: expansionObj.name,
        precio_minimo_ct0: null,
        mensaje: "No hay productos CT0 disponibles"
      });
    }

    const precios = ct0.map(p => p.price);
    const precioMin = Math.min(...precios);

    return res.json({
      carta: cartaObj.name,
      expansion: expansionObj.name,
      precio_minimo_ct0: precioMin
    });

  } catch (error) {
    console.error("🔥 Error interno:", error.message);
    return res.status(500).json({ error: "Error interno", detalle: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});
