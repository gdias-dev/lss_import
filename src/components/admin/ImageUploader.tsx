"use client";

import { useState } from "react";

export interface UploadedImage {
  url: string;
}

/** Sobe a imagem direto para o Cloudinary usando os parâmetros assinados obtidos do servidor. */
export function ImageUploader({ onUploaded }: { onUploaded: (image: UploadedImage) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const signRes = await fetch("/api/admin/upload");
      if (!signRes.ok) {
        const body = (await signRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Não foi possível preparar o envio.");
      }
      const sign = (await signRes.json()) as { url: string; apiKey: string; timestamp: number; signature: string; folder: string };

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sign.apiKey);
      form.append("timestamp", String(sign.timestamp));
      form.append("signature", sign.signature);
      form.append("folder", sign.folder);

      const uploadRes = await fetch(sign.url, { method: "POST", body: form });
      if (!uploadRes.ok) throw new Error("O Cloudinary recusou o envio.");
      const uploaded = (await uploadRes.json()) as { secure_url: string };
      onUploaded({ url: uploaded.secure_url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar a imagem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="btn-outline inline-flex cursor-pointer items-center">
        {busy ? "Enviando..." : "Enviar imagem"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleFile(file);
          }}
        />
      </label>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
