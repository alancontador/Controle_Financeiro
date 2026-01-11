import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2,
  User,
  Camera,
  Save,
  Bell,
  Palette,
  DollarSign,
  Globe,
  Trash2,
  LogOut,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

const currencies = [
  { value: "BRL", label: "Real Brasileiro (R$)" },
  { value: "USD", label: "Dólar Americano ($)" },
  { value: "EUR", label: "Euro (€)" },
];

const languages = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en-US", label: "English (US)" },
  { value: "es", label: "Español" },
];

const Settings = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { profile, loading, updateProfile, uploadAvatar, removeAvatar } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    currency: "BRL",
    language: "pt-BR",
    theme: "dark",
    notifications_enabled: true,
    monthly_budget: 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        currency: profile.currency || "BRL",
        language: profile.language || "pt-BR",
        theme: profile.theme || "dark",
        notifications_enabled: profile.notifications_enabled ?? true,
        monthly_budget: Number(profile.monthly_budget) || 0,
      });
    }
  }, [profile]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return;
    }

    setIsUploading(true);
    try {
      await uploadAvatar(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploading(true);
    try {
      await removeAvatar();
    } finally {
      setIsUploading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getInitials = () => {
    if (formData.full_name) {
      return formData.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />

      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
            Configurações
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie seu perfil e preferências
          </p>
        </motion.div>

        <div className="max-w-2xl space-y-6">
          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-foreground font-semibold text-lg">Perfil</h3>
                <p className="text-muted-foreground text-sm">
                  Suas informações pessoais
                </p>
              </div>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-6 mb-6">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-primary-foreground" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="space-y-1">
                <p className="text-foreground font-medium">Foto de Perfil</p>
                <p className="text-muted-foreground text-sm">
                  JPG, PNG ou WebP. Máximo 2MB.
                </p>
                {profile?.avatar_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    disabled={isUploading}
                    className="text-destructive hover:text-destructive px-0"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remover foto
                  </Button>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-muted-foreground">
                  Nome Completo
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder="Seu nome"
                  className="bg-secondary/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Email</Label>
                <Input
                  value={user.email || ""}
                  disabled
                  className="bg-secondary/30 text-muted-foreground"
                />
              </div>
            </div>
          </motion.div>

          {/* Preferences Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Palette className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-foreground font-semibold text-lg">
                  Preferências
                </h3>
                <p className="text-muted-foreground text-sm">
                  Personalize sua experiência
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Currency */}
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Moeda
                </Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, currency: value })
                  }
                >
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Idioma
                </Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) =>
                    setFormData({ ...formData, language: value })
                  }
                >
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Monthly Budget */}
              <div className="space-y-2">
                <Label
                  htmlFor="monthly_budget"
                  className="text-muted-foreground flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Orçamento Mensal (R$)
                </Label>
                <Input
                  id="monthly_budget"
                  type="number"
                  value={formData.monthly_budget}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      monthly_budget: Number(e.target.value),
                    })
                  }
                  placeholder="0,00"
                  className="bg-secondary/50"
                />
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-foreground font-medium">Notificações</p>
                    <p className="text-muted-foreground text-sm">
                      Receber alertas e lembretes
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.notifications_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, notifications_enabled: checked })
                  }
                />
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 glow-primary"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Alterações
            </Button>

            <Button
              variant="outline"
              onClick={handleSignOut}
              className="flex-1 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair da Conta
            </Button>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
