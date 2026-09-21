import { siteUrl } from "@/lib/env";

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export interface ActionEmail {
  title: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  footer?: string;
}

export function renderEmail({ title, paragraphs, cta, footer }: ActionEmail): { html: string; text: string } {
  const ps = paragraphs.map((p) => `<p style="margin:0 0 16px">${escapeHtml(p)}</p>`).join("");
  const button = cta
    ? `<p style="margin:28px 0"><a href="${escapeHtml(cta.url)}" style="background:#c9a45c;color:#0b0b0c;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:bold;display:inline-block">${escapeHtml(cta.label)}</a></p>
       <p style="font-size:13px;color:#6b6558;margin:0">Se o botão não funcionar, copie e cole este endereço no navegador:<br><a href="${escapeHtml(cta.url)}" style="color:#6b6558;word-break:break-all">${escapeHtml(cta.url)}</a></p>`
    : "";
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#0b0b0c;padding:24px;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#f3ede2;border-radius:16px;overflow:hidden">
<tr><td style="background:#0b0b0c;padding:24px;text-align:center;color:#c9a45c;font-size:26px;letter-spacing:6px;font-family:Georgia,serif;border-bottom:2px solid #c9a45c">LS IMPORTS</td></tr>
<tr><td style="padding:32px;color:#1b1b1d;font-size:16px;line-height:1.6"><h1 style="margin:0 0 16px;font-size:22px;font-family:Georgia,serif">${escapeHtml(title)}</h1>${ps}${button}</td></tr>
<tr><td style="padding:0 32px 28px;font-size:12px;color:#6b6558">${escapeHtml(footer ?? "Você recebeu este e-mail porque uma ação foi solicitada na sua conta LS Imports.")}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [title, "", ...paragraphs, ...(cta ? ["", `${cta.label}: ${cta.url}`] : []), "", footer ?? "LS Imports"].join("\n");
  return { html, text };
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export function verifyEmailMessage(user: { name: string }, token: string) {
  return {
    subject: "Confirme seu e-mail na LS Imports",
    ...renderEmail({
      title: "Confirme seu e-mail",
      paragraphs: [`Olá, ${firstName(user.name)}! Obrigado por criar sua conta na LS Imports.`, "Confirme seu e-mail para poder finalizar suas compras. O link vale por 48 horas."],
      cta: { label: "Confirmar meu e-mail", url: `${siteUrl}/verificar-email?token=${encodeURIComponent(token)}` },
    }),
  };
}

export function resetPasswordMessage(user: { name: string }, token: string) {
  return {
    subject: "Redefinir sua senha na LS Imports",
    ...renderEmail({
      title: "Redefinir senha",
      paragraphs: [`Olá, ${firstName(user.name)}! Recebemos um pedido para redefinir a senha da sua conta.`, "O link vale por 1 hora e só pode ser usado uma vez. Se não foi você, ignore este e-mail: sua senha continua a mesma."],
      cta: { label: "Criar nova senha", url: `${siteUrl}/redefinir-senha?token=${encodeURIComponent(token)}` },
    }),
  };
}

export function passwordChangedMessage(user: { name: string }) {
  return {
    subject: "Sua senha foi alterada",
    ...renderEmail({
      title: "Senha alterada",
      paragraphs: [`Olá, ${firstName(user.name)}! A senha da sua conta na LS Imports acabou de ser alterada e os outros aparelhos foram desconectados.`, "Se não foi você, redefina a senha imediatamente e fale com a loja."],
      cta: { label: "Redefinir senha", url: `${siteUrl}/esqueci-senha` },
    }),
  };
}
