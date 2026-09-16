// Canal humano de suporte, opcional. Vem por env como as chaves do Supabase:
// window.__env em producao (docker-entrypoint.sh; tipo declarado em
// integrations/supabase/client.ts) e import.meta.env em dev.
// Sem nenhuma das duas, o painel simplesmente nao mostra a opcao.

function env(name: "VITE_SUPPORT_EMAIL" | "VITE_SUPPORT_WHATSAPP"): string {
  return (window.__env?.[name] || import.meta.env[name] || "").trim();
}

export interface SupportContact {
  kind: "whatsapp" | "email";
  label: string;
  href: string;
}

export function supportContacts(): SupportContact[] {
  const out: SupportContact[] = [];
  // Somente digitos, com DDI (ex.: 5511999999999).
  const whatsapp = env("VITE_SUPPORT_WHATSAPP").replace(/\D/g, "");
  if (whatsapp) {
    const text = encodeURIComponent("Olá! Preciso de ajuda com o FinControl.");
    out.push({ kind: "whatsapp", label: "Falar no WhatsApp", href: `https://wa.me/${whatsapp}?text=${text}` });
  }
  const email = env("VITE_SUPPORT_EMAIL");
  if (email) {
    const subject = encodeURIComponent("Ajuda com o FinControl");
    out.push({ kind: "email", label: "Enviar e-mail", href: `mailto:${email}?subject=${subject}` });
  }
  return out;
}
