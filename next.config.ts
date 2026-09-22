import type { NextConfig } from "next";

/**
 * Content-Security-Policy: bloqueia scripts, iframes e conexões de fora dessa lista, mesmo que
 * alguém consiga injetar HTML em algum lugar. 'unsafe-inline' em script-src é uma concessão
 * pragmática (evita a complexidade de nonce por requisição) — o React já escapa todo conteúdo
 * do usuário, então o risco residual é baixo. As permissões de mercadopago.com cobrem o SDK de
 * pagamento (Secure Fields, tokenização); TESTE UM PAGAMENTO REAL EM SANDBOX E OLHE O CONSOLE DO
 * NAVEGADOR antes de ir para produção — se algo for bloqueado, o erro aparece lá com o domínio
 * exato que falta liberar.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://sdk.mercadopago.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.mercadopago.com https://sdk.mercadopago.com https://http2.mlstatic.com https://www.mercadopago.com",
  "frame-src https://www.mercadopago.com https://api.mercadopago.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
