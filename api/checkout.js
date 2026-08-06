/* Creates a Stripe Checkout session for an interview-credit pack and hands
 * back the hosted checkout URL. The browser never sees or handles a card:
 * it is redirected to Stripe's own page, and Stripe redirects back to the
 * app afterwards. The only secret is server-side:
 *   STRIPE_SECRET_KEY   your secret key from https://dashboard.stripe.com
 *   SITE_ORIGIN         optional, e.g. https://yourdomain.com (otherwise the
 *                       request's own host is used, which is fine on Vercel)
 *
 * Prices live here, not in the browser, so a tampered request cannot change
 * what is charged. Amounts are in pence.
 */
const PACKS = {
  single: { credits: 1, amount: 149, name: "1 interview credit" },
  five: { credits: 5, amount: 599, name: "5 interview credits" },
  fifteen: { credits: 15, amount: 1499, name: "15 interview credits" },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    res.status(503).json({ error: "not_configured" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const pack = PACKS[(body && body.pack) || ""];
  if (!pack) {
    res.status(400).json({ error: "Unknown pack." });
    return;
  }

  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = process.env.SITE_ORIGIN || `${proto}://${host}`;

  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", `${origin}/app/?iv_session={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url", `${origin}/app/?iv_cancel=1`);
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", "gbp");
  form.set("line_items[0][price_data][unit_amount]", String(pack.amount));
  form.set("line_items[0][price_data][product_data][name]", pack.name);
  form.set("line_items[0][price_data][product_data][description]", "Tempo live interview simulator");
  form.set("metadata[credits]", String(pack.credits));
  form.set("metadata[pack]", body.pack);

  try {
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.url) {
      console.error("checkout create failed", r.status, JSON.stringify(data).slice(0, 300));
      res.status(502).json({ error: "Could not start checkout. Please try again." });
      return;
    }
    res.status(200).json({ url: data.url });
  } catch (e) {
    console.error("checkout error", e);
    res.status(502).json({ error: "Could not start checkout. Please try again." });
  }
}
