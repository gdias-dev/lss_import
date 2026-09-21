/** Estado devolvido pelas Server Actions aos formulários. Nunca inclui senhas. */
export interface FormState {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string>;
}
