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
    // Paso 1: Obtener la lista de expansiones
    const expansionRes = await fetch("https://api.cardtrader.com/api/v2/expansions", {
      headers: {
        Authorization: `Bearer ${CT_JWT}`
      }
    });

    const data = await expansionRes.json();

    // Paso 2: Buscar expansión por slug (nombre en minúscula y con guiones)
    const expansionObj = data.find((e) => e.slug === expansion.toLowerCase());

    if (!expansionObj) {
      return res.status(404).json({ error: "Expansión no encontrada", expansion });
    }

    return res.json({
      expansionSolicitada: expansion,
      expansionEncontrada: expansionObj.name,
      expansion_id: expansionObj.id
    });

  } catch (error) {
    console.error("Error al buscar expansión:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});
