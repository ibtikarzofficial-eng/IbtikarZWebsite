const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  }
});

const clean = (value, max = 5000) => String(value ?? "")
  .replace(/[\u0000-\u001F\u007F]/g, " ")
  .trim()
  .slice(0, max);

async function verifyTurnstile(secret, token, ip) {
  if (!secret) return { success: true, skipped: true };
  if (!token) return { success: false };

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body
  });
  return response.json();
}

async function handleLead(request, env, ctx) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const contentType = request.headers.get("content-type") || "";
    let body;

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      body = Object.fromEntries((await request.formData()).entries());
    }

    // Honeypot: bots get a success-looking response without storing anything.
    if (clean(body.company_fax, 200)) return json({ ok: true });

    const name = clean(body.name, 120);
    const email = clean(body.email, 180);
    const website = clean(body.website, 400);
    const details = clean(body.project_details, 6000);

    if (!name || !email || !/^\S+@\S+\.\S+$/.test(email) || !details) {
      return json({ error: "Please complete the required fields." }, 400);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "";
    const turnstile = await verifyTurnstile(
      env.TURNSTILE_SECRET_KEY,
      clean(body["cf-turnstile-response"], 2200),
      ip
    );

    if (!turnstile.success) {
      return json({ error: "Human verification failed. Please retry." }, 400);
    }

    const lead = {
      id: clean(body.lead_id, 100) || crypto.randomUUID(),
      created_at: new Date().toISOString(),
      name,
      email,
      website,
      service: clean(body.service, 180) || clean(body.lead_type, 180),
      budget: clean(body.budget, 120),
      timeline: clean(body.timeline, 120),
      details,
      landing_page: clean(body.landing_page, 700),
      conversion_page: clean(body.conversion_page, 700),
      referrer: clean(body.referrer, 700),
      utm_source: clean(body.utm_source, 200),
      utm_medium: clean(body.utm_medium, 200),
      utm_campaign: clean(body.utm_campaign, 200),
      utm_term: clean(body.utm_term, 200),
      utm_content: clean(body.utm_content, 200),
      country: request.cf?.country || "",
      user_agent: clean(request.headers.get("user-agent"), 500)
    };

    if (env.LEADS_DB) {
      await env.LEADS_DB.prepare(`
        INSERT INTO leads (
          id, created_at, name, email, website, service, budget, timeline, details,
          landing_page, conversion_page, referrer, utm_source, utm_medium,
          utm_campaign, utm_term, utm_content, country, user_agent
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).bind(
        lead.id, lead.created_at, lead.name, lead.email, lead.website,
        lead.service, lead.budget, lead.timeline, lead.details,
        lead.landing_page, lead.conversion_page, lead.referrer,
        lead.utm_source, lead.utm_medium, lead.utm_campaign, lead.utm_term,
        lead.utm_content, lead.country, lead.user_agent
      ).run();
    }

    if (env.RESEND_API_KEY) {
      const text = `New IbtikarZ lead\n\nName: ${lead.name}\nEmail: ${lead.email}\nWebsite: ${lead.website}\nService: ${lead.service}\nBudget: ${lead.budget}\nTimeline: ${lead.timeline}\nCountry: ${lead.country}\n\nDetails:\n${lead.details}\n\nLanding: ${lead.landing_page}\nReferrer: ${lead.referrer}\nUTM source: ${lead.utm_source}\nUTM campaign: ${lead.utm_campaign}\nLead ID: ${lead.id}`;

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: env.LEAD_FROM_EMAIL || "IbtikarZ Leads <leads@ibtikarz.com>",
          to: [env.LEAD_TO_EMAIL || "abdullah@ibtikarz.com"],
          reply_to: lead.email,
          subject: `New IbtikarZ lead — ${lead.service || "website enquiry"}`,
          text
        })
      });

      if (!emailResponse.ok) {
        console.error("Resend failed", emailResponse.status, await emailResponse.text());
      }
    }

    if (env.LEAD_WEBHOOK_URL) {
      ctx.waitUntil(fetch(env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead)
      }));
    }

    if (!env.LEADS_DB && !env.RESEND_API_KEY && !env.LEAD_WEBHOOK_URL) {
      return json({ error: "Lead backend is not configured yet." }, 503);
    }

    return json({ ok: true, lead_id: lead.id });
  } catch (error) {
    console.error("Lead submission failed", error);
    return json({ error: "Could not submit this request right now." }, 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/lead" || url.pathname === "/api/lead/") {
      return handleLead(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  }
};
