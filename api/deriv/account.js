export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const token = process.env.DERIV_API_TOKEN;
  const appId = process.env.DERIV_APP_ID;
  if (!appId) {
    return res.status(503).json({ ok: false, error: "Deriv App ID is not configured" });
  }
  if (!token) {
    return res.status(503).json({ ok: false, error: "Deriv server token is not configured" });
  }

  if (typeof WebSocket === "undefined") {
    return res.status(503).json({ ok: false, error: "This server runtime does not support WebSocket" });
  }

  let socket;
  try {
    const account = await new Promise((resolve, reject) => {
      let settled = false;
      const finish = (err, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try { socket?.close(); } catch {}
        err ? reject(err) : resolve(value);
      };

      const timer = setTimeout(() => finish(new Error("Deriv connection timed out")), 12000);
      socket = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(appId)}`);

      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ authorize: token }));
      });

      socket.addEventListener("message", (event) => {
        let data;
        try { data = JSON.parse(event.data); } catch {
          return finish(new Error("Invalid response from Deriv"));
        }

        if (data.error) {
          return finish(new Error(data.error.message || "Deriv rejected the authorisation"));
        }

        if (data.msg_type === "authorize" && data.authorize) {
          const a = data.authorize;
          return finish(null, {
            loginid: a.loginid || null,
            currency: a.currency || null,
            is_virtual: Boolean(a.is_virtual),
            landing_company_name: a.landing_company_name || null,
            account_type: a.is_virtual ? "demo" : "real"
          });
        }
      });

      socket.addEventListener("error", () => finish(new Error("Could not connect to Deriv")));
      socket.addEventListener("close", () => {
        if (!settled) finish(new Error("Deriv closed the connection before authorisation completed"));
      });
    });

    return res.status(200).json({ ok: true, account });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: error?.message || "Deriv account verification failed"
    });
  }
}
