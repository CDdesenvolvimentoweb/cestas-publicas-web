import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { MainLayout } from "@/components/layout/MainLayout";
import { Dashboard } from "@/pages/Dashboard";
import PriceHistoryDashboard from "@/pages/PriceHistoryDashboard";
import { ManagementUnits } from "@/pages/ManagementUnits";
import { Suppliers } from "@/pages/Suppliers";
import { ProductCategories } from "@/pages/ProductCategories";
import Products from "@/pages/Products";
import { PriceBaskets } from "@/pages/PriceBaskets";
import PNCPPrecos from "@/pages/PNCPPrecos";
import { Quotations } from "@/pages/Quotations";
import { SupplierQuote } from "@/pages/SupplierQuote";
import SupplierQuotation from "@/pages/SupplierQuotation";
import { SupplierPortal } from "@/pages/SupplierPortal";
import { UnitDashboard } from "@/pages/UnitDashboard";
import { UserManagement } from "@/pages/UserManagement";
import { Login } from "@/pages/Login";
import Reports from "@/pages/Reports";
import Integrations from "@/pages/Integrations";
import EmailSettings from "@/pages/EmailSettings";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import { PncpSearch } from "./components/temp/PncpSearch";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/supplier-quote" element={<SupplierQuote />} />
          <Route path="/quotation/:token" element={<SupplierQuotation />} />
          <Route path="/supplier-portal/:token" element={<SupplierPortal />} />
          
          {/* Test Route */}
          <Route path="/pncp-search" element={<PncpSearch />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={
            <AuthLayout>
              <MainLayout />
            </AuthLayout>
          }>
            <Route index element={<PriceHistoryDashboard />} />
          </Route>
          
          <Route path="/app" element={
            <AuthLayout>
              <MainLayout />
            </AuthLayout>
          }>
            <Route path="management-units" element={<ManagementUnits />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="product-categories" element={<ProductCategories />} />
            <Route path="products" element={<Products />} />
            <Route path="baskets" element={<PriceBaskets />} />
            <Route path="quotations" element={<Quotations />} />
            <Route path="reports" element={<Reports />} />
            <Route path="integrations" element={<Integrations />} />
            <Route path="pncp-precos" element={<PNCPPrecos />} />
            <Route path="email-settings" element={<EmailSettings />} />
            <Route path="user-management" element={<UserManagement />} />
            <Route path="unit-dashboard" element={<UnitDashboard />} />
          </Route>
          
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
