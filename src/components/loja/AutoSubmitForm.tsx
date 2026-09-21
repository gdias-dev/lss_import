"use client";

import Form from "next/form";

/** Formulário GET que envia sozinho ao marcar/desmarcar uma caixa. Campos de texto (preço) enviam com Enter ou no botão. */
export function AutoSubmitForm({ action, className, children }: { action: string; className?: string; children: React.ReactNode }) {
  return (
    <Form
      action={action}
      className={className}
      onChange={(e) => {
        if (e.target instanceof HTMLInputElement && e.target.type === "checkbox") e.currentTarget.requestSubmit();
      }}
    >
      {children}
    </Form>
  );
}
