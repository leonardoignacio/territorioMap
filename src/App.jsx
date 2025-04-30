import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Outlet, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import SignupForm from './components/Auth/SignupForm';
import CongregacaoSelector from './components/Layout/CongregacaoSelector'; // Import the selector
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner'; // For notifications

// Placeholder Pages/Components (Import actual components when ready)
import CongregacoesPage from './pages/Congregacoes/CongregacoesPage';
import BairrosPage from './pages/Bairros/BairrosPage';
import DirigentesPage from './pages/Dirigentes/DirigentesPage'; // Assuming this exists for managing members
import CartoesTerritorioPage from './pages/CartoesTerritorio/CartoesTerritorioPage';
import RuasPage from './pages/Ruas/RuasPage';
import ImoveisPage from './pages/Imoveis/ImoveisPage';
import SaidasCampoPage from './pages/SaidasCampo/SaidasCampoPage';
import PublicadorViewPage from './pages/PublicadorViewPage';
import StreetViewPage from './pages/StreetView/StreetViewPage'; // Dirigente's view
// Add imports for Report pages later

const NotFoundPage = () => <div>Página não encontrada (404)</div>;

// Simple Layout component to wrap protected routes
const MainLayout = () => {
  const { currentUser, logout, selectedMembership, clearCongregacaoContext, congregacaoDetails } = useAuth();
  const currentCongregacaoName = selectedMembership ? congregacaoDetails[selectedMembership.congregacaoId] : null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-primary-foreground p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">
          Controle de Pregação {currentCongregacaoName ? `- ${currentCongregacaoName}` : ''}
        </h1>
        <div>
          <span className="mr-4">{currentUser?.email} ({selectedMembership?.role})</span>
          {selectedMembership && (
             <Button variant="secondary" size="sm" onClick={clearCongregacaoContext} className="mr-2">Trocar Congregação</Button>
          )}
          <Button variant="destructive" onClick={logout}>Sair</Button>
        </div>
      </header>
      <nav className="bg-secondary p-2 shadow-md">
        {/* Add Navigation Links based on role (selectedMembership.role) */}
        <Link to="/"><Button variant="link">Início</Button></Link>
        {selectedMembership?.role === 'Admin' && (
            <Link to="/congregacoes"><Button variant="link">Congregações</Button></Link>
        )}
        {(selectedMembership?.role === 'Admin' || selectedMembership?.role === 'Dirigente') && (
            <>
                <Link to="/membros"><Button variant="link">Membros</Button></Link> {/* Manage Invites/Roles */}
                <Link to="/bairros"><Button variant="link">Bairros</Button></Link>
                <Link to="/cartoes"><Button variant="link">Cartões</Button></Link>
                <Link to="/ruas"><Button variant="link">Ruas</Button></Link>
                <Link to="/imoveis"><Button variant="link">Imóveis</Button></Link>
                <Link to="/saidas-campo"><Button variant="link">Saídas</Button></Link>
                {/* <Link to="/relatorios"><Button variant="link">Relatórios</Button></Link> Add later */}
            </>
        )}
      </nav>
      <main className="flex-grow p-4">
        <Outlet /> {/* Child routes will render here */}
      </main>
      <Toaster /> {/* For showing notifications */}
    </div>
  );
};

// Wrapper for routes requiring login and congregation selection
const ProtectedLayout = () => {
  const { currentUser, loading, userMemberships, selectedMembership } = useAuth();

  if (loading) {
    return <div>Carregando...</div>; // Or a spinner component
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If user is logged in but has multiple memberships and hasn't selected one
  if (userMemberships.length > 1 && !selectedMembership) {
    return <CongregacaoSelector />;
  }

  // If user is logged in but has no memberships (e.g., invite pending or error)
  if (userMemberships.length === 0 && !loading) {
      // TODO: Show a more informative page (e.g., "Waiting for invite acceptance" or "No congregations assigned")
      return (
          <div>
              <p>Você está logado como {currentUser.email}, mas não está associado a nenhuma congregação ativa ou seu convite está pendente.</p>
              <p>Se você acabou de aceitar um convite, tente atualizar a página.</p>
              <p>Entre em contato com o administrador da sua congregação se o problema persistir.</p>
              <Button onClick={() => auth.signOut()} className="mt-4">Sair</Button>
          </div>
      );
  }

  // If user is logged in and has a selected membership (or only one)
  return <MainLayout />;
};

// Wrapper for routes requiring Admin role within the selected congregation
const AdminRouteGuard = () => {
    const { selectedMembership, loading } = useAuth();
    if (loading) return <div>Carregando...</div>;
    return selectedMembership?.role === 'Admin' ? <Outlet /> : <Navigate to="/" replace />;
};

// Wrapper for routes requiring Dirigente or Admin role
const DirigenteOrAdminRouteGuard = () => {
    const { selectedMembership, loading } = useAuth();
    if (loading) return <div>Carregando...</div>;
    return (selectedMembership?.role === 'Admin' || selectedMembership?.role === 'Dirigente') ? <Outlet /> : <Navigate to="/" replace />;
};


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginForm />} />
          <Route path="/signup" element={<SignupForm />} />
          {/* TODO: Add route for accepting invites */}
          {/* <Route path="/accept-invite/:tokenId" element={<AcceptInvitePage />} /> */}
          <Route path="/publicador/:ruaId/:face/:token" element={<PublicadorViewPage />} /> {/* Added token */}

          {/* Protected Routes (Require login and congregation selection) */}
          <Route element={<ProtectedLayout />}>
            {/* General Home/Dashboard accessible to all logged-in users with a selected context */}
            <Route path="/" element={<div>Dashboard Inicial (Conteúdo a definir)</div>} />

            {/* Routes requiring Admin or Dirigente role */}
            <Route element={<DirigenteOrAdminRouteGuard />}>
                <Route path="/membros" element={<DirigentesPage />} /> {/* Reuse DirigentesPage or create MembrosPage */}
                <Route path="/bairros" element={<BairrosPage />} />
                <Route path="/cartoes" element={<CartoesTerritorioPage />} />
                <Route path="/ruas" element={<RuasPage />} />
                <Route path="/imoveis" element={<ImoveisPage />} />
                <Route path="/saidas-campo" element={<SaidasCampoPage />} />
                <Route path="/visualizar-rua/:ruaId" element={<StreetViewPage />} />
                {/* <Route path="/relatorios" element={<ReportsPage />} /> Add later */}
            </Route>

            {/* Routes requiring only Admin role */}
            <Route element={<AdminRouteGuard />}>
                <Route path="/congregacoes" element={<CongregacoesPage />} />
                {/* Add other admin-specific routes, e.g., system settings */}
            </Route>

          </Route>

          {/* Catch-all for 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

