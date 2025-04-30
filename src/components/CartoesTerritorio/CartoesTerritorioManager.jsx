import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'; // Import storage functions
import { db, storage } from '../../config/firebaseConfig'; // Adjust path as needed, import storage
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash2, Edit, Upload } from 'lucide-react'; // Icons
import { v4 as uuidv4 } from 'uuid'; // For generating random filenames

// Function to generate a random filename with extension
const generateRandomFilename = (originalFilename) => {
  const extension = originalFilename.split('.').pop();
  return `${uuidv4()}.${extension}`;
};

// Component to manage CartoesTerritorio CRUD
function CartoesTerritorioManager() {
  const [cartoes, setCartoes] = useState([]);
  const [bairros, setBairros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false); // State for image upload
  const [error, setError] = useState('');
  const [newCartaoData, setNewCartaoData] = useState({ numero: '', bairroId: '', imagemFile: null, imagemNome: '' });
  const [editingCartao, setEditingCartao] = useState(null); // { id: string, numero: number, bairroId: string, imagemNome?: string, imagemFile?: File | null }
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [cartaoToDelete, setCartaoToDelete] = useState(null); // { id: string, numero: number, imagemNome?: string }
  const [nextNumero, setNextNumero] = useState(1);
  const addFileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  // Fetch bairros and cartoes
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

    } catch (err) {
      console.error("Erro ao buscar dados: ", err);
      setError('Falha ao carregar cartões ou bairros.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Function to find the next available number for a selected bairro
  const findNextNumero = (selectedBairroId) => {
    if (!selectedBairroId) return 1;
    const numerosDoBairro = cartoes
      .filter(c => c.bairroId === selectedBairroId)
      .map(c => c.numero)
      .sort((a, b) => a - b);

    let next = 1;
    for (const num of numerosDoBairro) {
        if (num === next) {
            next++;
        } else if (num > next) {
            break; // Found a gap
        }
    }
    return next;
  };

  // Update suggested number when bairro selection changes in Add Dialog
  useEffect(() => {
    if (isAddDialogOpen && newCartaoData.bairroId) {
      const nextNum = findNextNumero(newCartaoData.bairroId);
      setNextNumero(nextNum);
      if (!newCartaoData.numero) {
          setNewCartaoData(prev => ({ ...prev, numero: nextNum.toString() }));
      }
    }
  }, [newCartaoData.bairroId, isAddDialogOpen, cartoes]);

  // Check if number is unique within the selected bairro
  const isNumeroUnique = async (numero, bairroId, currentCartaoId = null) => {
    const num = parseInt(numero, 10);
    if (isNaN(num) || num <= 0) return false;

    const q = query(collection(db, 'cartoesTerritorio'),
                  where('bairroId', '==', bairroId),
                  where('numero', '==', num));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return true;

    if (currentCartaoId && snapshot.docs[0].id === currentCartaoId) {
        return true;
    }

    return false;
  };

  // Handle file selection
  const handleFileChange = (event, mode) => {
    const file = event.target.files ? event.target.files[0] : null;
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      if (mode === 'add') {
        setNewCartaoData(prev => ({ ...prev, imagemFile: file }));
      } else if (mode === 'edit' && editingCartao) {
        setEditingCartao(prev => ({ ...prev, imagemFile: file }));
      }
      setError(''); // Clear previous file errors
    } else if (file) {
      setError('Formato de imagem inválido. Use JPG ou PNG.');
      // Reset file input
      if (mode === 'add' && addFileInputRef.current) addFileInputRef.current.value = '';
      if (mode === 'edit' && editFileInputRef.current) editFileInputRef.current.value = '';
    }
  };

  // Upload image and return filename
  const uploadImage = async (file) => {
    if (!file) return null;
    setUploading(true);
    const randomFilename = generateRandomFilename(file.name);
    const storageRef = ref(storage, `cartoes_imagens/${randomFilename}`); // Path in Storage
    try {
      await uploadBytes(storageRef, file);
      // Optionally get URL if needed immediately, otherwise just return filename
      // const url = await getDownloadURL(storageRef);
      setUploading(false);
      return randomFilename; // Return the generated filename
    } catch (uploadError) {
      console.error("Erro no upload da imagem: ", uploadError);
      setError('Falha no upload da imagem.');
      setUploading(false);
      throw uploadError; // Re-throw to stop the process
    }
  };

  // Delete image from storage
  const deleteImage = async (filename) => {
      if (!filename) return;
      const storageRef = ref(storage, `cartoes_imagens/${filename}`);
      try {
          await deleteObject(storageRef);
          console.log(`Imagem ${filename} deletada com sucesso.`);
      } catch (deleteError) {
          // Handle errors (e.g., file not found), but don't block main operation
          console.warn(`Falha ao deletar imagem ${filename} do Storage:`, deleteError);
      }
  };

  // Add cartao
  const handleAddCartao = async (e) => {
    e.preventDefault();
    const numero = parseInt(newCartaoData.numero, 10);
    if (!newCartaoData.bairroId || isNaN(numero) || numero <= 0) {
      setError('Número do cartão (positivo) e bairro são obrigatórios.');
      return;
    }

    setLoading(true);
    setError('');
    let uploadedFilename = null;
    try {
      const unique = await isNumeroUnique(numero, newCartaoData.bairroId);
      if (!unique) {
        throw new Error(`O número ${numero} já existe neste bairro.`);
      }

      // Upload image if selected
      if (newCartaoData.imagemFile) {
        uploadedFilename = await uploadImage(newCartaoData.imagemFile);
      }

      await addDoc(collection(db, 'cartoesTerritorio'), {
        numero: numero,
        bairroId: newCartaoData.bairroId,
        imagemNome: uploadedFilename // Save filename (or null)
      });
      setNewCartaoData({ numero: '', bairroId: '', imagemFile: null, imagemNome: '' });
      if (addFileInputRef.current) addFileInputRef.current.value = ''; // Reset file input
      setIsAddDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error("Erro ao adicionar cartão: ", err);
      setError(err.message || 'Falha ao adicionar cartão.');
      // If upload succeeded but Firestore failed, try to delete the uploaded image
      if (uploadedFilename) {
          await deleteImage(uploadedFilename);
      }
      setLoading(false);
      setUploading(false);
    }
  };

  // Edit cartao
  const handleEditCartao = async (e) => {
    e.preventDefault();
    const numero = parseInt(editingCartao?.numero, 10);
    if (!editingCartao || !editingCartao.bairroId || isNaN(numero) || numero <= 0) {
        setError('Número do cartão (positivo) e bairro são obrigatórios.');
        return;
    }
    setLoading(true);
    setError('');
    let newUploadedFilename = null;
    const oldFilename = editingCartao.imagemNome; // Keep track of the old filename

    try {
      const unique = await isNumeroUnique(numero, editingCartao.bairroId, editingCartao.id);
       if (!unique) {
        throw new Error(`O número ${numero} já existe neste bairro.`);
      }

      // Upload new image if selected
      if (editingCartao.imagemFile) {
        newUploadedFilename = await uploadImage(editingCartao.imagemFile);
      }

      const cartaoRef = doc(db, 'cartoesTerritorio', editingCartao.id);
      const dataToUpdate = {
          numero: numero,
          bairroId: editingCartao.bairroId,
          // Update filename only if a new image was uploaded
          ...(newUploadedFilename !== null && { imagemNome: newUploadedFilename }),
      };

      await updateDoc(cartaoRef, dataToUpdate);

      // Delete old image ONLY if a new one was successfully uploaded and saved
      if (newUploadedFilename && oldFilename) {
          await deleteImage(oldFilename);
      }

      setEditingCartao(null);
      if (editFileInputRef.current) editFileInputRef.current.value = ''; // Reset file input
      setIsEditDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error("Erro ao editar cartão: ", err);
      setError(err.message || 'Falha ao editar cartão.');
      // If new upload succeeded but Firestore failed, try to delete the new uploaded image
      if (newUploadedFilename) {
          await deleteImage(newUploadedFilename);
      }
      setLoading(false);
      setUploading(false);
    }
  };

  // Delete cartao
  const handleDeleteCartao = async () => {
    if (!cartaoToDelete) return;
    setLoading(true);
    setError('');
    const filenameToDelete = cartaoToDelete.imagemNome;

    try {
      // Check for dependencies (Ruas)
      const ruasQuery = query(collection(db, 'ruas'), where('cartaoTerritorioId', '==', cartaoToDelete.id));
      const ruasSnapshot = await getDocs(ruasQuery);
      if (!ruasSnapshot.empty) {
          throw new Error('Existem ruas vinculadas a este cartão.');
      }

      // Delete Firestore document first
      await deleteDoc(doc(db, 'cartoesTerritorio', cartaoToDelete.id));

      // Then delete image from Storage
      if (filenameToDelete) {
          await deleteImage(filenameToDelete);
      }

      setCartaoToDelete(null);
      setIsDeleteDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error("Erro ao deletar cartão: ", err);
      setError(err.message || 'Falha ao deletar cartão. Verifique se existem ruas vinculadas.');
      setLoading(false);
    }
  };

  const openEditDialog = (cartao) => {
    setEditingCartao({ ...cartao, numero: cartao.numero.toString(), imagemFile: null }); // Reset file selection on open
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (cartao) => {
    setCartaoToDelete(cartao);
    setIsDeleteDialogOpen(true);
  };

  const handleBairroChangeAdd = (value) => {
    setNewCartaoData({ ...newCartaoData, bairroId: value, numero: '' });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Gerenciar Cartões de Território</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Add Cartao Dialog Trigger */}
      <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
          setIsAddDialogOpen(isOpen);
          if (!isOpen) {
              setNewCartaoData({ numero: '', bairroId: '', imagemFile: null, imagemNome: '' }); // Reset form on close
              if (addFileInputRef.current) addFileInputRef.current.value = '';
              setError('');
          }
      }}>
        <DialogTrigger asChild>
          <Button className="mb-4" disabled={bairros.length === 0}>
            {bairros.length === 0 ? 'Cadastre Bairros Primeiro' : 'Adicionar Cartão'}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Cartão de Território</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCartao}>
            <div className="grid gap-4 py-4">
              {/* Bairro Select */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bairro" className="text-right">Bairro</Label>
                <Select value={newCartaoData.bairroId} onValueChange={handleBairroChangeAdd} required>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecione o bairro" /></SelectTrigger>
                  <SelectContent>
                    {bairros.map((bairro) => (<SelectItem key={bairro.id} value={bairro.id}>{bairro.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {/* Numero Input */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="numero" className="text-right">Número</Label>
                <Input id="numero" type="number" min="1" value={newCartaoData.numero} onChange={(e) => setNewCartaoData({ ...newCartaoData, numero: e.target.value })} className="col-span-3" placeholder={`Sugestão: ${nextNumero}`} required />
              </div>
              {/* Image Upload Input */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="imagem" className="text-right">Imagem (JPG/PNG)</Label>
                <Input id="imagem" type="file" accept="image/jpeg, image/png" onChange={(e) => handleFileChange(e, 'add')} className="col-span-3" ref={addFileInputRef} />
              </div>
              {newCartaoData.imagemFile && <p className='text-sm text-muted-foreground col-start-2 col-span-3'>Arquivo selecionado: {newCartaoData.imagemFile.name}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={loading || uploading || !newCartaoData.bairroId || !newCartaoData.numero.trim()}>
                {uploading ? 'Enviando Imagem...' : (loading ? 'Adicionando...' : 'Adicionar')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cartoes Table */}
      {loading && !cartoes.length ? (
        <p>Carregando cartões...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Bairro</TableHead>
              <TableHead>Imagem</TableHead> {/* Added Image Column */}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cartoes.map((cartao) => (
              <TableRow key={cartao.id}>
                <TableCell>{cartao.numero}</TableCell>
                <TableCell>{cartao.bairroNome}</TableCell>
                <TableCell>{cartao.imagemNome ? 'Sim' : 'Não'}</TableCell> {/* Indicate if image exists */}
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(cartao)} disabled={bairros.length === 0}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(cartao)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {cartoes.length === 0 && !loading && <p className="mt-4 text-center text-muted-foreground">Nenhum cartão encontrado.</p>}

      {/* Edit Cartao Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
          setIsEditDialogOpen(isOpen);
          if (!isOpen) {
              setEditingCartao(null); // Reset form on close
              if (editFileInputRef.current) editFileInputRef.current.value = '';
              setError('');
          }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cartão de Território</DialogTitle>
          </DialogHeader>
          {editingCartao && (
            <form onSubmit={handleEditCartao}>
              <div className="grid gap-4 py-4">
                 {/* Bairro Select */}
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-bairro" className="text-right">Bairro</Label>
                    <Select value={editingCartao.bairroId} onValueChange={(value) => setEditingCartao({ ...editingCartao, bairroId: value })} required>
                        <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecione o bairro" /></SelectTrigger>
                        <SelectContent>
                            {bairros.map((bairro) => (<SelectItem key={bairro.id} value={bairro.id}>{bairro.nome}</SelectItem>))}
                        </SelectContent>
                    </Select>
                 </div>
                 {/* Numero Input */}
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-numero" className="text-right">Número</Label>
                    <Input id="edit-numero" type="number" min="1" value={editingCartao.numero} onChange={(e) => setEditingCartao({ ...editingCartao, numero: e.target.value })} className="col-span-3" required />
                 </div>
                 {/* Image Upload Input */}
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-imagem" className="text-right">Nova Imagem (Opcional)</Label>
                    <Input id="edit-imagem" type="file" accept="image/jpeg, image/png" onChange={(e) => handleFileChange(e, 'edit')} className="col-span-3" ref={editFileInputRef} />
                 </div>
                 {editingCartao.imagemNome && !editingCartao.imagemFile && <p className='text-sm text-muted-foreground col-start-2 col-span-3'>Imagem atual: {editingCartao.imagemNome}</p>}
                 {editingCartao.imagemFile && <p className='text-sm text-muted-foreground col-start-2 col-span-3'>Nova imagem selecionada: {editingCartao.imagemFile.name}</p>}
              </div>
              <DialogFooter>
                 <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit" disabled={loading || uploading || !editingCartao.bairroId || !editingCartao.numero.trim()}>
                  {uploading ? 'Enviando Imagem...' : (loading ? 'Salvando...' : 'Salvar Alterações')}
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
              Tem certeza que deseja excluir o cartão número "{cartaoToDelete?.numero}" do bairro "{cartaoToDelete?.bairroNome}"?
              {cartaoToDelete?.imagemNome && " A imagem associada também será excluída."}
              Esta ação não pode ser desfeita. Verifique se não existem ruas vinculadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" onClick={() => setCartaoToDelete(null)}>Cancelar</Button></DialogClose>
            <Button variant="destructive" onClick={handleDeleteCartao} disabled={loading}>
              {loading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default CartoesTerritorioManager;

