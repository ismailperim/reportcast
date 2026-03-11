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

export function SignupPage() {
  const { t } = useLanguage();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, name);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
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

      {/* Signup Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">{t('auth.signup.title')}</CardTitle>
            <CardDescription>{t('auth.signup.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('auth.signup.name')}</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.signup.email')}</Label>
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
                <Label htmlFor="password">{t('auth.signup.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth.signup.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('common.loading') : t('auth.signup.button')}
              </Button>
            </form>

            <div className="mt-4 text-center text-xs text-slate-500">
              {t('auth.signup.terms')}{' '}
              <a href="#" className="text-indigo-600 hover:underline">
                {t('auth.signup.termsLink')}
              </a>{' '}
              {t('auth.signup.and')}{' '}
              <a href="#" className="text-indigo-600 hover:underline">
                {t('auth.signup.privacyLink')}
              </a>
            </div>

            <div className="mt-6 text-center text-sm text-slate-600">
              {t('auth.signup.hasAccount')}{' '}
              <Button variant="link" className="px-1 h-auto" asChild>
                <Link to="/login">{t('auth.signup.signIn')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}