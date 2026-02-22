import express from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { AccessToken } from "livekit-server-sdk";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { executeToolCall } from "../services/toolService.js";

const router = express.Router();

// Project root — one level up from backend/
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..", "..");

// Track running agent processes: roomName → ChildProcess
const agentProcesses = new Map();

// ── Auth middleware ──
const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer")) {
    return res.status(401).json({ message: "Not authorized" });
  }
  try {
    const decoded = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    next();
  } catch {
    return res.status(401).json({ message: "Not authorized" });
  }
};

// ── Spawn the Python agent and wait for it to be ready ──
function spawnAgent(roomName) {
  return new Promise((resolve, reject) => {
    const proc = spawn("python", ["agent.py", "dev"], {
      cwd: PROJECT_ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    agentProcesses.set(roomName, proc);

    let ready = false;

    const onData = (data) => {
      const line = data.toString();
      console.log(`[agent] ${line.trim()}`);
      // Agent is ready once it starts listening for jobs
      if (!ready && (line.includes("connected") || line.includes("Starting") || line.includes("worker"))) {
        ready = true;
        resolve(proc);
      }
    };

    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);

    proc.on("error", (err) => {
      agentProcesses.delete(roomName);
      reject(err);
    });

    proc.on("exit", (code) => {
      agentProcesses.delete(roomName);
      console.log(`[agent] process exited with code ${code}`);
    });

    // Resolve after 3s max — agent should be ready by then
    setTimeout(() => {
      if (!ready) {
        ready = true;
        resolve(proc);
      }
    }, 3000);
  });
}

// POST /api/voice/token — start agent + return LiveKit token
router.post("/token", protect, async (req, res) => {
  try {
    const roomName = `smartq-voice-${req.user._id}-${Date.now()}`;

    // Kill any existing agent for this user before starting a new one
    for (const [room, proc] of agentProcesses.entries()) {
      if (room.startsWith(`smartq-voice-${req.user._id}`)) {
        proc.kill();
        agentProcesses.delete(room);
      }
    }

    // Spawn agent (resolves when ready or after 3s)
    await spawnAgent(roomName);

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: req.user._id.toString(),
        name: req.user.name || "User",
      }
    );

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    res.json({ token, roomName, serverUrl: process.env.LIVEKIT_URL });
  } catch (err) {
    console.error("LiveKit token error:", err);
    res.status(500).json({ message: "Failed to start voice call" });
  }
});

// POST /api/voice/end — kill the agent process for a room
router.post("/end", protect, async (req, res) => {
  const { roomName } = req.body;
  if (roomName && agentProcesses.has(roomName)) {
    agentProcesses.get(roomName).kill();
    agentProcesses.delete(roomName);
    console.log(`[agent] stopped for room ${roomName}`);
  }
  res.json({ message: "Call ended" });
});

// POST /api/voice/agent-query — Python agent calls this for tool execution
router.post("/agent-query", async (req, res) => {
  const secret = req.headers["x-agent-secret"];
  if (!secret || secret !== process.env.AGENT_SECRET) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { action, params, userId } = req.body;
  if (!action) return res.status(400).json({ message: "action is required" });

  try {
    const result = await executeToolCall(action, params || {}, userId || null);
    res.json(result);
  } catch (err) {
    console.error("Agent tool query error:", err);
    res.status(500).json({ error: "Tool execution failed" });
  }
});

export default router;
