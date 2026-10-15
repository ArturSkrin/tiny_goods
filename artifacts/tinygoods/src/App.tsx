import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { AmbientBackground } from './components/AmbientBackground';
import { CartProvider } from './context/cart';
import { getGetAdminSessionQueryKey } from '@workspace/api-client-react';

// Store
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import About from './pages/About';

// Admin
import AdminDashboard from './pages/AdminDashboard';
import AdminOrders from './pages/AdminOrders';
import AdminProducts from './pages/AdminProducts';
import AdminCategories from './pages/AdminCategories';
import AdminSettings from './pages/AdminSettings';
import AdminSite from './pages/AdminSite';
import PaymentSuccess from './pages/PaymentSuccess';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any) => {
      if (error?.response?.status === 401) {
        queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() });
      }
    },
  }),
});

function Router() {
  return (
    <Switch>
      {/* Store */}
      <Route path="/" component={Home} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/checkout/success" component={PaymentSuccess} />
      <Route path="/about" component={About} />
      
      {/* Admin */}
      <Route path="/tiny-admin" component={AdminDashboard} />
      <Route path="/tiny-admin/orders" component={AdminOrders} />
      <Route path="/tiny-admin/products" component={AdminProducts} />
      <Route path="/tiny-admin/categories" component={AdminCategories} />
      <Route path="/tiny-admin/settings" component={AdminSettings} />
      <Route path="/tiny-admin/site" component={AdminSite} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

// The admin panel is designed for the dark theme only.
function Themed({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      forcedTheme={location.startsWith('/tiny-admin') ? 'dark' : undefined}
    >
      <AmbientBackground />
      {children}
    </ThemeProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Themed>
              <Router />
            </Themed>
          </WouterRouter>
        </CartProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
