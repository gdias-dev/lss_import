/** Envio pelo Resend (API HTTP). Sem RESEND_API_KEY, em desenvolvimento o e-mail é impresso no terminal. */
export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
}

const DEFAULT_FROM = "LS Imports <onboarding@resend.dev>";

export async function sendEmail(email: OutgoingEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY não configurada");
    console.info(`\n[e-mail simulado] Para: ${email.to}\nAssunto: ${email.subject}\n${email.text}\n`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(email.idempotencyKey ? { "Idempotency-Key": email.idempotencyKey } : {}),
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || DEFAULT_FROM, to: [email.to], subject: email.subject, html: email.html, text: email.text }),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(`Resend respondeu ${response.status}: ${detail}`);
  }
}

/** Nunca derruba o fluxo do cliente: registra o erro e segue (ele pode pedir o e-mail de novo). */
export async function sendEmailSafely(email: OutgoingEmail): Promise<void> {
  try {
    await sendEmail(email);
  } catch (error) {
    console.error("[e-mail] falha ao enviar", email.subject, error);
  }
}
