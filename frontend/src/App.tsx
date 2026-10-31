import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppShell } from './components/layout/AppShell';
import { NavItemKey } from './components/layout/Sidebar';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { AdminDashboard } from './pages/dashboard/AdminDashboard';
import { StaffDashboard } from './pages/dashboard/StaffDashboard';
import { CustomerDashboard } from './pages/dashboard/CustomerDashboard';
import { ProductListPage } from './pages/products/ProductListPage';
import { PlanListPage } from './pages/plans/PlanListPage';
import { CustomerListPage } from './pages/customers/CustomerListPage';
import { QuotationListPage } from './pages/quotations/QuotationListPage';
import { SubscriptionListPage } from './pages/subscriptions/SubscriptionListPage';
import { InvoiceListPage } from './pages/invoices/InvoiceListPage';
import { PaymentListPage } from './pages/payments/PaymentListPage';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { RecordPaymentModal } from './pages/payments/RecordPaymentModal';
import { Invoice } from './types';

const MainContent: React.FC = () => {
  const { isAuthenticated, role } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot'>(new URLSearchParams(location.search).has('reset')?'forgot':'login');
  const [currentNav, setCurrentNav] = useState<NavItemKey>('dashboard');
  const [revision,setRevision]=useState(0);
  const [preselectedInvoiceForPay, setPreselectedInvoiceForPay] = useState<Invoice | null>(null);

  // If unauthenticated, show Auth screens
  if (!isAuthenticated) {
    if (authView === 'register') {
      return <RegisterPage onNavigateToLogin={() => setAuthView('login')} />;
    }
    if (authView === 'forgot') {
      return <ForgotPasswordPage onNavigateToLogin={() => setAuthView('login')} />;
    }
    return (
      <LoginPage
        onNavigateToRegister={() => setAuthView('register')}
        onNavigateToForgot={() => setAuthView('forgot')}
      />
    );
  }

  // Render role-specific dashboard or selected module
  const renderPage = () => {
    switch (currentNav) {
      case 'dashboard':
        if (role === 'admin') {
          return <AdminDashboard onNavigate={setCurrentNav} />;
        }
        if (role === 'staff') {
          return <StaffDashboard onNavigate={setCurrentNav} />;
        }
        return (
          <CustomerDashboard
            onNavigate={setCurrentNav}
            onPayInvoice={(inv) => setPreselectedInvoiceForPay(inv)}
          />
        );

      case 'products':
        return <ProductListPage />;

      case 'plans':
        return <PlanListPage />;

      case 'customers':
        return <CustomerListPage />;

      case 'quotations':
        return <QuotationListPage />;

      case 'subscriptions':
        return <SubscriptionListPage />;

      case 'invoices':
        return (
          <InvoiceListPage
            onRecordPaymentForInvoice={(inv) => setPreselectedInvoiceForPay(inv)}
          />
        );

      case 'payments':
        return <PaymentListPage />;

      case 'analytics':
        return <AnalyticsPage />;

      case 'settings':
        return <SettingsPage />;

      default:
        return <AdminDashboard onNavigate={setCurrentNav} />;
    }
  };

  return (
    <AppShell currentNav={currentNav} onNavigate={setCurrentNav}>
      <React.Fragment key={revision}>{renderPage()}</React.Fragment>

      {/* Global Payment Settlement Modal when invoked across modules */}
      {preselectedInvoiceForPay && (
        <RecordPaymentModal
          isOpen={!!preselectedInvoiceForPay}
          onClose={() => setPreselectedInvoiceForPay(null)}
          preselectedInvoice={preselectedInvoiceForPay}
          onSuccess={() => {
            setPreselectedInvoiceForPay(null);
            // Refresh current view
            setRevision(r=>r+1);
          }}
        />
      )}
    </AppShell>
  );
};

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
