import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatBRLInput, maskBRLDigits, parseBRL } from "@/lib/money";

export interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  /** Numero, ou o texto ja formatado (formularios que guardam string). */
  value: number | string | null | undefined;
  /** Recebe o numero e o texto formatado ("1.234,56"). */
  onChange: (value: number, formatted: string) => void;
}

/**
 * Campo de dinheiro com mascara pt-BR enquanto digita: os digitos entram pela
 * direita ("1" -> 0,01, "123456" -> 1.234,56). Colar "1234.56" ou "1.234,56"
 * tambem funciona.
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, placeholder = "0,00", ...props }, ref) => {
    const text = typeof value === "number" ? (value === 0 ? "" : formatBRLInput(value)) : (value ?? "");
    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          // Colou um numero com separador? Interpreta como valor; senao, mascara por digitos.
          const pasted = /^-?\d{1,3}(\.\d{3})*,\d{2}$|^-?\d+\.\d{1,2}$/.test(raw.trim()) && raw.length > text.length + 1;
          const formatted = pasted ? formatBRLInput(parseBRL(raw)) : maskBRLDigits(raw);
          onChange(parseBRL(formatted), formatted);
        }}
        {...props}
      />
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";
