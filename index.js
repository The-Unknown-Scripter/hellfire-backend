import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();
app.use(express.json());

/* Sesiones activas */
const sessions = new Map();

/* ===============================
   CREAR URL SEGURA (SOLO ROBLOX)
   =============================== */
app.post("/create-url", async (req, res) => {
  const { token } = req.body;

  /* 🔒 BLOQUEO DE EXTERNOS */
  if (token !== process.env.SECRET_TOKEN) {
    console.log("🚨 INTENTO EXTERNO BLOQUEADO");
    console.log("IP:", req.headers["x-forwarded-for"] || req.socket.remoteAddress);
    console.log("Body:", req.body);

    return res.status(403).json({
      error: "Forbidden"
    });
  }

  const sessionId = crypto.randomUUID();

  sessions.set(sessionId, {
    created: Date.now()
  });

  res.json({
    success: true,
    url: `${req.protocol}://${req.get("host")}/session/${sessionId}`
  });
});

/* ===============================
   ROBLOX MANDA EL WEBHOOK AQUÍ
   =============================== */
app.post("/session/:id", async (req, res) => {
  if (!sessions.has(req.params.id)) {
    console.log("⚠️ Session inválida:", req.params.id);
    return res.sendStatus(404);
  }

  try {
    const response = await fetch(process.env.DISCORD_WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      console.log("Error enviando webhook a Discord");
      console.log(await response.text());
      return res.sendStatus(500);
    }

    res.sendStatus(200);
  } catch (err) {
    console.log("Error interno:", err);
    res.sendStatus(500);
  }
});

/* ===============================
   HEARTBEAT
   =============================== */
app.get("/session/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.sendStatus(404);

  if (Date.now() - session.created > 15 * 60 * 1000) {
    sessions.delete(req.params.id);
    return res.sendStatus(404);
  }

  res.sendStatus(200);
});

/* ===============================
   CUALQUIER RUTA RARA = EXTERNO
   =============================== */
app.all("*", (req, res) => {
  console.log("REQUEST EXTERNO DETECTADO");
  console.log("Ruta:", req.originalUrl);
  console.log("IP:", req.headers["x-forwarded-for"] || req.socket.remoteAddress);
  console.log("Método:", req.method);

  res.status(404).send("Not Found");
});

app.listen(process.env.PORT, () => {
  console.log("Hellfire Backend activo");
});
