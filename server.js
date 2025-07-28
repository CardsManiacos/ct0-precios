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
    // 1. Obtener lista de expansiones
    const expRes = await fetch("https://api.cardtrader.com/api/v2/expansions", {
      headers: { Authorization: `Bearer ${CT_JWT}` }
    });
    const expData = await expRes.json();
    const expansiones = Array.isArray(expData) ? expData : expData.data;

    const expansionObj = expansiones.find(e => e.code?.toLowerCase() === expansion.toLowerCase());

    if (!expansionObj) {
      return res.status(404).json({ error: "Expansión no encontrada", expansion });
    }

    const expansion_id = expansionObj.id;

    // 2. Obtener todas las cartas de la expansión
    const cardsUrl = `https://api.cardtrader.com/api/v2/expansions/${expansion_id}/cards`;
    const cardsRes = await fetch(cardsUrl, {
      headers: { Authorization: `Bearer ${CT_JWT}` }
    });

    if (!cardsRes.ok) {
      const errorText = await cardsRes.text();
      throw new Error(`Error ${cardsRes.status}: ${errorText}`);
    }

    const cardsData = await cardsRes.json();
    const cartas = Array.isArray(cardsData) ? cardsData : cardsData.data;

    // 3. Buscar la carta exacta por nombre (case-insensitive)
    const cartaObj = cartas.find(c => c.name.toLowerCase() === carta.toLowerCase());

    if (!cartaObj) {
      return res.status(404).json({ error: "Carta no encontrada en esta expansión", carta });
    }

    const blueprint_id = cartaObj.blueprint_id;

    // 4. Buscar productos del blueprint en el marketplace
    const marketUrl = `https://api.cardtrader.com/api/v2/marketplace/products?blueprint_id=${blueprint_id}`;
    const marketRes = await fetch(marketUrl, {
      headers: { Authorization: `Bearer ${CT_JWT}` }
    });
    const marketData = await marketRes.json();
    const productos = Array.isArray(marketData) ? marketData : marketData.data;

    // 5. Filtrar solo CardTrader Zero
    const ct0 = productos.filter(p => p.via_cardtrader_zero === true);

    if (ct0.length === 0) {
      return res.json({
        carta: cartaObj.name,
        expansion: expansionObj.name,
        precio_minimo_ct0: null,
        mensaje: "No hay productos vía CardTrader Zero"
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
