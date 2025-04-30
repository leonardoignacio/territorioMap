import React from 'react';
import StreetViewDirigente from '../../components/StreetView/StreetViewDirigente'; // Adjust path as needed
import { useAuth } from '../../contexts/AuthContext'; // Check if user is dirigente
import { Navigate } from 'react-router-dom';

function StreetViewPage() {
  const { isDirigente, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>; // Or a loading spinner
  }

  // Although DirigenteRoute should protect this, double-check here
  if (!isDirigente) {
    console.warn("Acesso não autorizado à visualização de rua do dirigente.");
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      {/* You can add a page layout wrapper here if needed */}
      <StreetViewDirigente />
    </div>
  );
}

export default StreetViewPage;

