import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { LanguageProvider } from './contexts/language-context';
import { AuthProvider } from './contexts/auth-context';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </LanguageProvider>
  );
}