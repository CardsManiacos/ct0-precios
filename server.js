const express = require("express");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 3000;

const CT_JWT = process.env.CT_JWT;

// Middleware para permitir llamadas desde cualquier origen (para usar desde Google Sheets, etc.)
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
    console.log("Petición recibida con carta:", carta, "y expansión:", expansion);

    // Paso 1: Obtener lista de expansiones
    const expansionRes = await fetch("https://api.cardtrader.com/api/v2/expansions", {
      headers: {
        Authorization: `Bearer ${CT_JWT}`
      }
    });

    if (!expansionRes.ok) {
      throw new Error(`Error al obtener expansiones: ${expansionRes.status}`);
    }

    const data = await expansionRes.json();
    console.log("Número de expansiones recibidas:", data.length);

    // Paso 2: Buscar expansión por slug
    const expansionObj = data.find((e) => e.slug === expansion.toLowerCase());

    if (!expansionObj) {
      console.log("No se encontró la expansión:", expansion);
      return res.status(404).json({ error: "Expansión no encontrada", expansion });
    }

    console.log("Expansión encontrada:", expansionObj.name, "ID:", expansionObj.id);

    // Devolver solo la info de la expansión de momento
    return res.json({
      expansionSolicitada: expansion,
      expansionEncontrada: expansionObj.name,
      expansion_id: expansionObj.id
    });

  } catch (error) {
    console.error("Error al buscar expansión:", error.message);
    return res.status(500).json({ error: "Error interno del servidor", detalle: error.message });
  }
});

// Arrancar el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
