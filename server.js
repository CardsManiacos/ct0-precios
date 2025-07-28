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

    return res.json({
      expansion_code: expansion,
      expansion_name: expansionObj.name,
      expansion_id: expansionObj.id
    });

  } catch (error) {
    console.error("🔥 Error interno:", error.message);
    return res.status(500).json({ error: "Error interno del servidor", detalle: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});
