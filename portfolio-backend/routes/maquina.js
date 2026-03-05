import express from "express";

const router = express.Router();

// La Máquina Bilingüe API proxy
// Forwards requests to the FastAPI ML service
const MAQUINA_API_URL = process.env.MAQUINA_API_URL || "http://localhost:8000";

// Generic proxy handler
async function proxyToMaquina(req, res) {
  const targetPath = req.originalUrl.replace("/api/maquina", "");
  const targetUrl = `${MAQUINA_API_URL}${targetPath}`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: { "Content-Type": "application/json" },
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error(`Maquina proxy error (${targetUrl}):`, error.message);
    res.status(502).json({
      error: "ML service unavailable",
      message: "La Máquina Bilingüe API is not responding. It may be starting up.",
    });
  }
}

// Route all methods through the proxy
router.all("/*", proxyToMaquina);

export default router;
