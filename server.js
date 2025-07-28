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

    // Obtener expansiones
    const expansionRes = await fetch("https://api.cardtrader.com/api/v2/expansions", {
      headers: {
        Authorization: `Bearer ${CT_JWT}`,
        Accept: "application/json"
      }
    });

    const data = await expansionRes.json();
    const expansiones = Array.isArray(data) ? data : data.data;
    const expansionObj = expansiones.find(e => e.code?.toLowerCase() === expansion.toLowerCase());

    if (!expansionObj) {
      return res.status(404).json({ error: "Expansión no encontrada", expansion });
    }

    console.log("✅ Expansión encontrada:", expansionObj.name, "ID:", expansionObj.id);

        // Paso 2: Buscar cartas de la expansión (forma segura)
    const cartasRes = await fetch(`https://api.cardtrader.com/api/v2/expansions/${expansionObj.id}/cards`, {
      headers: {
        Authorization: `Bearer ${CT_JWT}`,
        Accept: "application/json"
      }
    });

    if (!cartasRes.ok) {
      const text = await cartasRes.text();
      return res.status(500).json({
        error: "Respuesta inesperada al obtener cartas",
        detalle: text.slice(0, 200)
      });
    }

    const contentType = cartasRes.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await cartasRes.text();
      return res.status(500).json({
        error: "La respuesta no es JSON válida",
        detalle: text.slice(0, 200)
      });
    }

    let cartasData;
    try {
      cartasData = await cartasRes.json();
    } catch (e) {
      const text = await cartasRes.text();
      return res.status(500).json({
        error: "No se pudo parsear el JSON",
        detalle: text.slice(0, 200)
      });
    }

    const cartas = Array.isArray(cartasData) ? cartasData : cartasData.data ?? [];

    const cartaEncontrada = cartas.find(c =>
      c.name?.toLowerCase() === carta.toLowerCase() ||
      c.local_name?.toLowerCase() === carta.toLowerCase()
    );

    if (!cartaEncontrada) {
      return res.status(404).json({ error: "Carta no encontrada en esta expansión" });
    }

    return res.json({
      expansion_id: expansionObj.id,
      expansion_name: expansionObj.name,
      carta: cartaEncontrada
    });

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});
