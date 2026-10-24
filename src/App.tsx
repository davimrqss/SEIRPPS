import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PermissionRoute } from "@/components/PermissionRoute";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import NovaFolha from "./pages/NovaFolha";
import ImportarGuias from "./pages/ImportarGuias";
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
              <Route path="/folhas" element={<Navigate to="/guias" replace />} />
              <Route path="/folhas/nova" element={<Navigate to="/guias/cadastrar" replace />} />
              <Route path="/folhas/importar" element={<Navigate to="/guias/importar" replace />} />
              <Route path="/guias/importar" element={<PermissionRoute permission="editarGuias"><ImportarGuias /></PermissionRoute>} />
              <Route path="/guias/cadastrar" element={<PermissionRoute permission="editarGuias"><NovaFolha /></PermissionRoute>} />
              <Route path="/guias" element={<GuiasPDF />} />
              <Route path="/guias/:folhaId/pagamento" element={<PermissionRoute permission="editarGuias"><LancarPagamento /></PermissionRoute>} />
              <Route path="/caixas" element={<PermissionRoute permission="admin"><Caixas /></PermissionRoute>} />
              <Route path="/caixas/:id" element={<PermissionRoute permission="admin"><CaixaEditar /></PermissionRoute>} />
              <Route path="/orgaos" element={<PermissionRoute permission="cadastros"><Orgaos /></PermissionRoute>} />
              <Route path="/centros-custo" element={<PermissionRoute permission="cadastros"><CentrosCusto /></PermissionRoute>} />
              <Route path="/cadastro" element={<PermissionRoute permission="admin"><Cadastro /></PermissionRoute>} />
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
