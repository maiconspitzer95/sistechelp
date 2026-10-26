import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

// Páginas
import { LoginPage } from './pages/auth/LoginPage';
import { CollaboratorDashboard } from './pages/collaborator/CollaboratorDashboard';
import { CollaboratorTicketsPage } from './pages/collaborator/CollaboratorTicketsPage';
import { NewTicketPage } from './pages/tickets/NewTicketPage';
import { TicketDetailPage } from './pages/tickets/TicketDetailPage';
import { TechnicianQueuePage } from './pages/technician/TechnicianQueuePage';
import { MyTicketsPage } from './pages/technician/MyTicketsPage';
import { DashboardMetricsPage } from './pages/dashboard/DashboardMetricsPage';
import { UsersManagementPage } from './pages/admin/UsersManagementPage';
import { SectorsManagementPage } from './pages/admin/SectorsManagementPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { KnowledgeBasePage } from './pages/knowledge/KnowledgeBasePage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-xs">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Carregando Sistech Desk...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota Pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rotas Protegidas no Layout Central */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/collaborator" replace />} />
            
            {/* Colaborador */}
            <Route path="collaborator" element={<CollaboratorDashboard />} />
            <Route path="collaborator/tickets" element={<CollaboratorTicketsPage />} />
            <Route path="collaborator/tickets/:id" element={<TicketDetailPage />} />

            {/* Abertura de Chamado */}
            <Route path="tickets/new" element={<NewTicketPage />} />

            {/* Painel Técnico */}
            <Route path="technician" element={<TechnicianQueuePage />} />
            <Route path="technician/my-tickets" element={<MyTicketsPage />} />
            <Route path="technician/tickets/:id" element={<TicketDetailPage />} />
            <Route path="technician/dashboard" element={<DashboardMetricsPage />} />
            <Route path="technician/reports" element={<DashboardMetricsPage />} />

            {/* Base de Conhecimento */}
            <Route path="knowledge" element={<KnowledgeBasePage />} />

            {/* Administração */}
            <Route path="admin/users" element={<UsersManagementPage />} />
            <Route path="admin/sectors" element={<SectorsManagementPage />} />
            <Route path="admin/audit" element={<AuditLogsPage />} />
          </Route>

          {/* Rota Coringa */}
          <Route path="*" element={<Navigate to="/collaborator" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
