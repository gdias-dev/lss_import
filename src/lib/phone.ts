/** Telefone brasileiro: devolve só dígitos com DDD (10 ou 11 dígitos), sem o +55. Null se inválido. */
export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;
  if (d.length === 11 && d[2] !== "9") return null; // celular começa com 9
  if (d.length === 10 && (d[2] === "0" || d[2] === "1")) return null;
  return d;
}

export function formatPhone(digits: string): string {
  if (digits.length === 11) return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  if (digits.length === 10) return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  return digits;
}
