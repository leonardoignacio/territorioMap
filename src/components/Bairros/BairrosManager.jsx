import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash2, Edit } from 'lucide-react'; // Icons

// Component to manage Bairros CRUD
function BairrosManager() {
  const [bairros, setBairros] = useState([]);
  const [congregacoes, setCongregacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newBairroData, setNewBairroData] = useState({ nome: '', congregacaoId: '' });
  const [editingBairro, setEditingBairro] = useState(null); // { id: string, nome: string, congregacaoId: string }
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bairroToDelete, setBairroToDelete] = useState(null); // { id: string, nome: string }

  // Fetch congregations and bairros
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch Congregations
      const congSnapshot = await getDocs(collection(db, 'congregacoes'));
      const listaCongregacoes = congSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCongregacoes(listaCongregacoes);

      // Fetch Bairros
      const bairroSnapshot = await getDocs(collection(db, 'bairros'));
      const listaBairros = bairroSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Find congregation name for display
        congregacaoNome: listaCongregacoes.find(c => c.id === doc.data().congregacaoId)?.nome || 'Desconhecida'
      }));
      setBairros(listaBairros);

    } catch (err) {
      console.error("Erro ao buscar dados: ", err);
      setError('Falha ao carregar bairros ou congregações.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Add bairro
  const handleAddBairro = async (e) => {
    e.preventDefault();
    if (!newBairroData.nome.trim() || !newBairroData.congregacaoId) {
      setError('Nome do bairro e congregação são obrigatórios.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await addDoc(collection(db, 'bairros'), {
        nome: newBairroData.nome,
        congregacaoId: newBairroData.congregacaoId
      });
      setNewBairroData({ nome: '', congregacaoId: '' });
      setIsAddDialogOpen(false); // Close dialog on success
      fetchData(); // Refresh list
    } catch (err) {
      console.error("Erro ao adicionar bairro: ", err);
      setError('Falha ao adicionar bairro.');
      setLoading(false);
    }
  };

  // Edit bairro
  const handleEditBairro = async (e) => {
    e.preventDefault();
    if (!editingBairro || !editingBairro.nome.trim() || !editingBairro.congregacaoId) {
        setError('Nome do bairro e congregação são obrigatórios.');
        return;
    }
    setLoading(true);
    setError('');
    try {
      const bairroRef = doc(db, 'bairros', editingBairro.id);
      await updateDoc(bairroRef, {
          nome: editingBairro.nome,
          congregacaoId: editingBairro.congregacaoId
      });
      setEditingBairro(null);
      setIsEditDialogOpen(false); // Close dialog
      fetchData(); // Refresh list
    } catch (err) {
      console.error("Erro ao editar bairro: ", err);
      setError('Falha ao editar bairro.');
      setLoading(false);
    }
  };

  // Delete bairro
  const handleDeleteBairro = async () => {
    if (!bairroToDelete) return;
    setLoading(true);
    setError('');
    try {
      // Optional: Check for dependencies (CartoesTerritorio)
      const cartoesQuery = query(collection(db, 'cartoesTerritorio'), where('bairroId', '==', bairroToDelete.id));
      const cartoesSnapshot = await getDocs(cartoesQuery);
      if (!cartoesSnapshot.empty) {
          throw new Error('Existem cartões de território vinculados a este bairro.');
      }

      await deleteDoc(doc(db, 'bairros', bairroToDelete.id));
      setBairroToDelete(null);
      setIsDeleteDialogOpen(false); // Close dialog
      fetchData(); // Refresh list
    } catch (err) {
      console.error("Erro ao deletar bairro: ", err);
      setError(err.message || 'Falha ao deletar bairro. Verifique se existem cartões de território vinculados.');
      setLoading(false);
      // Keep dialog open on error
      // setIsDeleteDialogOpen(false);
    }
  };

  const openEditDialog = (bairro) => {
    setEditingBairro({ ...bairro });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (bairro) => {
    setBairroToDelete(bairro);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Gerenciar Bairros</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Add Bairro Dialog Trigger */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogTrigger asChild>
          <Button className="mb-4" disabled={congregacoes.length === 0}>
            {congregacoes.length === 0 ? 'Cadastre Congregações Primeiro' : 'Adicionar Bairro'}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Bairro</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddBairro}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nome" className="text-right">
                  Nome
                </Label>
                <Input
                  id="nome"
                  value={newBairroData.nome}
                  onChange={(e) => setNewBairroData({ ...newBairroData, nome: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="congregacao" className="text-right">
                  Congregação
                </Label>
                <Select
                  value={newBairroData.congregacaoId}
                  onValueChange={(value) => setNewBairroData({ ...newBairroData, congregacaoId: value })}
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
                 <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={loading || !newBairroData.nome.trim() || !newBairroData.congregacaoId}>
                {loading ? 'Adicionando...' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bairros Table */}
      {loading && !bairros.length ? (
        <p>Carregando bairros...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Congregação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bairros.map((bairro) => (
              <TableRow key={bairro.id}>
                <TableCell>{bairro.nome}</TableCell>
                <TableCell>{bairro.congregacaoNome}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(bairro)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(bairro)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {bairros.length === 0 && !loading && <p className="mt-4 text-center text-muted-foreground">Nenhum bairro encontrado.</p>}

      {/* Edit Bairro Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Bairro</DialogTitle>
          </DialogHeader>
          {editingBairro && (
            <form onSubmit={handleEditBairro}>
              <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-nome" className="text-right">
                        Nome
                    </Label>
                    <Input
                        id="edit-nome"
                        value={editingBairro.nome}
                        onChange={(e) => setEditingBairro({ ...editingBairro, nome: e.target.value })}
                        className="col-span-3"
                        required
                    />
                 </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-congregacao" className="text-right">
                        Congregação
                    </Label>
                    <Select
                        value={editingBairro.congregacaoId}
                        onValueChange={(value) => setEditingBairro({ ...editingBairro, congregacaoId: value })}
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
                    <Button type="button" variant="outline" onClick={() => setEditingBairro(null)}>Cancelar</Button>
                 </DialogClose>
                <Button type="submit" disabled={loading || !editingBairro.nome.trim() || !editingBairro.congregacaoId}>
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
              Tem certeza que deseja excluir o bairro "{bairroToDelete?.nome}"?
              Esta ação não pode ser desfeita. Verifique se não existem cartões de território vinculados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline" onClick={() => setBairroToDelete(null)}>Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDeleteBairro} disabled={loading}>
              {loading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default BairrosManager;

