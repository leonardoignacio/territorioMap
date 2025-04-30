import React, { useContext } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Component to allow users with multiple memberships to select a congregation context
function CongregacaoSelector() {
  const { userMemberships, selectedMembership, selectCongregacaoContext, congregacaoDetails, loading } = useAuth();

  if (loading || !userMemberships || userMemberships.length <= 1) {
    // Don't show selector if loading, no memberships, or only one (already auto-selected)
    return null;
  }

  const handleSelectionChange = (membershipId) => {
    const selected = userMemberships.find(m => m.id === membershipId);
    if (selected) {
      selectCongregacaoContext(selected);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Selecionar Congregação</CardTitle>
          <CardDescription>Você pertence a mais de uma congregação. Por favor, selecione em qual contexto deseja trabalhar.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handleSelectionChange} defaultValue={selectedMembership?.id}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha uma congregação..." />
            </SelectTrigger>
            <SelectContent>
              {userMemberships.map((membership) => (
                <SelectItem key={membership.id} value={membership.id}>
                  {congregacaoDetails[membership.congregacaoId] || membership.congregacaoId} ({membership.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}

export default CongregacaoSelector;

