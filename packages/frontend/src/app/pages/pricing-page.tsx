import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Check, CreditCard, Star } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { NavBar } from '../components/navbar';
import { useLanguage } from '../contexts/language-context';
import { useAuth } from '../contexts/auth-context';
import { api } from '../lib/api';
import { toast } from 'sonner';

interface PricingPackage {
  id: string;
  name: string;
  credits: number;
  pages: number;
  price: number;
  priceCents: number;
  priceFormatted: string;
  pricePerCredit: string;
  description: string;
  bestValue: boolean;
}

interface PricingData {
  mode: string;
  model: string;
  currency: string;
  creditsPerPage: number;
  freeCredits: number;
  packages: PricingPackage[];
}

export function PricingPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasingPackage, setPurchasingPackage] = useState<string | null>(null);

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    try {
      const data = await api.getPricing();
      setPricing(data);
    } catch (error) {
      toast.error('Failed to load pricing');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (packageId: string) => {
    if (!user) {
      toast.error(language === 'en' ? 'Please sign in to purchase credits' : 'Kredi satın almak için giriş yapın');
      return;
    }

    setPurchasingPackage(packageId);

    try {
      const response = await api.buyCredits(packageId);
      
      // In a real implementation, you would integrate with Stripe here
      // For now, we'll show a success message
      toast.success(
        language === 'en' 
          ? 'Payment flow would open here. Stripe integration needed.' 
          : 'Ödeme akışı burada açılacak. Stripe entegrasyonu gerekli.'
      );
      
      console.log('Payment Intent:', response);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Purchase failed');
    } finally {
      setPurchasingPackage(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <p className="text-slate-600">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <NavBar transparent />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold mb-4">{t('pricing.title')}</h1>
        <p className="text-xl text-slate-600 mb-8">{t('pricing.subtitle')}</p>
        
        <div className="flex flex-col items-center gap-4 mb-12">
          <div className="flex items-center gap-2 text-lg">
            <Badge variant="outline" className="text-base px-4 py-2">
              {t('pricing.creditSystem')}
            </Badge>
          </div>
          <p className="text-slate-600">
            {t('pricing.freeCredits')} ({pricing?.freeCredits} {t('pricing.credits')} = {pricing ? pricing.freeCredits * pricing.creditsPerPage : 45} {t('pricing.pages')})
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {pricing?.packages.map((pkg) => (
            <Card 
              key={pkg.id} 
              className={`relative ${pkg.bestValue ? 'border-indigo-500 border-2 shadow-lg' : ''}`}
            >
              {pkg.bestValue && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-indigo-600 hover:bg-indigo-700 gap-1">
                    <Star className="size-3 fill-white" />
                    {t('pricing.bestValue')}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl mb-2">{pkg.name}</CardTitle>
                <div className="mb-4">
                  <span className="text-4xl font-bold">{pkg.priceFormatted}</span>
                </div>
                <CardDescription className="space-y-1">
                  <p className="text-lg font-semibold text-slate-900">
                    {pkg.credits} {t('pricing.credits')}
                  </p>
                  <p className="text-sm">
                    {pkg.pages} {t('pricing.pages')}
                  </p>
                  <p className="text-xs text-slate-500">
                    ${pkg.pricePerCredit} {t('pricing.perCredit')}
                  </p>
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Button 
                  className="w-full gap-2 mb-6"
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchasingPackage === pkg.id}
                  variant={pkg.bestValue ? 'default' : 'outline'}
                >
                  <CreditCard className="size-4" />
                  {purchasingPackage === pkg.id ? t('common.loading') : t('pricing.buyNow')}
                </Button>

                <div className="space-y-3 text-sm">
                  <p className="font-medium text-slate-900">{pkg.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">{t('pricing.features.title')}</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-3">
                <Check className="size-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{t('pricing.features.aiPowered')}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Check className="size-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{t('pricing.features.naturalVoice')}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Check className="size-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{t('pricing.features.multiLanguage')}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Check className="size-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{t('pricing.features.unlimitedSharing')}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Check className="size-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{t('pricing.features.noExpiry')}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Check className="size-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{t('pricing.features.support')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">{t('pricing.faq.title')}</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="font-semibold text-lg mb-2">{t('pricing.faq.q1')}</h3>
              <p className="text-slate-600">{t('pricing.faq.a1')}</p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">{t('pricing.faq.q2')}</h3>
              <p className="text-slate-600">{t('pricing.faq.a2')}</p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">{t('pricing.faq.q3')}</h3>
              <p className="text-slate-600">{t('pricing.faq.a3')}</p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">{t('pricing.faq.q4')}</h3>
              <p className="text-slate-600">{t('pricing.faq.a4')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-20">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            {language === 'en' ? 'Ready to get started?' : 'Başlamaya hazır mısınız?'}
          </h2>
          <p className="text-lg mb-6 opacity-90">
            {language === 'en' 
              ? 'Sign up now and get 15 free credits to try ReportCast' 
              : 'Şimdi kaydolun ve ReportCast\'i denemek için 15 ücretsiz kredi alın'}
          </p>
          <Link to="/signup">
            <Button size="lg" variant="secondary">
              {t('nav.signup')}
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
