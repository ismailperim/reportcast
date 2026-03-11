import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Radio } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { LanguageSwitcher } from '../components/language-switcher';
import { useLanguage } from '../contexts/language-context';
import { useAuth } from '../contexts/auth-context';
import { toast } from 'sonner';

export function LoginPage() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Successfully signed in!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      {/* Header */}
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Radio className="size-6 text-indigo-600" />
          <span className="font-semibold text-xl">ReportCast</span>
        </Link>
        <LanguageSwitcher />
      </div>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">{t('auth.login.title')}</CardTitle>
            <CardDescription>{t('auth.login.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.login.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('auth.login.password')}</Label>
                  <Button variant="link" size="sm" className="px-0 h-auto" asChild>
                    <Link to="/forgot-password">{t('auth.login.forgotPassword')}</Link>
                  </Button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('common.loading') : t('auth.login.button')}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600">
              {t('auth.login.noAccount')}{' '}
              <Button variant="link" className="px-1 h-auto" asChild>
                <Link to="/signup">{t('auth.login.signUp')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}