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

    // Paso 1: Obtener todas las expansiones
    const expRes = await fetch("https://api.cardtrader.com/api/v2/expansions", {
      headers: { Authorization: `Bearer ${CT_JWT}` }
    });
    const expData = await expRes.json();
    const expansiones = Array.isArray(expData) ? expData : expData.data;

    const expansionObj = expansiones.find(e =>
      e.code?.toLowerCase() === expansion.toLowerCase()
    );

    if (!expansionObj) {
      return res.status(404).json({ error: "Expansión no encontrada", expansion });
    }

    const expansion_id = expansionObj.id;
    console.log("✅ Expansión encontrada:", expansionObj.name, `(ID: ${expansion_id})`);

    // Paso 2: Buscar la carta en la expansión por nombre
    const searchRes = await fetch(
      `https://api.cardtrader.com/api/v2/cards/search?expansion_id=${expansion_id}&q=${encodeURIComponent(carta)}`,
      {
        headers: { Authorization: `Bearer ${CT_JWT}` }
      }
    );

    const searchData = await searchRes.json();
    const cartas = Array.isArray(searchData) ? searchData : searchData.data;

    if (!cartas || cartas.length === 0) {
      return res.status(404).json({ error: "Carta no encontrada en esta expansión", carta });
    }

    const cartaObj = cartas[0];
    const blueprint_id = cartaObj.blueprint_id;
    console.log("✅ Carta encontrada:", cartaObj.name, `(Blueprint ID: ${blueprint_id})`);

    // Paso 3: Obtener productos CT0
    const productRes = await fetch(
      `https://api.cardtrader.com/api/v2/blueprints/${blueprint_id}/products`,
      {
        headers: { Authorization: `Bearer ${CT_JWT}` }
      }
    );

    const productData = await productRes.json();
    const productos = Array.isArray(productData) ? productData : productData.data;

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
