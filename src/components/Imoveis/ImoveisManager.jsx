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

// Component to manage Imoveis CRUD
function ImoveisManager() {
  const [imoveis, setImoveis] = useState([]);
  const [ruas, setRuas] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [bairros, setBairros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newImovelData, setNewImovelData] = useState({ numero: '', lado: '', ruaId: '' });
  const [editingImovel, setEditingImovel] = useState(null); // { id: string, numero: string, lado: string, ruaId: string }
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [imovelToDelete, setImovelToDelete] = useState(null); // { id: string, numero: string }

  // Filters for dropdowns
  const [selectedBairroFilter, setSelectedBairroFilter] = useState('');
  const [selectedCartaoFilter, setSelectedCartaoFilter] = useState('');

  // Fetch related data and imoveis
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
      const ruaSnapshot = await getDocs(query(collection(db, 'ruas'), orderBy('cartaoTerritorioId'), orderBy('nome')));
      const listaRuas = ruaSnapshot.docs.map(doc => {
        const cartao = listaCartoes.find(c => c.id === doc.data().cartaoTerritorioId);
        return {
          id: doc.id,
          ...doc.data(),
          cartaoNumero: cartao?.numero || '?',
          bairroNome: cartao?.bairroNome || 'Desconhecido'
        };
      });
      setRuas(listaRuas);

      // Fetch Imoveis
      const imovelSnapshot = await getDocs(query(collection(db, 'imoveis'), orderBy('ruaId'), orderBy('lado'), orderBy('numero'))); // Order for better display
      const listaImoveis = imovelSnapshot.docs.map(doc => {
        const rua = listaRuas.find(r => r.id === doc.data().ruaId);
        return {
          id: doc.id,
          ...doc.data(),
          ruaNome: rua?.nome || 'Desconhecida',
          cartaoNumero: rua?.cartaoNumero || '?',
          bairroNome: rua?.bairroNome || 'Desconhecido'
        };
      });
      setImoveis(listaImoveis);

    } catch (err) {
      console.error("Erro ao buscar dados: ", err);
      setError('Falha ao carregar imóveis ou dados relacionados.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Add imovel
  const handleAddImovel = async (e) => {
    e.preventDefault();
    if (!newImovelData.numero.trim() || !newImovelData.lado || !newImovelData.ruaId) {
      setError('Número, lado e rua são obrigatórios.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Check if imovel number/lado combination already exists on this street
      const q = query(collection(db, 'imoveis'),
                    where('ruaId', '==', newImovelData.ruaId),
                    where('numero', '==', newImovelData.numero.trim()),
                    where('lado', '==', newImovelData.lado));
      const existing = await getDocs(q);
      if (!existing.empty) {
          throw new Error(`O imóvel número ${newImovelData.numero.trim()} (${newImovelData.lado}) já existe nesta rua.`);
      }

      await addDoc(collection(db, 'imoveis'), {
        numero: newImovelData.numero.trim(),
        lado: newImovelData.lado,
        ruaId: newImovelData.ruaId,
        status: 'Não Trabalhado', // Default status
        moradorNome: '',
        observacoes: '',
        ultimaAtualizacao: null,
        atualizadoPorUrlToken: ''
      });
      setNewImovelData({ numero: '', lado: '', ruaId: '' });
      setSelectedBairroFilter('');
      setSelectedCartaoFilter('');
      setIsAddDialogOpen(false); // Close dialog on success
      fetchData(); // Refresh list
    } catch (err) {
      console.error("Erro ao adicionar imóvel: ", err);
      setError(err.message || 'Falha ao adicionar imóvel.');
      setLoading(false);
    }
  };

  // Edit imovel
  const handleEditImovel = async (e) => {
    e.preventDefault();
    if (!editingImovel || !editingImovel.numero.trim() || !editingImovel.lado || !editingImovel.ruaId) {
        setError('Número, lado e rua são obrigatórios.');
        return;
    }
    setLoading(true);
    setError('');
    try {
      // Check if imovel number/lado combination already exists on this street (excluding itself)
      const q = query(collection(db, 'imoveis'),
                    where('ruaId', '==', editingImovel.ruaId),
                    where('numero', '==', editingImovel.numero.trim()),
                    where('lado', '==', editingImovel.lado));
      const existing = await getDocs(q);
      if (!existing.empty && existing.docs[0].id !== editingImovel.id) {
          throw new Error(`O imóvel número ${editingImovel.numero.trim()} (${editingImovel.lado}) já existe nesta rua.`);
      }

      const imovelRef = doc(db, 'imoveis', editingImovel.id);
      await updateDoc(imovelRef, {
          numero: editingImovel.numero.trim(),
          lado: editingImovel.lado,
          ruaId: editingImovel.ruaId
          // Status and other fields are updated by publicador
      });
      setEditingImovel(null);
      setIsEditDialogOpen(false); // Close dialog
      fetchData(); // Refresh list
    } catch (err) {
      console.error("Erro ao editar imóvel: ", err);
      setError(err.message || 'Falha ao editar imóvel.');
      setLoading(false);
    }
  };

  // Delete imovel
  const handleDeleteImovel = async () => {
    if (!imovelToDelete) return;
    setLoading(true);
    setError('');
    try {
      // No typical dependencies to check for imovel, but could add checks if needed
      await deleteDoc(doc(db, 'imoveis', imovelToDelete.id));
      setImovelToDelete(null);
      setIsDeleteDialogOpen(false); // Close dialog
      fetchData(); // Refresh list
    } catch (err) {
      console.error("Erro ao deletar imóvel: ", err);
      setError('Falha ao deletar imóvel.');
      setLoading(false);
    }
  };

  const openEditDialog = (imovel) => {
    setEditingImovel({ ...imovel });
    // Pre-select filters based on the imovel's rua
    const rua = ruas.find(r => r.id === imovel.ruaId);
    const cartao = cartoes.find(c => c.id === rua?.cartaoTerritorioId);
    setSelectedBairroFilter(cartao?.bairroId || '');
    setSelectedCartaoFilter(rua?.cartaoTerritorioId || '');
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (imovel) => {
    setImovelToDelete(imovel);
    setIsDeleteDialogOpen(true);
  };

  // Filter logic for dropdowns
  const filteredCartoes = selectedBairroFilter
    ? cartoes.filter(c => c.bairroId === selectedBairroFilter)
    : [];
  const filteredRuas = selectedCartaoFilter
    ? ruas.filter(r => r.cartaoTerritorioId === selectedCartaoFilter)
    : [];

  // Handle filter changes and reset dependent selections
  const handleBairroFilterChange = (bairroId, isEditing = false) => {
      setSelectedBairroFilter(bairroId);
      setSelectedCartaoFilter(''); // Reset cartao filter
      if (isEditing && editingImovel) {
          setEditingImovel({ ...editingImovel, ruaId: '' }); // Reset rua selection
      } else if (!isEditing) {
          setNewImovelData({ ...newImovelData, ruaId: '' }); // Reset rua selection
      }
  };

  const handleCartaoFilterChange = (cartaoId, isEditing = false) => {
      setSelectedCartaoFilter(cartaoId);
      if (isEditing && editingImovel) {
          setEditingImovel({ ...editingImovel, ruaId: '' }); // Reset rua selection
      } else if (!isEditing) {
          setNewImovelData({ ...newImovelData, ruaId: '' }); // Reset rua selection
      }
  };


  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Gerenciar Imóveis</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Add Imovel Dialog Trigger */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogTrigger asChild>
          <Button className="mb-4" disabled={ruas.length === 0}>
            {ruas.length === 0 ? 'Cadastre Ruas Primeiro' : 'Adicionar Imóvel'}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Imóvel</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddImovel}>
            <div className="grid gap-4 py-4">
              {/* Bairro Filter */}
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
              {/* Cartao Filter */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-cartao-filter" className="text-right">
                  Cartão
                </Label>
                <Select
                  value={selectedCartaoFilter}
                  onValueChange={(value) => handleCartaoFilterChange(value, false)}
                  required
                  disabled={!selectedBairroFilter}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={selectedBairroFilter ? "Selecione o cartão" : "Selecione bairro"} />
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
              {/* Rua Selection */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-rua" className="text-right">
                  Rua
                </Label>
                <Select
                  value={newImovelData.ruaId}
                  onValueChange={(value) => setNewImovelData({ ...newImovelData, ruaId: value })}
                  required
                  disabled={!selectedCartaoFilter}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={selectedCartaoFilter ? "Selecione a rua" : "Selecione cartão"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRuas.map((rua) => (
                      <SelectItem key={rua.id} value={rua.id}>
                        {rua.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Numero Input */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-numero" className="text-right">
                  Número
                </Label>
                <Input
                  id="add-numero"
                  value={newImovelData.numero}
                  onChange={(e) => setNewImovelData({ ...newImovelData, numero: e.target.value })}
                  className="col-span-3"
                  placeholder="Ex: 123, 45A, S/N"
                  required
                />
              </div>
              {/* Lado Selection */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-lado" className="text-right">
                  Lado
                </Label>
                <Select
                  value={newImovelData.lado}
                  onValueChange={(value) => setNewImovelData({ ...newImovelData, lado: value })}
                  required
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione o lado da rua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="par">Par</SelectItem>
                    <SelectItem value="impar">Ímpar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline" onClick={() => {setNewImovelData({ numero: '', lado: '', ruaId: '' }); setSelectedBairroFilter(''); setSelectedCartaoFilter('');}}>Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={loading || !newImovelData.ruaId || !newImovelData.numero.trim() || !newImovelData.lado}>
                {loading ? 'Adicionando...' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Imoveis Table */}
      {loading && !imoveis.length ? (
        <p>Carregando imóveis...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Lado</TableHead>
              <TableHead>Rua</TableHead>
              <TableHead>Cartão</TableHead>
              <TableHead>Bairro</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {imoveis.map((imovel) => (
              <TableRow key={imovel.id}>
                <TableCell>{imovel.numero}</TableCell>
                <TableCell>{imovel.lado === 'par' ? 'Par' : 'Ímpar'}</TableCell>
                <TableCell>{imovel.ruaNome}</TableCell>
                <TableCell>{imovel.cartaoNumero}</TableCell>
                <TableCell>{imovel.bairroNome}</TableCell>
                <TableCell>{imovel.status || 'Não Trabalhado'}</TableCell> {/* Display status */}
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(imovel)} disabled={ruas.length === 0}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(imovel)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {imoveis.length === 0 && !loading && <p className="mt-4 text-center text-muted-foreground">Nenhum imóvel encontrado.</p>}

      {/* Edit Imovel Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Editar Imóvel</DialogTitle>
          </DialogHeader>
          {editingImovel && (
            <form onSubmit={handleEditImovel}>
              <div className="grid gap-4 py-4">
                {/* Bairro Filter */}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-bairro-filter" className="text-right">Bairro</Label>
                    <Select value={selectedBairroFilter} onValueChange={(value) => handleBairroFilterChange(value, true)} required>
                        <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecione o bairro" /></SelectTrigger>
                        <SelectContent>{bairros.map((b) => (<SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>))}</SelectContent>
                    </Select>
                </div>
                {/* Cartao Filter */}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-cartao-filter" className="text-right">Cartão</Label>
                    <Select value={selectedCartaoFilter} onValueChange={(value) => handleCartaoFilterChange(value, true)} required disabled={!selectedBairroFilter}>
                        <SelectTrigger className="col-span-3"><SelectValue placeholder={selectedBairroFilter ? "Selecione o cartão" : "Selecione bairro"} /></SelectTrigger>
                        <SelectContent>{filteredCartoes.map((c) => (<SelectItem key={c.id} value={c.id}>{`Cartão ${c.numero}`}</SelectItem>))}</SelectContent>
                    </Select>
                </div>
                {/* Rua Selection */}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-rua" className="text-right">Rua</Label>
                    <Select value={editingImovel.ruaId} onValueChange={(value) => setEditingImovel({ ...editingImovel, ruaId: value })} required disabled={!selectedCartaoFilter}>
                        <SelectTrigger className="col-span-3"><SelectValue placeholder={selectedCartaoFilter ? "Selecione a rua" : "Selecione cartão"} /></SelectTrigger>
                        <SelectContent>{filteredRuas.map((r) => (<SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>))}</SelectContent>
                    </Select>
                </div>
                {/* Numero Input */}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-numero" className="text-right">Número</Label>
                    <Input id="edit-numero" value={editingImovel.numero} onChange={(e) => setEditingImovel({ ...editingImovel, numero: e.target.value })} className="col-span-3" required />
                </div>
                {/* Lado Selection */}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-lado" className="text-right">Lado</Label>
                    <Select value={editingImovel.lado} onValueChange={(value) => setEditingImovel({ ...editingImovel, lado: value })} required>
                        <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecione o lado" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="par">Par</SelectItem>
                            <SelectItem value="impar">Ímpar</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </div>
              <DialogFooter>
                 <DialogClose asChild>
                    <Button type="button" variant="outline" onClick={() => {setEditingImovel(null); setSelectedBairroFilter(''); setSelectedCartaoFilter('');}}>Cancelar</Button>
                 </DialogClose>
                <Button type="submit" disabled={loading || !editingImovel.ruaId || !editingImovel.numero.trim() || !editingImovel.lado}>
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
              Tem certeza que deseja excluir o imóvel número "{imovelToDelete?.numero}" ({imovelToDelete?.lado}) da rua "{imovelToDelete?.ruaNome}"?
              Esta ação não pode ser desfeita e removerá o histórico de visitas associado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline" onClick={() => setImovelToDelete(null)}>Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDeleteImovel} disabled={loading}>
              {loading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default ImoveisManager;

