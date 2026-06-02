import type { APIRoute } from "astro";

export const prerender = false;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export const POST: APIRoute = async ({ request }) => {
  let data: Record<string, string>;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  const { name, email, subject, message, company } = data;
  if (company) return json({ ok: true }); // honeypot tripped — silently accept
  if (!name || !email || !message) return json({ ok: false, error: "Please complete the required fields." }, 400);

  const key = import.meta.env.RESEND_API_KEY;
  const to = import.meta.env.CONTACT_TO || "info@juma.org";
  const from = import.meta.env.CONTACT_FROM || "Juma Website <website@juma.org>";

  if (!key) {
    if (import.meta.env.DEV) {
      console.log("[contact:dev] (no RESEND_API_KEY) would email:", { to, name, email, subject, message });
      return json({ ok: true, dev: true });
    }
    return json({ ok: false, error: "Email is not configured yet." }, 503);
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `[Juma website] ${subject || "New message"} — ${name}`,
      text: `From: ${name} <${email}>\nSubject: ${subject || "(none)"}\n\n${message}`,
    });
    return json({ ok: true });
  } catch (e) {
    console.error("contact send failed", e);
    return json({ ok: false, error: "Something went wrong sending your message." }, 500);
  }
};
