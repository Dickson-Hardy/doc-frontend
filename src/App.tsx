import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PaymentCallback from "./pages/PaymentCallback";
import PaymentSuccess from "./pages/PaymentSuccess";
import VerifyPayment from "./pages/VerifyPayment";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminLogin from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import Registrations from "./pages/admin/Registrations";
import RegistrationTracking from "./pages/admin/RegistrationTracking";
import EmailLogs from "./pages/admin/EmailLogs";
import Scanner from "./pages/admin/Scanner";
import Settings from "./pages/admin/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Payment Routes */}
          <Route path="/payment/callback" element={<PaymentCallback />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/verify-payment" element={<VerifyPayment />} />
          
          {/* Admin Login */}
          <Route path="/admin/login" element={<AdminLogin />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="registrations" element={<Registrations />} />
            <Route path="registration-tracking" element={<RegistrationTracking />} />
            <Route path="email-logs" element={<EmailLogs />} />
            <Route path="scanner" element={<Scanner />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
