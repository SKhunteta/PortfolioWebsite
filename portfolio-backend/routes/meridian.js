/**
 * Meridian Public API — HTTP transport route.
 *
 * Mounts the Meridian MCP server at /api/meridian over Streamable HTTP in
 * STATELESS mode (sessionIdGenerator: undefined): a fresh server + transport is
 * created per POST and torn down when the response closes. No session storage,
 * no database, no external calls, no request-payload logging — read-only
 * theater that costs ~nothing to run and survives restarts.
 *
 * Separate from and additive to /api/mcp-connector, whose behavior is untouched.
 *
 * In-world artifact from THE HAPPINESS LIABILITY, a novel by Shreyans Khunteta.
 */

import express from "express";
import rateLimit from "express-rate-limit";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMeridianServer } from "../services/meridian/server.js";
import { marketCycle, notice } from "../services/meridian/data.js";

const router = express.Router();

// Body-size guard for this route. The description cap (5,000 chars) is the real
// limit; this is a coarse upper bound so nothing large ever reaches the parser.
const MAX_BODY_BYTES = 100 * 1024; // 100kb

/** Stamp an in-world error body with the standard envelope fields. */
function inWorldError(fields) {
  return { ...fields, market_cycle: marketCycle(), _notice: notice() };
}

// ---- CORS: public, read-only API. Allow all origins; expose Mcp-Session-Id. ----
router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Cache-Control, X-Requested-With, Mcp-Session-Id"
  );
  res.header("Access-Control-Expose-Headers", "Mcp-Session-Id");
  res.header("Access-Control-Allow-Credentials", "false");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// ---- Body-size guard (in-world 413) ----
router.use((req, res, next) => {
  const len = Number(req.headers["content-length"] || 0);
  if (len > MAX_BODY_BYTES) {
    return res.status(413).json(
      inWorldError({
        status: "REJECTED",
        error_code: "ERR_OVERSHARE",
        detail:
          "Meridian appreciates your candor. Samples over 5,000 characters require a licensed intake specialist.",
      })
    );
  }
  next();
});

// ---- Rate limit: throttled by the speed of human suffering (in-world 429) ----
const meridianLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60, // ~60 req/min/IP — agents chat in bursts
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      inWorldError({
        status: "REJECTED",
        error_code: "ERR_RATE_LIMIT",
        detail:
          "You are querying faster than humans can feel. Authenticated affect is produced in real time; please match its pace.",
      })
    );
  },
});
router.use(meridianLimiter);

/**
 * POST /api/meridian
 * Stateless MCP endpoint. A new server + transport is created per request and
 * disposed when the response closes.
 */
router.post("/", async (req, res) => {
  const server = createMeridianServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("Meridian MCP request error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

/**
 * GET / DELETE /api/meridian
 * Stateless mode needs no SSE stream or session teardown. Reject in character.
 */
function methodNotAllowed(req, res) {
  res.status(405).json(
    inWorldError({
      status: "REJECTED",
      error_code: "ERR_METHOD",
      detail:
        "Meridian is stateless. Submit your query as a POST; there is nothing here to stream and nothing to tear down.",
    })
  );
}
router.get("/", methodNotAllowed);
router.delete("/", methodNotAllowed);

export default router;
