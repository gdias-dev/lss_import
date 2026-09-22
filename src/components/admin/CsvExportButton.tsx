"use client";

import { useState } from "react";
import { exportCsvAction } from "@/app/admin/produtos/actions";

export function CsvExportButton() {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const csv = await exportCsvAction();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `produtos-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={busy} className="btn-outline disabled:opacity-60">
      {busy ? "Gerando..." : "Baixar CSV atual"}
    </button>
  );
}
