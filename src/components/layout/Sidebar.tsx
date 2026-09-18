import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Target,
  FileText,
  Wallet,
  Brain,
  CalendarDays,
  Settings,
  LogOut,
  Tag,
  CreditCard,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Receipt, label: "Transações", href: "/transactions" },
  { icon: CalendarDays, label: "Calendário", href: "/calendar" },
  { icon: Wallet, label: "Orçamentos", href: "/budgets" },
  { icon: Tag, label: "Categorias", href: "/categories" },
  { icon: CreditCard, label: "Cartões", href: "/cartoes" },
  { icon: Users, label: "Pessoas", href: "/pessoas" },
  { icon: TrendingUp, label: "Investimentos", href: "/investments" },
  { icon: Target, label: "Metas", href: "/goals" },
  { icon: FileText, label: "Relatórios", href: "/reports" },
  { icon: Brain, label: "Insights", href: "/insights" },
];

/** Largura do menu aberto e do trilho de icones; o conteudo le `--sidebar-w`. */
const WIDE = "16rem";
const NARROW = "4.5rem";
/** Sem interacao por este tempo, o menu recolhe para sobrar espaco para os dados. */
const AUTO_COLLAPSE_MS = 8000;
const PIN_KEY = "sidebar:pinned";
const COLLAPSED_KEY = "sidebar:collapsed";

const readPinned = () => {
  try { return localStorage.getItem(PIN_KEY) === "1"; } catch { return false; }
};
const readCollapsed = () => {
  try { return sessionStorage.getItem(COLLAPSED_KEY) === "1"; } catch { return false; }
};

/**
 * Menu lateral (desktop). Abre cheio, recolhe sozinho para um trilho de
 * icones depois de alguns segundos e volta ao passar o mouse - por cima do
 * conteudo, sem empurrar a pagina. O botao de fixar deixa sempre aberto; a
 * escolha fica guardada no navegador.
 */
export function Sidebar() {
  const { signOut } = useAuth();
  const location = useLocation();
  const [pinned, setPinned] = useState(readPinned);
  // Ja recolhido em outra pagina desta sessao? Entao nao abre de novo a cada navegacao.
  const [expanded, setExpanded] = useState(() => readPinned() || !readCollapsed());
  const [hovering, setHovering] = useState(false);
  const collapseTimer = useRef<number | null>(null);

  const clearTimer = () => {
    if (collapseTimer.current) { window.clearTimeout(collapseTimer.current); collapseTimer.current = null; }
  };

  // Recolhe apos AUTO_COLLAPSE_MS sem o mouse em cima (so quando nao esta fixo).
  useEffect(() => {
    clearTimer();
    if (pinned || hovering || !expanded) return;
    collapseTimer.current = window.setTimeout(() => {
      setExpanded(false);
      try { sessionStorage.setItem(COLLAPSED_KEY, "1"); } catch { /* sem storage */ }
    }, readCollapsed() ? 600 : AUTO_COLLAPSE_MS);
    return clearTimer;
  }, [pinned, hovering, expanded]);

  // O conteudo das paginas usa lg:ml-[var(--sidebar-w)]: acompanha o menu fixo ou
  // ainda aberto; ao passar o mouse o menu abre por cima, sem empurrar a pagina.
  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-w", pinned || expanded ? WIDE : NARROW);
  }, [pinned, expanded]);

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    setExpanded(true);
    try { localStorage.setItem(PIN_KEY, next ? "1" : "0"); } catch { /* sem storage */ }
  };

  const open = pinned || expanded || hovering;

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? WIDE : NARROW }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocusCapture={() => setHovering(true)}
      onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovering(false); }}
      className={cn(
        "hidden lg:flex fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex-col z-50 overflow-hidden",
        !pinned && open && "shadow-2xl shadow-black/20",
      )}
      aria-label="Menu principal"
    >
      {/* Logo */}
      <div className={cn("border-b border-sidebar-border flex items-center gap-3 h-[88px]", open ? "px-6" : "px-4 justify-center")}>
        <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center glow-primary">
          <span className="text-primary-foreground font-bold text-lg">F</span>
        </div>
        {open && (
          <div className="min-w-0">
            <h1 className="text-foreground font-bold text-xl tracking-tight truncate">FinControl</h1>
            <p className="text-muted-foreground text-xs truncate">Seu comando financeiro</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden", open ? "px-4" : "px-3")}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.label}
              to={item.href}
              title={open ? undefined : item.label}
              className={cn(
                "flex items-center gap-3 rounded-lg transition-all duration-250 group",
                open ? "px-4 py-3" : "justify-center px-0 py-3",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-colors",
                  isActive ? "text-primary" : "group-hover:text-primary"
                )}
              />
              {open && <span className="font-medium text-sm truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className={cn("border-t border-sidebar-border py-4 space-y-1", open ? "px-4" : "px-3")}>
        <button
          type="button"
          onClick={togglePin}
          title={pinned ? "Recolher automaticamente" : "Manter o menu aberto"}
          className={cn(
            "w-full flex items-center gap-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-250",
            open ? "px-4 py-2.5" : "justify-center py-2.5",
          )}
        >
          {pinned ? <PanelLeftClose className="w-5 h-5 shrink-0" /> : <PanelLeftOpen className="w-5 h-5 shrink-0" />}
          {open && <span className="font-medium text-sm truncate">{pinned ? "Recolher automaticamente" : "Manter aberto"}</span>}
        </button>
        <Link
          to="/settings"
          title={open ? undefined : "Configurações"}
          className={cn(
            "flex items-center gap-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-250",
            open ? "px-4 py-3" : "justify-center py-3",
          )}
        >
          <Settings className="w-5 h-5 shrink-0" />
          {open && <span className="font-medium text-sm">Configurações</span>}
        </Link>
        <button
          onClick={() => signOut()}
          title={open ? undefined : "Sair"}
          className={cn(
            "w-full flex items-center gap-3 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-250",
            open ? "px-4 py-3" : "justify-center py-3",
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {open && <span className="font-medium text-sm">Sair</span>}
        </button>
      </div>
    </motion.aside>
  );
}
