import clsx, { type ClassValue } from "clsx";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export const onlyDigits = (value: string) => value.replace(/\D/g, "");
