import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import FolhasPagamento from "./pages/FolhasPagamento";
import NovaFolha from "./pages/NovaFolha";
import LancarPagamento from "./pages/LancarPagamento";
import GuiasPDF from "./pages/GuiasPDF";
import Cadastro from "./pages/Cadastro";
import Caixas from "./pages/Caixas";
import CaixaEditar from "./pages/CaixaEditar";
import Orgaos from "./pages/Orgaos";
import CentrosCusto from "./pages/CentrosCusto";
import MinhaConta from "./pages/MinhaConta";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <TooltipProvider>
      <Toaster />

      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/folhas" element={<FolhasPagamento />} />
              <Route path="/folhas/nova" element={<NovaFolha />} />
              <Route path="/guias" element={<GuiasPDF />} />
              <Route path="/guias/:folhaId/pagamento" element={<LancarPagamento />} />
              <Route path="/caixas" element={<Caixas />} />
              <Route path="/caixas/:id" element={<CaixaEditar />} />
              <Route path="/orgaos" element={<Orgaos />} />
              <Route path="/centros-custo" element={<CentrosCusto />} />
              <Route path="/cadastro" element={<Cadastro />} />
              <Route path="/minha-conta" element={<MinhaConta />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>

);

export default App;
