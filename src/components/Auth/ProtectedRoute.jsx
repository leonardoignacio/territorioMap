import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Protects routes that require any authenticated user
function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    // Optional: Show a loading spinner or skeleton screen
    return <div>Carregando...</div>; 
  }

  if (!currentUser) {
    // User not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  // User is logged in, render the requested component/page
  return children ? children : <Outlet />;
}

// Protects routes that require an authenticated user who is also a Dirigente
function DirigenteRoute({ children }) {
    const { currentUser, isDirigente, loading } = useAuth();

    if (loading) {
        return <div>Carregando...</div>; 
    }

    if (!currentUser) {
        // Not logged in
        return <Navigate to="/login" replace />;
    }

    if (!isDirigente) {
        // Logged in, but not a dirigente - redirect to a suitable page (e.g., home or an unauthorized page)
        console.warn("Acesso negado: Rota apenas para dirigentes.");
        // You might want to create a specific 'Unauthorized' page
        return <Navigate to="/" replace />; 
    }

    // User is logged in and is a dirigente
    return children ? children : <Outlet />;
}

export { ProtectedRoute, DirigenteRoute };

