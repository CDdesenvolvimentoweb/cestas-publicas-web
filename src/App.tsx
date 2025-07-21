import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { MainLayout } from "@/components/layout/MainLayout";
import { Dashboard } from "@/pages/Dashboard";
import { ManagementUnits } from "@/pages/ManagementUnits";
import { Suppliers } from "@/pages/Suppliers";
import { ProductCategories } from "@/pages/ProductCategories";
import { Products } from "@/pages/Products";
import { PriceBaskets } from "@/pages/PriceBaskets";
import { Quotations } from "@/pages/Quotations";
import { SupplierQuote } from "@/pages/SupplierQuote";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthLayout>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="management-units" element={<ManagementUnits />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="product-categories" element={<ProductCategories />} />
              <Route path="products" element={<Products />} />
              <Route path="baskets" element={<PriceBaskets />} />
              <Route path="quotations" element={<Quotations />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthLayout>
        {/* Public routes outside AuthLayout */}
        <Routes>
          <Route path="/supplier-quote" element={<SupplierQuote />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
