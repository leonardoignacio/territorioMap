import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig'; // Adjust path as needed
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Edit } from 'lucide-react'; // Icons

// Component to manage Dirigentes (Leaders)
function DirigentesManager() {
  const [dirigentes, setDirigentes] = useState([]);
  const [congregacoes, setCongregacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingDirigente, setEditingDirigente] = useState(null); // { id: string, nome: string, email: string, congregacaoId: string }
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [dirigenteToDelete, setDirigenteToDelete] = useState(null); // { id: string, nome: string }

  // Fetch congregations and dirigentes
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch Congregations
      const congSnapshot = await getDocs(collection(db, 'congregacoes'));
      const listaCongregacoes = congSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCongregacoes(listaCongregacoes);

      // Fetch Dirigentes
      // Note: Dirigente ID is the same as Firebase Auth User ID
      const dirigenteSnapshot = await getDocs(collection(db, 'dirigentes'));
      const listaDirigentes = dirigenteSnapshot.docs.map(doc => ({
        id: doc.id, // This is the userId
        ...doc.data(),
        // Find congregation name for display
        congregacaoNome: listaCongregacoes.find(c => c.id === doc.data().congregacaoId)?.nome || 'Desconhecida'
      }));
      setDirigentes(listaDirigentes);

    } catch (err) {
      console.error("Erro ao buscar dados: ", err);
      setError('Falha ao carregar dirigentes ou congregações.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Edit dirigente (Name and Congregation)
  const handleEditDirigente = async (e) => {
    e.preventDefault();
    if (!editingDirigente || !editingDirigente.nome.trim() || !editingDirigente.congregacaoId) {
        setError('Nome do dirigente e congregação são obrigatórios.');
        return;
    }
    setLoading(true);
    setError('');
    try {
      const dirigenteRef = doc(db, 'dirigentes', editingDirigente.id); // Use ID (userId) to find doc
      await updateDoc(dirigenteRef, {
          nome: editingDirigente.nome,
          congregacaoId: editingDirigente.congregacaoId
          // Email is generally not edited here as it's part of auth
      });
      setEditingDirigente(null);
      setIsEditDialogOpen(false); // Close dialog
      fetchData(); // Refresh list
    } catch (err) {
      console.error("Erro ao editar dirigente: ", err);
      setError('Falha ao editar dirigente.');
      setLoading(false);
    }
  };

  // Delete dirigente Firestore record (does not delete Auth user)
  const handleDeleteDirigente = async () => {
    if (!dirigenteToDelete) return;
    setLoading(true);
    setError('');
    try {
      // TODO: Add check for dependencies like SaidaCampo records before deleting.
      // For now, just deleting the Firestore record.
      await deleteDoc(doc(db, 'dirigentes', dirigenteToDelete.id));
      setDirigenteToDelete(null);
      setIsDeleteDialogOpen(false); // Close dialog
      fetchData(); // Refresh list
    } catch (err) {
      console.error("Erro ao deletar dirigente: ", err);
      setError('Falha ao deletar dirigente. Verifique dependências (saídas de campo).');
      setLoading(false);
    }
  };

  const openEditDialog = (dirigente) => {
    setEditingDirigente({ ...dirigente });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (dirigente) => {
    setDirigenteToDelete(dirigente);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Gerenciar Dirigentes</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Dirigentes Table */}
      {loading && !dirigentes.length ? (
        <p>Carregando dirigentes...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Congregação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dirigentes.map((dirigente) => (
              <TableRow key={dirigente.id}>
                <TableCell>{dirigente.nome}</TableCell>
                <TableCell>{dirigente.email}</TableCell> {/* Display email */} 
                <TableCell>{dirigente.congregacaoNome}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(dirigente)} disabled={congregacoes.length === 0}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(dirigente)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {dirigentes.length === 0 && !loading && <p className="mt-4 text-center text-muted-foreground">Nenhum dirigente encontrado.</p>}

      {/* Edit Dirigente Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Dirigente</DialogTitle>
          </DialogHeader>
          {editingDirigente && (
            <form onSubmit={handleEditDirigente}>
              <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-nome" className="text-right">
                        Nome
                    </Label>
                    <Input
                        id="edit-nome"
                        value={editingDirigente.nome}
                        onChange={(e) => setEditingDirigente({ ...editingDirigente, nome: e.target.value })}
                        className="col-span-3"
                        required
                    />
                 </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-email" className="text-right">
                        Email
                    </Label>
                    <Input
                        id="edit-email"
                        value={editingDirigente.email}
                        className="col-span-3"
                        disabled // Email is usually not editable here
                    />
                 </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-congregacao" className="text-right">
                        Congregação
                    </Label>
                    <Select
                        value={editingDirigente.congregacaoId}
                        onValueChange={(value) => setEditingDirigente({ ...editingDirigente, congregacaoId: value })}
                        required
                    >
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Selecione a congregação" />
                        </SelectTrigger>
                        <SelectContent>
                            {congregacoes.map((cong) => (
                            <SelectItem key={cong.id} value={cong.id}>
                                {cong.nome}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
              </div>
              <DialogFooter>
                 <DialogClose asChild>
                    <Button type="button" variant="outline" onClick={() => setEditingDirigente(null)}>Cancelar</Button>
                 </DialogClose>
                <Button type="submit" disabled={loading || !editingDirigente.nome.trim() || !editingDirigente.congregacaoId}>
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o status de dirigente para "{dirigenteToDelete?.nome}"?
              Esta ação removerá o registro do dirigente no Firestore, mas NÃO excluirá a conta de usuário do Firebase Authentication.
              Verifique se não há dependências importantes (como saídas de campo registradas).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline" onClick={() => setDirigenteToDelete(null)}>Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDeleteDirigente} disabled={loading}>
              {loading ? 'Excluindo...' : 'Remover Dirigente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default DirigentesManager;

