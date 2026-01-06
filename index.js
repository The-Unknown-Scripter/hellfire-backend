import express from "express";
import dotenv from "dotenv";
import crypto from "crypto";
import { logMessage } from "./bot.js"; // 🔥 ESTO FALTABA

dotenv.config();

const app = express();
app.use(express.json());

const sessions = new Map();

/* ===============================
   CREAR URL SEGURA (SOLO ROBLOX)
   =============================== */
app.post("/create-url", async (req, res) => {
  const { token } = req.body;

  if (token !== process.env.SECRET_TOKEN) {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    console.log("🚨 INTENTO EXTERNO BLOQUEADO:", ip);

    await logMessage(
      process.env.SECURITY_CHANNEL_ID,
      `🚨 **INTENTO EXTERNO BLOQUEADO**
IP: \`${ip}\`
Ruta: /create-url
Body: \`${JSON.stringify(req.body)}\``
    );

    return res.status(403).json({ error: "Forbidden" });
  }

  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, { created: Date.now() });

  res.json({
    success: true,
    url: `${req.protocol}://${req.get("host")}/session/${sessionId}`
  });
});

/* ===============================
   ROBLOX ENVÍA WEBHOOK
   =============================== */
app.post("/session/:id", async (req, res) => {
  if (!sessions.has(req.params.id)) {
    return res.sendStatus(404);
  }

  try {
    const response = await fetch(process.env.DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      console.log("❌ Error webhook Discord");
      return res.sendStatus(500);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error interno:", err);
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
   CUALQUIER OTRA RUTA = ATAQUE
   =============================== */
app.all("*", async (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  console.log("🚨 REQUEST EXTERNO:", ip);

  await logMessage(
    process.env.SECURITY_CHANNEL_ID,
    `🚨 **REQUEST EXTERNO DETECTADO**
IP: \`${ip}\`
Ruta: \`${req.originalUrl}\`
Método: \`${req.method}\``
  );

  res.status(404).send("Not Found");
});

const PORT = process.env.PORT || 4167;
app.listen(PORT, () => {
  console.log(`🔥 Hellfire Backend activo en puerto ${PORT}`);
});
