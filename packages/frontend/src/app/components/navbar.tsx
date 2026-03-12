import { Link } from "react-router";
import { Button } from "./ui/button";
import { Radio, CreditCard, User, ChevronDown, LogOut, LayoutDashboard, LogIn, UserPlus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "../contexts/language-context";
import { useAuth } from "../contexts/auth-context";
import { ReactNode } from "react";

interface NavBarProps {
  transparent?: boolean;
  extraActions?: ReactNode;
}

export function NavBar({ transparent = false, extraActions }: NavBarProps) {
  const { t, language } = useLanguage();
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className={`border-b ${transparent ? 'bg-white/80 backdrop-blur-sm' : 'bg-white'} sticky top-0 z-50`}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Radio className="size-6 text-indigo-600" />
          <span className="font-semibold text-xl">ReportCast</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Site navigation */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-2 text-slate-700" asChild>
              <Link to="/pricing">
                <CreditCard className="size-4" />
                {t('nav.pricing')}
              </Link>
            </Button>
          </div>

          <div className="h-5 w-px bg-slate-200" />

          {/* Extra actions (page-specific) */}
          {extraActions && (
            <>
              <div className="flex items-center gap-2">
                {extraActions}
              </div>
              <div className="h-5 w-px bg-slate-200" />
            </>
          )}

          {/* User actions */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <User className="size-4" />
                      <span className="hidden sm:inline">{user?.name || user?.email}</span>
                      <ChevronDown className="size-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user?.name || user?.email}</p>
                        {typeof user?.creditsRemaining === 'number' && (
                          <p className="text-xs text-muted-foreground">
                            {user.creditsRemaining} {language === 'en' ? 'credits remaining' : 'kredi kaldı'}
                          </p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="size-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} variant="destructive" className="gap-2">
                      <LogOut className="size-4" />
                      {language === 'en' ? 'Logout' : 'Çıkış'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="gap-2" asChild>
                  <Link to="/login">
                    <LogIn className="size-4" />
                    {t('nav.login')}
                  </Link>
                </Button>
                <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700" asChild>
                  <Link to="/signup">
                    <UserPlus className="size-4" />
                    {t('nav.getStarted')}
                  </Link>
                </Button>
              </>
            )}
          </div>

          <div className="h-5 w-px bg-slate-200" />

          {/* Global preference (always right) */}
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
}
