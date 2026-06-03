import http from "node:http";

// ---- Configuration ----

const PROXY_PORT = parseInt(process.env.PORT || "3001", 10);
let ironclawUrl = process.env.IRONCLAW_URL || "http://127.0.0.1:3000";
let ironclawToken =
  process.env.IRONCLAW_TOKEN ||
  "eafdeb7893f54f4d27e246231e290e82139c500f9c03533ffbaf343dab807c06";
let ironclawChannel = process.env.IRONCLAW_CHANNEL || "beesbury";

// ---- Helpers ----

function jsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// ---- Routes ----

async function handleIronclaw(req, res) {
  let body;
  try {
    body = await jsonBody(req);
  } catch {
    return send(res, 400, { error: "Invalid JSON body" });
  }

  if (!body.message || typeof body.message !== "string") {
    return send(res, 400, { error: "message field is required" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const upstream = await fetch(ironclawUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ironclawToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: body.message,
        channel: ironclawChannel,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await upstream.json().catch(() => ({}));
    send(res, upstream.status, data);
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      send(res, 504, { error: "IronClaw agent timed out" });
    } else if (err.code === "ECONNREFUSED") {
      send(res, 502, { error: "IronClaw agent unreachable" });
    } else {
      send(res, 502, { error: err.message || "Gateway error" });
    }
  }
}

async function handleAdminToken(req, res) {
  let body;
  try {
    body = await jsonBody(req);
  } catch {
    return send(res, 400, { error: "Invalid JSON body" });
  }

  if (!body.token || typeof body.token !== "string") {
    return send(res, 400, { error: "token field is required" });
  }

  ironclawToken = body.token;
  send(res, 200, { ok: true });
}

async function handleAdminUrl(req, res) {
  let body;
  try {
    body = await jsonBody(req);
  } catch {
    return send(res, 400, { error: "Invalid JSON body" });
  }

  if (!body.url || typeof body.url !== "string") {
    return send(res, 400, { error: "url field is required" });
  }

  ironclawUrl = body.url;
  send(res, 200, { ok: true });
}

async function handleAdminChannel(req, res) {
  let body;
  try {
    body = await jsonBody(req);
  } catch {
    return send(res, 400, { error: "Invalid JSON body" });
  }

  if (!body.channel || typeof body.channel !== "string") {
    return send(res, 400, { error: "channel field is required" });
  }

  ironclawChannel = body.channel;
  send(res, 200, { ok: true });
}

async function handleAdminStatus(req, res) {
  let healthy = false;
  try {
    const upstream = await fetch(ironclawUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ironclawToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "ping", channel: ironclawChannel }),
      signal: AbortSignal.timeout(5000),
    });
    healthy = upstream.status < 500;
  } catch {
    // not healthy
  }

  send(res, 200, {
    configured: !!ironclawToken,
    healthy,
    url: ironclawUrl,
    channel: ironclawChannel,
    lastChecked: Date.now(),
  });
}

// ---- Router ----

const routes = {
  "POST /ironclaw": handleIronclaw,
  "POST /admin/token": handleAdminToken,
  "POST /admin/url": handleAdminUrl,
  "POST /admin/channel": handleAdminChannel,
  "GET /admin/status": handleAdminStatus,
};

const server = http.createServer((req, res) => {
  const key = `${req.method} ${req.url}`;
  const handler = routes[key];
  if (handler) {
    handler(req, res);
  } else {
    send(res, 404, { error: "Not found" });
  }
});

server.listen(PROXY_PORT, () => {
  console.log(`[proxy] listening on :${PROXY_PORT}`);
  console.log(`[proxy] forwarding to IronClaw at ${ironclawUrl}`);
  console.log(`[proxy] channel: ${ironclawChannel}`);
  console.log(`[proxy] token configured: ${!!ironclawToken}`);
});
