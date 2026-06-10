import { useState } from "react";

type Status = "idle" | "sending" | "ok" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (res.ok && body.ok) {
        setStatus("ok");
        form.reset();
      } else {
        setStatus("error");
        setError(body.error || "Something went wrong. Please email us directly.");
      }
    } catch {
      setStatus("error");
      setError("Network error. Please email us directly.");
    }
  }

  if (status === "ok") {
    return (
      <div className="rounded-[var(--radius-card)] border border-brand-200 bg-brand-50 p-8 text-center">
        <p className="font-heading text-xl font-bold text-brand-700">Thank you!</p>
        <p className="mt-2 text-ink-soft">Your message is on its way. We'll be in touch soon.</p>
      </div>
    );
  }

  const field = "w-full rounded-xl border border-navy-200 px-4 py-3 text-navy-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* honeypot */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-navy-800">Name *</span>
          <input required name="name" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-navy-800">Email *</span>
          <input required type="email" name="email" className={field} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-navy-800">Subject</span>
        <input name="subject" className={field} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-navy-800">Message *</span>
        <textarea required name="message" rows={6} className={field} />
      </label>
      {status === "error" && <p className="text-sm font-medium text-brand-700">{error}</p>}
      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex items-center justify-center rounded-[var(--radius-btn)] bg-brand-500 px-7 py-3 font-heading text-sm font-bold uppercase tracking-wide text-white transition hover:bg-brand-600 disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
