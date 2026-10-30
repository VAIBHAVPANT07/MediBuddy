import { useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getFromStorage } from '@/lib/utils';
import AuthPage from './pages/AuthPage';
import PatientPortal from './pages/PatientPortal';
import DoctorPortal from './pages/DoctorPortal';
import AdminPortal from './pages/AdminPortal';
import SellerPortal from './pages/SellerPortal';

const queryClient = new QueryClient();

const App = () => {
  const [currentUser, setCurrentUser] = useState<{role: string} | null>(() => {
    const savedRole = getFromStorage('userRole');
    return savedRole ? { role: savedRole } : null;
  });

  const handleLogin = (role: string) => {
    setCurrentUser({ role });
  };

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userMobile');
    localStorage.removeItem('userAadhar');
    setCurrentUser(null);
  };

  const renderPortal = () => {
    if (!currentUser) {
      return <AuthPage onLogin={handleLogin} />;
    }

    switch (currentUser.role) {
      case 'patient':
        return <PatientPortal onLogout={handleLogout} />;
      case 'doctor':
        return <DoctorPortal onLogout={handleLogout} />;
      case 'admin':
        return <AdminPortal onLogout={handleLogout} />;
      case 'seller':
        return <SellerPortal onLogout={handleLogout} />;
      default:
        return <AuthPage onLogin={handleLogin} />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {renderPortal()}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;