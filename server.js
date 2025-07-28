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
    console.log("🔍 Buscando expansión con código:", expansion);

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
    console.log("✅ Expansión encontrada:", expansionObj.name, "(ID:", expansion_id, ")");

    // 2. Buscar blueprint_id de la carta
    const searchUrl = `https://api.cardtrader.com/api/v2/cards/search?expansion_id=${expansion_id}&q=${encodeURIComponent(carta)}`;
    const cartaRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${CT_JWT}` }
    });
    const cartaData = await cartaRes.json();
    const cartas = Array.isArray(cartaData) ? cartaData : cartaData.data;

    const cartaObj = cartas.find(c => c.name.toLowerCase() === carta.toLowerCase());

    if (!cartaObj) {
      return res.status(404).json({ error: "Carta no encontrada", carta });
    }

    const blueprint_id = cartaObj.blueprint_id;
    console.log("✅ Carta encontrada:", cartaObj.name, "(Blueprint ID:", blueprint_id, ")");

    // 3. Buscar productos en el marketplace filtrando por CT0
    const marketUrl = `https://api.cardtrader.com/api/v2/marketplace/products?blueprint_id=${blueprint_id}`;
    const marketRes = await fetch(marketUrl, {
      headers: { Authorization: `Bearer ${CT_JWT}` }
    });
    const marketData = await marketRes.json();
    const productos = Array.isArray(marketData) ? marketData : marketData.data;

    const ct0 = productos.filter(p => p.via_cardtrader_zero === true);

    if (ct0.length === 0) {
      return res.json({ precio_minimo: null, mensaje: "No hay ofertas CT0 para esta carta." });
    }

    const precios = ct0.map(p => p.price);
    const precioMin = Math.min(...precios);

    console.log("💰 Precio mínimo CT0:", precioMin);

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
