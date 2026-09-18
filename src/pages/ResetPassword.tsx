import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, Mail, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Mode = "pkce" | "otp" | "form" | "invalid";

/**
 * Redefinicao de senha (mesma logica do Conciliacao Pro). Tres jeitos de chegar:
 * - ?code= : link do e-mail (PKCE) -> troca por sessao e mostra o formulario;
 * - sessao no fragmento da URL (fluxo implicito) -> formulario direto;
 * - sem sessao: pede e-mail + codigo do e-mail + nova senha (verifyOtp).
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const params = new URLSearchParams(window.location.search);
  const emailFromUrl = params.get("email") ?? "";
  const codeFromUrl = params.get("code") ?? "";

  const [mode, setMode] = useState<Mode>("otp");
  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Link antigo/invalido chega com erro no hash.
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    if (hashParams.get("error")) {
      setMode("invalid");
      return;
    }

    if (codeFromUrl) {
      setMode("pkce");
      supabase.auth.exchangeCodeForSession(codeFromUrl).then(({ error }) => {
        setMode(error ? "invalid" : "form");
      });
      return;
    }

    // Fluxo implicito: o supabase-js processa o fragmento de forma assincrona.
    // Com sessao ativa a pessoa ja esta autenticada: pedir codigo seria um beco sem saida.
    supabase.auth.getSession().then(({ data }) => {
      setMode(data.session ? "form" : "otp");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setMode("form");
    });
    return () => sub.subscription.unsubscribe();
  }, [codeFromUrl]);

  const validatePasswords = () => {
    if (password.length < 6) {
      toast({ title: "Senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return false;
    }
    if (password !== password2) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !code.trim()) {
      toast({ title: "Preencha o e-mail e o código", variant: "destructive" });
      return;
    }
    if (!validatePasswords()) return;
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "recovery" });
    if (verifyError) {
      setLoading(false);
      toast({ title: "Código inválido ou expirado", description: "Solicite um novo código de recuperação.", variant: "destructive" });
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      toast({ title: "Erro ao redefinir senha", description: updateError.message, variant: "destructive" });
    } else {
      setDone(true);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePasswords()) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao redefinir senha", description: error.message, variant: "destructive" });
    } else {
      setDone(true);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center glow-primary">
            <span className="text-primary-foreground font-bold text-lg">F</span>
          </div>
          <h1 className="text-foreground font-bold text-xl tracking-tight">FinControl</h1>
        </div>
        <div className="glass-card rounded-xl p-6">{children}</div>
      </motion.div>
    </div>
  );

  const passwordInput = (id: string, label: string, value: string, onChange: (v: string) => void, autoFocus = false) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input id={id} type={showPass ? "text" : "password"} placeholder={id === "password" ? "Mínimo 6 caracteres" : "Repita a senha"}
          className="pl-9 pr-9 bg-secondary border-border" value={value} onChange={(e) => onChange(e.target.value)} autoFocus={autoFocus} autoComplete="new-password" />
        <button type="button" tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPass((p) => !p)} aria-label="Mostrar senha">
          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  if (done) {
    return shell(
      <div className="text-center space-y-4 py-4">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
        <h2 className="text-xl font-bold">Senha redefinida com sucesso!</h2>
        <p className="text-muted-foreground text-sm">Você já pode entrar com a nova senha.</p>
        <Button className="w-full" onClick={() => navigate("/auth", { replace: true })}>Ir para o login</Button>
      </div>,
    );
  }

  if (mode === "invalid") {
    return shell(
      <div className="text-center space-y-4 py-4">
        <XCircle className="w-16 h-16 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Link inválido ou expirado</h2>
        <p className="text-muted-foreground text-sm">Solicite um novo código de recuperação de senha.</p>
        <Button asChild variant="outline" className="w-full"><Link to="/auth">Voltar ao login</Link></Button>
      </div>,
    );
  }

  if (mode === "pkce") {
    return shell(
      <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" /> Verificando link...
      </div>,
    );
  }

  return shell(
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary" /> Redefinir senha</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {mode === "form" ? "Crie sua nova senha de acesso." : "Informe o código que chegou no seu e-mail e crie uma nova senha."}
        </p>
      </div>

      {mode === "form" ? (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordInput("password", "Nova senha", password, setPassword, true)}
          {passwordInput("password2", "Confirmar nova senha", password2, setPassword2)}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Salvando..." : "Redefinir senha"}</Button>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail cadastrado</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="email" type="email" placeholder="seu@email.com" className="pl-9 bg-secondary border-border" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Código de recuperação</Label>
            <Input id="code" placeholder="Cole ou digite o código do e-mail" className="font-mono text-center tracking-widest text-base bg-secondary border-border"
              value={code} onChange={(e) => setCode(e.target.value.trim())} autoFocus={!emailFromUrl} autoComplete="one-time-code" />
            <p className="text-xs text-muted-foreground">O código foi enviado para o seu e-mail. Verifique também a caixa de spam.</p>
          </div>
          {passwordInput("password", "Nova senha", password, setPassword)}
          {passwordInput("password2", "Confirmar nova senha", password2, setPassword2)}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Verificando..." : "Redefinir senha"}</Button>
          <div className="text-center">
            <Link to="/auth" className="text-sm text-muted-foreground hover:underline">Voltar ao login</Link>
          </div>
        </form>
      )}
    </>,
  );
}
