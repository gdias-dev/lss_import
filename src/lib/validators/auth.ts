import { z } from "zod";
import { isValidCep, normalizeCep } from "../cep";
import { normalizePhone } from "../phone";

export const UF = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"] as const;

const COMMON_PASSWORDS = new Set([
  "12345678", "123456789", "1234567890", "12341234", "11111111", "00000000", "123123123", "87654321",
  "password", "password1", "senha123", "senha1234", "senha@123", "qwerty123", "abc12345", "admin123", "iloveyou", "mudar123", "brasil123",
]);

export type FieldErrors = Record<string, string[]>;

export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export function formDataToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) if (typeof value === "string") out[key] = value;
  return out;
}

const emailField = z.string().trim().toLowerCase().min(1, "Informe o e-mail").max(254, "E-mail muito longo").pipe(z.email("E-mail inválido"));
const nameField = (message = "Informe seu nome") => z.string().trim().min(2, message).max(80, "Nome muito longo");

const phoneField = z
  .string()
  .trim()
  .min(1, "Informe seu telefone")
  .transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Telefone inválido. Use DDD + número." });
      return z.NEVER;
    }
    return phone;
  });

export const passwordField = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres")
  .max(128, "A senha pode ter no máximo 128 caracteres")
  .refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()), "Essa senha é muito comum. Escolha outra.");

export const registerSchema = z.object({
  name: nameField(),
  email: emailField,
  phone: phoneField,
  password: passwordField,
  acceptTerms: z.string().optional().refine((v) => v === "on", "Aceite os termos para continuar"),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Informe a senha").max(128),
});

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z.object({
  token: z.string().min(20, "Link inválido").max(200),
  password: passwordField,
});

export const profileSchema = z.object({ name: nameField(), phone: phoneField });

export const changePasswordSchema = z.object({
  current: z.string().min(1, "Informe a senha atual").max(128),
  password: passwordField,
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres`)
    .optional()
    .transform((v) => v || undefined);

export const addressSchema = z.object({
  label: optionalText(30),
  recipient: nameField("Informe o nome de quem vai receber"),
  cep: z.string().trim().refine(isValidCep, "CEP inválido").transform(normalizeCep),
  street: z.string().trim().min(2, "Informe a rua").max(120, "Rua muito longa"),
  number: z.string().trim().min(1, "Informe o número").max(10, "Número muito longo"),
  complement: optionalText(60),
  neighborhood: z.string().trim().min(2, "Informe o bairro").max(80, "Bairro muito longo"),
  city: z.string().trim().min(2, "Informe a cidade").max(80, "Cidade muito longa"),
  state: z.string().trim().toUpperCase().refine((v) => (UF as readonly string[]).includes(v), "Selecione o estado"),
  isDefault: z.string().optional().transform((v) => v === "on"),
});
