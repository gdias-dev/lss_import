"use client";

export function DeleteAddressButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm("Excluir este endereço?")) e.preventDefault();
      }}
      className="text-sm text-muted transition hover:text-red-300"
    >
      Excluir
    </button>
  );
}
