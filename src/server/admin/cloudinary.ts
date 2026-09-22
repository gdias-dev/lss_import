/**
 * Upload assinado para o Cloudinary: o servidor gera uma assinatura de curta duração e o navegador
 * envia o arquivo DIRETO para o Cloudinary (o arquivo nunca passa pelo nosso servidor, evitando
 * limite de tamanho de upload do Next.js). NUNCA testado contra credenciais reais.
 */
import { createHash } from "node:crypto";

export interface SignedUpload {
  url: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

/** Assina só os parâmetros que o navegador vai enviar — nunca o arquivo em si. */
export function createSignedUpload(folder = "produtos"): SignedUpload {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const timestamp = Math.floor(Date.now() / 1000);

  // A assinatura cobre todo parâmetro (exceto file, api_key e a própria signature), em ordem alfabética.
  const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(toSign).digest("hex");

  return { url: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, cloudName, apiKey, timestamp, signature, folder };
}
