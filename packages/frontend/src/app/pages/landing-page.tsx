import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Upload, Radio, Share2, Headphones, Zap, Shield } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { LanguageSwitcher } from "../components/language-switcher";
import { useLanguage } from "../contexts/language-context";
import { useAuth } from "../contexts/auth-context";

export function LandingPage() {
  const { t } = useLanguage();
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="size-6 text-indigo-600" />
            <span className="font-semibold text-xl">ReportCast</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/pricing">{t('nav.pricing')}</Link>
            </Button>
            <LanguageSwitcher />
            {isAuthenticated ? (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
                <div className="text-sm text-slate-600">
                  {user?.name || user?.email}
                </div>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">{t('nav.login')}</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">{t('nav.getStarted')}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-5xl font-bold tracking-tight">
            {t('landing.hero.title')} <span className="text-indigo-600">{t('landing.hero.podcast')}</span>
          </h1>
          <p className="text-xl text-slate-600">
            {t('landing.hero.subtitle')}
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link to="/signup">
              <Button size="lg" className="gap-2">
                <Upload className="size-5" />
                {t('landing.hero.cta')}
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              {t('landing.hero.howItWorks')}
            </Button>
          </div>
        </div>

        <div className="mt-16 rounded-xl overflow-hidden shadow-2xl max-w-5xl mx-auto">
          <ImageWithFallback 
            src="https://images.unsplash.com/photo-1764160750438-0b119145f4a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBwb2RjYXN0JTIwcmVjb3JkaW5nJTIwbWljcm9waG9uZXxlbnwxfHx8fDE3NzI3OTk5NjV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="Podcast microphone"
            className="w-full h-[400px] object-cover"
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">{t('landing.how.title')}</h2>
          <p className="text-slate-600 text-lg">{t('landing.how.subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <div className="size-12 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <Upload className="size-6 text-indigo-600" />
              </div>
              <CardTitle>{t('landing.how.step1.title')}</CardTitle>
              <CardDescription>
                {t('landing.how.step1.desc')}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="size-12 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <Zap className="size-6 text-indigo-600" />
              </div>
              <CardTitle>{t('landing.how.step2.title')}</CardTitle>
              <CardDescription>
                {t('landing.how.step2.desc')}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="size-12 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <Share2 className="size-6 text-indigo-600" />
              </div>
              <CardTitle>{t('landing.how.step3.title')}</CardTitle>
              <CardDescription>
                {t('landing.how.step3.desc')}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t('landing.features.title')}</h2>
            <p className="text-slate-600 text-lg">{t('landing.features.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto items-center">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="size-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Headphones className="size-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{t('landing.features.listen.title')}</h3>
                  <p className="text-slate-600">
                    {t('landing.features.listen.desc')}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="size-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Zap className="size-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{t('landing.features.fast.title')}</h3>
                  <p className="text-slate-600">
                    {t('landing.features.fast.desc')}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="size-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="size-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{t('landing.features.secure.title')}</h3>
                  <p className="text-slate-600">
                    {t('landing.features.secure.desc')}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden shadow-lg">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1758691736843-90f58dce465e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwY29sbGFib3JhdGlvbiUyMG9mZmljZSUyMGRpc2N1c3Npb258ZW58MXx8fHwxNzcyNzk5OTY1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Team collaboration"
                className="w-full h-[400px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">{t('landing.cta.title')}</h2>
          <p className="text-xl mb-8 opacity-90">
            {t('landing.cta.subtitle')}
          </p>
          <Link to="/signup">
            <Button size="lg" variant="secondary" className="gap-2">
              <Upload className="size-5" />
              {t('landing.cta.button')}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-slate-50">
        <div className="container mx-auto px-4 py-8 text-center text-slate-600">
          <p>{t('landing.footer')}</p>
        </div>
      </footer>
    </div>
  );
}