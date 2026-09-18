import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, User, KeyRound, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().email("E-mail inválido");
const passwordSchema = z.string().min(6, "Senha deve ter no mínimo 6 caracteres");

type Tab = "login" | "signup" | "reset";

/**
 * Entrar / Criar conta / Recuperar senha. Mesma logica do Conciliacao Pro:
 * - senha certa com e-mail ainda nao confirmado reenvia o link (em vez de
 *   "senha incorreta");
 * - cadastro com nome, senha e confirmacao; com confirmacao de e-mail ligada,
 *   avisa e volta para o login;
 * - recuperacao envia um codigo por e-mail e leva para /reset-password.
 */
const Auth = () => {
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; password2?: string; fullName?: string }>({});

  const { signIn, signUp, resetPassword, resendConfirmation, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setErrors({});
    setPassword("");
    setPassword2("");
  };

  const validate = () => {
    const next: typeof errors = {};
    const emailResult = emailSchema.safeParse(email.trim());
    if (!emailResult.success) next.email = emailResult.error.errors[0].message;
    if (tab !== "reset") {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) next.password = passwordResult.error.errors[0].message;
    }
    if (tab === "signup") {
      if (!fullName.trim()) next.fullName = "Informe seu nome";
      if (password !== password2) next.password2 = "As senhas não coincidem";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    const { error } = await signIn(email.trim(), password);
    if (!error) {
      toast({ title: "Bem-vindo de volta!", description: "Login realizado com sucesso." });
      navigate("/");
      return;
    }
    if (/email not confirmed|not_confirmed/i.test(error.message)) {
      // Senha certa, e-mail ainda nao confirmado: reenvia o link em vez de confundir com "senha incorreta".
      try {
        await resendConfirmation(email.trim());
        toast({ title: "Confirme seu e-mail", description: `Reenviamos o link de confirmação para ${email.trim()}. Verifique também a caixa de spam.` });
      } catch (e) {
        toast({ title: "Confirme seu e-mail", description: `Sua conta ainda não foi confirmada e não conseguimos reenviar o link agora (${e instanceof Error ? e.message : "erro"}).`, variant: "destructive" });
      }
      return;
    }
    toast({
      title: "Erro ao entrar",
      description: error.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : error.message,
      variant: "destructive",
    });
  };

  const handleSignup = async () => {
    const { error, needsConfirmation } = await signUp(email.trim(), password, fullName.trim());
    if (error) {
      const msg = error.message.includes("already registered") ? "Este e-mail já está cadastrado. Entre ou recupere a senha." : error.message;
      toast({ title: "Erro ao cadastrar", description: msg, variant: "destructive" });
      return;
    }
    if (needsConfirmation) {
      toast({ title: "Confirme seu e-mail", description: `Enviamos um link para ${email.trim()}. Depois de confirmar, é só entrar.` });
      switchTab("login");
      return;
    }
    toast({ title: "Conta criada!", description: "Você já pode acessar o dashboard." });
    navigate("/");
  };

  const handleReset = async () => {
    try {
      await resetPassword(email.trim());
      toast({ title: "Código enviado!", description: "Verifique seu e-mail e insira o código de recuperação." });
      navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast({
        title: "Não foi possível enviar o código",
        description: /rate limit|limit/i.test(msg) ? "Limite de e-mails atingido. Tente de novo em alguns minutos." : msg || "E-mail não encontrado.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      if (tab === "login") await handleLogin();
      else if (tab === "signup") await handleSignup();
      else await handleReset();
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const titles: Record<Tab, [string, string]> = {
    login: ["Bem-vindo de volta", "Entre para acessar seu painel financeiro"],
    signup: ["Crie sua conta", "Comece a controlar suas finanças agora"],
    reset: ["Recuperar senha", "Enviaremos um código de recuperação para o seu e-mail"],
  };

  const passwordField = (id: string, label: string, value: string, onChange: (v: string) => void, error?: string, autoComplete?: string) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          placeholder={tab === "signup" ? "Mínimo 6 caracteres" : "••••••••"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="pl-10 pr-10 bg-secondary border-border focus:border-primary"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Section - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 via-background to-background p-12 flex-col justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center glow-primary">
            <span className="text-primary-foreground font-bold text-xl">F</span>
          </div>
          <div>
            <h1 className="text-foreground font-bold text-2xl tracking-tight">FinControl</h1>
            <p className="text-muted-foreground text-sm">Seu comando financeiro</p>
          </div>
        </div>

        <div className="space-y-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold text-foreground leading-tight"
          >
            Assuma o controle das suas finanças
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground text-lg"
          >
            Importe as faturas dos cartões, veja quem gasta o quê, projete as próximas faturas e acompanhe suas metas.
          </motion.p>
        </div>

        <p className="text-muted-foreground text-sm">
          "Seu dinheiro está trabalhando — e bem."
        </p>
      </motion.div>

      {/* Right Section - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center glow-primary">
              <span className="text-primary-foreground font-bold text-lg">F</span>
            </div>
            <div>
              <h1 className="text-foreground font-bold text-xl tracking-tight">FinControl</h1>
            </div>
          </div>

          <div className="space-y-2 text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
              {tab === "signup" && <UserPlus className="w-6 h-6 text-primary" />}
              {tab === "reset" && <KeyRound className="w-6 h-6 text-primary" />}
              {titles[tab][0]}
            </h2>
            <p className="text-muted-foreground">{titles[tab][1]}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Seu nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="Nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    className="pl-10 bg-secondary border-border focus:border-primary"
                  />
                </div>
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  className="pl-10 bg-secondary border-border focus:border-primary"
                />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            {tab !== "reset" && passwordField("password", "Senha", password, setPassword, errors.password, tab === "login" ? "current-password" : "new-password")}
            {tab === "signup" && passwordField("password2", "Confirmar senha", password2, setPassword2, errors.password2, "new-password")}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-6"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {tab === "login" ? "Entrar" : tab === "signup" ? "Criar conta" : "Enviar código de recuperação"}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border flex flex-col gap-2 text-center">
            {tab === "login" && (
              <>
                <button type="button" onClick={() => switchTab("reset")} className="text-primary hover:underline text-sm">
                  Esqueci minha senha
                </button>
                <button type="button" onClick={() => switchTab("signup")} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Não tem conta? Crie agora
                </button>
              </>
            )}
            {tab !== "login" && (
              <button type="button" onClick={() => switchTab("login")} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                {tab === "signup" ? "Já tem conta? Entre aqui" : "Voltar para o login"}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
