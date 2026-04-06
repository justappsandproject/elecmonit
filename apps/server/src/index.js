import "dotenv/config";
import http from "http";
import cors from "cors";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { Server } from "socket.io";
import { submissions, tally, applyResultToTally } from "./data/store.js";
import { extractElectionResultFromImage } from "./services/ocrService.js";

const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",")
  : ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"]
).map((item) => item.trim());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

app.use(
  cors({
    origin: allowedOrigins
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/submissions", (_req, res) => {
  res.json({ submissions });
});

app.get("/api/tally", (_req, res) => {
  res.json({ tally });
});

app.post("/api/submissions", (req, res) => {
  const {
    agentName,
    state,
    ward,
    localGovernment,
    pollingUnitCode,
    electionType,
    electionCycle,
    imageUrl,
    imageBase64,
    mediaType,
    imagePreview
  } = req.body || {};
  if (!agentName || !state || !pollingUnitCode || (!imageUrl && !imageBase64)) {
    return res.status(400).json({ error: "Missing required fields. Provide imageUrl or imageBase64." });
  }

  const submission = {
    id: uuidv4(),
    agentName,
    state,
    ward: ward || "",
    localGovernment: localGovernment || "Unspecified LGA",
    pollingUnitCode,
    electionType: electionType || "UNSPECIFIED",
    electionCycle: electionCycle || "2027 General Election",
    imageUrl: imageUrl || null,
    imageBase64: imageBase64 || null,
    mediaType: mediaType || null,
    imagePreview: imagePreview || imageUrl || null,
    createdAt: new Date().toISOString(),
    status: "pending_ocr",
    ocrResult: null
  };

  submissions.unshift(submission);
  io.emit("submission:created", submission);

  return res.status(201).json({ submission });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const adminUser = process.env.ADMIN_USER || "admin";
  const adminPass = process.env.ADMIN_PASS || "password123";
  if (username !== adminUser || password !== adminPass) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = Buffer.from(`${username}:${Date.now()}`).toString("base64");
  return res.json({
    token,
    user: {
      name: username,
      role: "admin"
    }
  });
});

app.post("/api/submissions/:id/process-ocr", async (req, res) => {
  const { id } = req.params;
  const submission = submissions.find((item) => item.id === id);

  if (!submission) {
    return res.status(404).json({ error: "Submission not found" });
  }

  try {
    const ocrResult = await extractElectionResultFromImage({
      imageUrl: submission.imageUrl,
      imageBase64: submission.imageBase64,
      mediaType: submission.mediaType,
      pollingUnitCode: submission.pollingUnitCode,
      state: submission.state
    });
    submission.status = "processed";
    submission.ocrResult = ocrResult;
    submission.processedAt = new Date().toISOString();

    applyResultToTally(ocrResult);

    io.emit("submission:processed", submission);
    io.emit("tally:updated", tally);

    return res.json({ submission, tally });
  } catch (error) {
    submission.status = "ocr_error";
    submission.ocrError = error.message;
    io.emit("submission:error", submission);
    return res.status(500).json({ error: "OCR processing failed", details: error.message });
  }
});

io.on("connection", (socket) => {
  socket.emit("bootstrap", { submissions, tally });
});

const PORT = Number(process.env.PORT || 4000);
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
