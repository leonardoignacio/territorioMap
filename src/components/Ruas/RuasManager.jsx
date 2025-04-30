import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig'; // Adjust path as needed
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash2, Edit } from 'lucide-react'; // Icons

// Component to manage Ruas CRUD
function RuasManager() {
  const [ruas, setRuas] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [bairros, setBairros] = useState([]); // Need bairros to filter cartoes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newRuaData, setNewRuaData] = useState({ nome: '', cartaoTerritorioId: '' });
  const [editingRua, setEditingRua] = useState(null); // { id: string, nome: string, cartaoTerritorioId: string }
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [ruaToDelete, setRuaToDelete] = useState(null); // { id: string, nome: string }
  const [selectedBairroFilter, setSelectedBairroFilter] = useState(''); // Filter cartoes by bairro

  // Fetch bairros, cartoes, and ruas
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch Bairros
      const bairroSnapshot = await getDocs(collection(db, 'bairros'));
      const listaBairros = bairroSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBairros(listaBairros);

      // Fetch CartoesTerritorio
      const cartaoSnapshot = await getDocs(query(collection(db, 'cartoesTerritorio'), orderBy('bairroId'), orderBy('numero')));
      const listaCartoes = cartaoSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        bairroNome: listaBairros.find(b => b.id === doc.data().bairroId)?.nome || 'Desconhecido'
      }));
      setCartoes(listaCartoes);

      // Fetch Ruas
      const ruaSnapshot = await getDocs(query(collection(db, 'ruas'), orderBy('cartaoTerritorioId'), orderBy('nome'))); // Order for better display
      const listaRuas = ruaSnapshot.docs.map(doc => {
        const cartao = listaCartoes.find(c => c.id === doc.data().cartaoTerritorioId);
        return {
          id: doc.id,
          ...doc.data(),
          // Find cartao number and bairro name for display
          cartaoNumero: cartao?.numero || '?',
          bairroNome: cartao?.bairroNome || 'Desconhecido'
        };
      });
      setRuas(listaRuas);

    } catch (err) {
      console.error("Erro ao buscar dados: ", err);
      setError('Falha ao carregar ruas, cartões ou bairros.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Add rua
  const handleAddRua = async (e) => {
    e.preventDefault();
    if (!newRuaData.nome.trim() || !newRuaData.cartaoTerritorioId) {
      setError('Nome da rua e cartão de território são obrigatórios.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Optional: Check if street name already exists in this card
      const q = query(collection(db, 'ruas'),
                    where('cartaoTerritorioId', '==', newRuaData.cartaoTerritorioId),
                    where('nome', '==', newRuaData.nome.trim()));
      const existing = await getDocs(q);
      if (!existing.empty) {
          throw new Error(`A rua "${newRuaData.nome.trim()}" já existe neste cartão.`);
      }

      await addDoc(collection(db, 'ruas'), {
        nome: newRuaData.nome.trim(),
        cartaoTerritorioId: newRuaData.cartaoTerritorioId
      });
      setNewRuaData({ nome: '', cartaoTerritorioId: '' });
      setSelectedBairroFilter(''); // Reset filter
      setIsAddDialogOpen(false); // Close dialog on success
      fetchData(); // Refresh list
    } catch (err) {
      console.error("Erro ao adicionar rua: ", err);
      setError(err.message || 'Falha ao adicionar rua.');
      setLoading(false);
    }
  };

  // Edit rua
  const handleEditRua = async (e) => {
    e.preventDefault();
    if (!editingRua || !editingRua.nome.trim() || !editingRua.cartaoTerritorioId) {
        setError('Nome da rua e cartão de território são obrigatórios.');
        return;
    }
    setLoading(true);
    setError('');
    try {
        // Optional: Check if street name already exists in this card (excluding itself)
        const q = query(collection(db, 'ruas'),
                        where('cartaoTerritorioId', '==', editingRua.cartaoTerritorioId),
                        where('nome', '==', editingRua.nome.trim()));
        const existing = await getDocs(q);
        if (!existing.empty && existing.docs[0].id !== editingRua.id) {
            throw new Error(`A rua "${editingRua.nome.trim()}" já existe neste cartão.`);
        }

      const ruaRef = doc(db, 'ruas', editingRua.id);
      await updateDoc(ruaRef, {
          nome: editingRua.nome.trim(),
          cartaoTerritorioId: editingRua.cartaoTerritorioId
      });
      setEditingRua(null);
      setIsEditDialogOpen(false); // Close dialog
      fetchData(); // Refresh list
    } catch (err) {
      console.error("Erro ao editar rua: ", err);
      setError(err.message || 'Falha ao editar rua.');
      setLoading(false);
    }
  };

  // Delete rua
  const handleDeleteRua = async () => {
    if (!ruaToDelete) return;
    setLoading(true);
    setError('');
    try {
      // Check for dependencies (Imoveis)
      const imoveisQuery = query(collection(db, 'imoveis'), where('ruaId', '==', ruaToDelete.id));
      const imoveisSnapshot = await getDocs(imoveisQuery);
      if (!imoveisSnapshot.empty) {
          throw new Error('Existem imóveis vinculados a esta rua.');
      }

      await deleteDoc(doc(db, 'ruas', ruaToDelete.id));
      setRuaToDelete(null);
      setIsDeleteDialogOpen(false); // Close dialog
      fetchData(); // Refresh list
    } catch (err) {
      console.error("Erro ao deletar rua: ", err);
      setError(err.message || 'Falha ao deletar rua. Verifique se existem imóveis vinculados.');
      setLoading(false);
    }
  };

  const openEditDialog = (rua) => {
    setEditingRua({ ...rua });
    // Find the bairroId for the selected cartao to pre-select the filter
    const cartao = cartoes.find(c => c.id === rua.cartaoTerritorioId);
    setSelectedBairroFilter(cartao?.bairroId || '');
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (rua) => {
    setRuaToDelete(rua);
    setIsDeleteDialogOpen(true);
  };

  // Filter cartoes based on selected bairro for dropdowns
  const filteredCartoes = selectedBairroFilter
    ? cartoes.filter(c => c.bairroId === selectedBairroFilter)
    : cartoes;

  // Reset cartao selection when bairro changes in Add/Edit dialog
  const handleBairroFilterChange = (bairroId, isEditing = false) => {
      setSelectedBairroFilter(bairroId);
      if (isEditing && editingRua) {
          // If the current cartao doesn't belong to the new bairro, reset it
          const currentCartao = cartoes.find(c => c.id === editingRua.cartaoTerritorioId);
          if (currentCartao?.bairroId !== bairroId) {
              setEditingRua({ ...editingRua, cartaoTerritorioId: '' });
          }
      } else if (!isEditing) {
          setNewRuaData({ ...newRuaData, cartaoTerritorioId: '' });
      }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Gerenciar Ruas</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Add Rua Dialog Trigger */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogTrigger asChild>
          <Button className="mb-4" disabled={cartoes.length === 0}>
            {cartoes.length === 0 ? 'Cadastre Cartões Primeiro' : 'Adicionar Rua'}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Rua</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddRua}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-bairro-filter" className="text-right">
                  Bairro
                </Label>
                <Select
                  value={selectedBairroFilter}
                  onValueChange={(value) => handleBairroFilterChange(value, false)}
                  required
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione o bairro" />
                  </SelectTrigger>
                  <SelectContent>
                    {bairros.map((bairro) => (
                      <SelectItem key={bairro.id} value={bairro.id}>
                        {bairro.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-cartao" className="text-right">
                  Cartão
                </Label>
                <Select
                  value={newRuaData.cartaoTerritorioId}
                  onValueChange={(value) => setNewRuaData({ ...newRuaData, cartaoTerritorioId: value })}
                  required
                  disabled={!selectedBairroFilter}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={selectedBairroFilter ? "Selecione o cartão" : "Selecione um bairro primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCartoes.map((cartao) => (
                      <SelectItem key={cartao.id} value={cartao.id}>
                        {`Cartão ${cartao.numero}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-nome" className="text-right">
                  Nome da Rua
                </Label>
                <Input
                  id="add-nome"
                  value={newRuaData.nome}
                  onChange={(e) => setNewRuaData({ ...newRuaData, nome: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline" onClick={() => {setSelectedBairroFilter(''); setNewRuaData({ nome: '', cartaoTerritorioId: '' });}}>Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={loading || !newRuaData.cartaoTerritorioId || !newRuaData.nome.trim()}>
                {loading ? 'Adicionando...' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ruas Table */}
      {loading && !ruas.length ? (
        <p>Carregando ruas...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome da Rua</TableHead>
              <TableHead>Cartão</TableHead>
              <TableHead>Bairro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ruas.map((rua) => (
              <TableRow key={rua.id}>
                <TableCell>{rua.nome}</TableCell>
                <TableCell>{rua.cartaoNumero}</TableCell>
                <TableCell>{rua.bairroNome}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(rua)} disabled={cartoes.length === 0}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(rua)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {ruas.length === 0 && !loading && <p className="mt-4 text-center text-muted-foreground">Nenhuma rua encontrada.</p>}

      {/* Edit Rua Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Rua</DialogTitle>
          </DialogHeader>
          {editingRua && (
            <form onSubmit={handleEditRua}>
              <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-bairro-filter" className="text-right">
                        Bairro
                    </Label>
                    <Select
                        value={selectedBairroFilter} // Use the same filter state
                        onValueChange={(value) => handleBairroFilterChange(value, true)}
                        required
                    >
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Selecione o bairro" />
                        </SelectTrigger>
                        <SelectContent>
                            {bairros.map((bairro) => (
                            <SelectItem key={bairro.id} value={bairro.id}>
                                {bairro.nome}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-cartao" className="text-right">
                        Cartão
                    </Label>
                    <Select
                        value={editingRua.cartaoTerritorioId}
                        onValueChange={(value) => setEditingRua({ ...editingRua, cartaoTerritorioId: value })}
                        required
                        disabled={!selectedBairroFilter}
                    >
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder={selectedBairroFilter ? "Selecione o cartão" : "Selecione um bairro primeiro"} />
                        </SelectTrigger>
                        <SelectContent>
                            {filteredCartoes.map((cartao) => (
                            <SelectItem key={cartao.id} value={cartao.id}>
                                {`Cartão ${cartao.numero}`}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-nome" className="text-right">
                        Nome da Rua
                    </Label>
                    <Input
                        id="edit-nome"
                        value={editingRua.nome}
                        onChange={(e) => setEditingRua({ ...editingRua, nome: e.target.value })}
                        className="col-span-3"
                        required
                    />
                 </div>
              </div>
              <DialogFooter>
                 <DialogClose asChild>
                    <Button type="button" variant="outline" onClick={() => {setEditingRua(null); setSelectedBairroFilter('');}}>Cancelar</Button>
                 </DialogClose>
                <Button type="submit" disabled={loading || !editingRua.cartaoTerritorioId || !editingRua.nome.trim()}>
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
              Tem certeza que deseja excluir a rua "{ruaToDelete?.nome}" do cartão {ruaToDelete?.cartaoNumero} ({ruaToDelete?.bairroNome})?
              Esta ação não pode ser desfeita. Verifique se não existem imóveis vinculados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline" onClick={() => setRuaToDelete(null)}>Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDeleteRua} disabled={loading}>
              {loading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default RuasManager;

