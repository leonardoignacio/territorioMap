import React, { useState, useEffect, useContext } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch, query, where } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { AuthContext } from '../../contexts/AuthContext'; // Import AuthContext
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Trash2, Edit } from 'lucide-react'; // Icons

// Component to manage Congregations CRUD
function CongregacoesManager() {
  const [congregacoes, setCongregacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCongregacaoName, setNewCongregacaoName] = useState('');
  const [editingCongregacao, setEditingCongregacao] = useState(null); // { id: string, nome: string, criadaPorUserId: string }
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [congregacaoToDelete, setCongregacaoToDelete] = useState(null); // { id: string, nome: string }

  const { currentUser } = useContext(AuthContext); // Get current user

  // Fetch congregations - TODO: Refine to fetch based on user membership/role later
  const fetchCongregacoes = async () => {
    setLoading(true);
    setError('');
    try {
      // For now, fetch all congregations. Access control should be added.
      const querySnapshot = await getDocs(collection(db, 'congregacoes'));
      const listaCongregacoes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCongregacoes(listaCongregacoes);
    } catch (err) {
      console.error("Erro ao buscar congregações: ", err);
      setError('Falha ao carregar congregações.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCongregacoes();
  }, []);

  // Add congregation and set creator as Admin
  const handleAddCongregacao = async (e) => {
    e.preventDefault();
    if (!newCongregacaoName.trim() || !currentUser) {
        setError('Você precisa estar logado para criar uma congregação.');
        return;
    }
    setLoading(true);
    setError('');
    try {
      const batch = writeBatch(db);

      // 1. Create Congregation document
      const congregacaoRef = doc(collection(db, 'congregacoes'));
      batch.set(congregacaoRef, {
        nome: newCongregacaoName,
        criadaPorUserId: currentUser.uid // Link creator
      });

      // 2. Create MembroCongregacao document for the creator as Admin
      const membroRef = doc(collection(db, 'membrosCongregacao'));
      batch.set(membroRef, {
        userId: currentUser.uid,
        congregacaoId: congregacaoRef.id,
        role: 'Admin',
        status: 'Ativo',
        // dataConvite: serverTimestamp(), // Optional: track when added
      });

      await batch.commit();

      setNewCongregacaoName('');
      setIsAddDialogOpen(false);
      fetchCongregacoes(); // Refresh list
    } catch (err) {
      console.error("Erro ao adicionar congregação e membro: ", err);
      setError('Falha ao adicionar congregação.');
      setLoading(false); // Ensure loading is set to false on error
    }
    // setLoading(false) is handled by fetchCongregacoes on success
  };

  // Edit congregation - TODO: Add role check (only Admin of this cong)
  const handleEditCongregacao = async (e) => {
    e.preventDefault();
    if (!editingCongregacao || !editingCongregacao.nome.trim() || !currentUser) return;
    // TODO: Check if currentUser is Admin for editingCongregacao.congregacaoId
    setLoading(true);
    setError('');
    try {
      const congregacaoRef = doc(db, 'congregacoes', editingCongregacao.id);
      await updateDoc(congregacaoRef, { nome: editingCongregacao.nome });
      setEditingCongregacao(null);
      setIsEditDialogOpen(false);
      fetchCongregacoes();
    } catch (err) {
      console.error("Erro ao editar congregação: ", err);
      setError('Falha ao editar congregação.');
      setLoading(false);
    }
  };

  // Delete congregation - TODO: Add role check and dependency checks
  const handleDeleteCongregacao = async () => {
    if (!congregacaoToDelete || !currentUser) return;
    // TODO: Check if currentUser is Admin for congregacaoToDelete.id
    // TODO: Check for dependencies (bairros, membrosCongregacao other than creator) before deleting
    setLoading(true);
    setError('');
    try {
      // Simple delete for now, needs refinement
      await deleteDoc(doc(db, 'congregacoes', congregacaoToDelete.id));
      // TODO: Delete associated MembroCongregacao entries in a batch/transaction
      setCongregacaoToDelete(null);
      setIsDeleteDialogOpen(false);
      fetchCongregacoes();
    } catch (err) {
      console.error("Erro ao deletar congregação: ", err);
      setError('Falha ao deletar congregação. Verifique as permissões e dependências.');
      setLoading(false);
    }
  };

  const openEditDialog = (cong) => {
    // TODO: Add permission check before opening
    setEditingCongregacao({ ...cong });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (cong) => {
    // TODO: Add permission check before opening
    setCongregacaoToDelete(cong);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Gerenciar Congregações</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Add Congregation Dialog Trigger */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogTrigger asChild>
          {/* Disable button if user is not logged in */}
          <Button className="mb-4" disabled={!currentUser}>
            Adicionar Congregação
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Congregação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCongregacao}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nome
                </Label>
                <Input
                  id="name"
                  value={newCongregacaoName}
                  onChange={(e) => setNewCongregacaoName(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={loading || !newCongregacaoName.trim() || !currentUser}>
                {loading ? 'Adicionando...' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Congregations Table */}
      {loading && !congregacoes.length ? (
        <p>Carregando congregações...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              {/* <TableHead>Administrador</TableHead> TODO: Show admin info */}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {congregacoes.map((cong) => (
              <TableRow key={cong.id}>
                <TableCell>{cong.nome}</TableCell>
                {/* <TableCell>{cong.criadaPorUserId}</TableCell> TODO: Fetch user name */}
                <TableCell className="text-right space-x-2">
                  {/* TODO: Conditionally render buttons based on user role for this cong */}
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(cong)} disabled={!currentUser /* Add role check */}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(cong)} className="text-red-500 hover:text-red-700" disabled={!currentUser /* Add role check */}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {congregacoes.length === 0 && !loading && <p className="mt-4 text-center text-muted-foreground">Nenhuma congregação encontrada.</p>}

      {/* Edit Congregation Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Congregação</DialogTitle>
          </DialogHeader>
          {editingCongregacao && (
            <form onSubmit={handleEditCongregacao}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="edit-name"
                    value={editingCongregacao.nome}
                    onChange={(e) => setEditingCongregacao({ ...editingCongregacao, nome: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                 <DialogClose asChild>
                    <Button type="button" variant="outline" onClick={() => setEditingCongregacao(null)}>Cancelar</Button>
                 </DialogClose>
                <Button type="submit" disabled={loading || !editingCongregacao.nome.trim() || !currentUser}>
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
              Tem certeza que deseja excluir a congregação "{congregacaoToDelete?.nome}"?
              Esta ação não pode ser desfeita e removerá todos os dados associados (bairros, cartões, etc.).
              {/* TODO: Add more specific warnings based on dependency checks */}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline" onClick={() => setCongregacaoToDelete(null)}>Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDeleteCongregacao} disabled={loading || !currentUser}>
              {loading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default CongregacoesManager;

