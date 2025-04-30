import React, { useState, useEffect, useContext } from 'react';
import { collection, getDocs, addDoc, query, where, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db, imageBasePath } from '../../config/firebaseConfig'; // Import imageBasePath
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"
import { format, setHours, setMinutes, setSeconds } from "date-fns"
import { ptBR } from 'date-fns/locale';

// Helper function to combine date and time string into a Date object
const combineDateAndTime = (date, timeString) => {
  if (!date || !timeString) return null;
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    let combinedDate = setHours(date, hours);
    combinedDate = setMinutes(combinedDate, minutes);
    combinedDate = setSeconds(combinedDate, 0);
    return combinedDate;
  } catch (error) {
    console.error("Error combining date and time:", error);
    return null;
  }
};

// Component to manage Saidas de Campo
function SaidasCampoManager() {
  const { currentUser, selectedMembership, loading: authLoading } = useAuth();
  const [saidas, setSaidas] = useState([]);
  const [bairros, setBairros] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('');
  const [selectedBairroId, setSelectedBairroId] = useState('');
  const [selectedCartaoId, setSelectedCartaoId] = useState('');
  const [selectedCartaoImagemNome, setSelectedCartaoImagemNome] = useState(''); // State for image name

  // Fetch related data and past saidas
  const fetchData = async () => {
    if (!selectedMembership || !currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const congregacaoId = selectedMembership.congregacaoId;

      // Fetch Bairros
      const bairroQuery = query(collection(db, 'bairros'), where('congregacaoId', '==', congregacaoId));
      const bairroSnapshot = await getDocs(bairroQuery);
      const listaBairros = bairroSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBairros(listaBairros);

      // Fetch CartoesTerritorio (including imagemNome)
      const cartaoQuery = query(collection(db, 'cartoesTerritorio'), where('congregacaoId', '==', congregacaoId), orderBy('bairroId'), orderBy('numero'));
      const cartaoSnapshot = await getDocs(cartaoQuery);
      const listaCartoes = cartaoSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        bairroNome: listaBairros.find(b => b.id === doc.data().bairroId)?.nome || 'Desconhecido'
      }));
      setCartoes(listaCartoes);

      // Fetch Past Saidas
      const saidasQuery = query(
        collection(db, 'saidasCampo'),
        where('membroCongregacaoId', '==', selectedMembership.id),
        orderBy('dataHoraInicio', 'desc')
      );
      const saidasSnapshot = await getDocs(saidasQuery);
      const listaSaidas = await Promise.all(saidasSnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        const cartao = listaCartoes.find(c => c.id === data.cartaoTerritorioId);
        let dirigenteNome = 'Desconhecido';
        if (data.membroCongregacaoId) {
            const membroRef = doc(db, 'membrosCongregacao', data.membroCongregacaoId);
            const membroSnap = await getDoc(membroRef);
            if (membroSnap.exists() && membroSnap.data().userId) {
                // Fetch user details if needed, using email as placeholder
                const userRef = doc(db, 'usuarios', membroSnap.data().userId); // Assuming a 'usuarios' collection
                const userSnap = await getDoc(userRef);
                dirigenteNome = userSnap.exists() ? userSnap.data().nome : (membroSnap.data().email || membroSnap.data().userId);
            }
        }

        return {
          id: docSnapshot.id,
          ...data,
          dataHoraInicio: data.dataHoraInicio.toDate(),
          dataHoraFim: data.dataHoraFim ? data.dataHoraFim.toDate() : null,
          bairroNome: cartao?.bairroNome || 'Desconhecido',
          cartaoNumero: cartao?.numero || '?',
          dirigenteNome: dirigenteNome
        };
      }));
      setSaidas(listaSaidas);

    } catch (err) {
      console.error("Erro ao buscar dados: ", err);
      setError('Falha ao carregar dados das saídas de campo.');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && selectedMembership) {
        fetchData();
    }
     if (!authLoading && !selectedMembership) {
        setLoading(false);
        setBairros([]);
        setCartoes([]);
        setSaidas([]);
    }
  }, [currentUser, selectedMembership, authLoading]);

  // Add Saida de Campo
  const handleAddSaida = async (e) => {
    e.preventDefault();
    const inicioDate = combineDateAndTime(selectedDate, startTime);
    const fimDate = endTime ? combineDateAndTime(selectedDate, endTime) : null;

    if (!inicioDate || !selectedBairroId || !selectedCartaoId || !selectedMembership) {
      setError('Data, Hora Início, Bairro e Cartão são obrigatórios.');
      return;
    }
    if (fimDate && fimDate <= inicioDate) {
        setError('A hora de fim deve ser posterior à hora de início.');
        return;
    }

    setLoading(true);
    setError('');
    try {
      await addDoc(collection(db, 'saidasCampo'), {
        dataHoraInicio: Timestamp.fromDate(inicioDate),
        dataHoraFim: fimDate ? Timestamp.fromDate(fimDate) : null,
        membroCongregacaoId: selectedMembership.id,
        congregacaoId: selectedMembership.congregacaoId,
        bairroId: selectedBairroId,
        cartaoTerritorioId: selectedCartaoId
      });
      // Reset form state
      setSelectedDate(new Date());
      setStartTime('09:00');
      setEndTime('');
      setSelectedBairroId('');
      setSelectedCartaoId('');
      setSelectedCartaoImagemNome(''); // Reset image name
      setIsAddDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error("Erro ao adicionar saída de campo: ", err);
      setError('Falha ao registrar saída de campo.');
      setLoading(false);
    }
  };

  // Filter cartoes based on selected bairro
  const filteredCartoes = selectedBairroId
    ? cartoes.filter(c => c.bairroId === selectedBairroId)
    : [];

  // Handle Bairro Change - Reset Cartao
  const handleBairroChange = (bairroId) => {
      setSelectedBairroId(bairroId);
      setSelectedCartaoId('');
      setSelectedCartaoImagemNome(''); // Reset image name
  };

  // Handle Cartao Change - Set Image Name
  const handleCartaoChange = (cartaoId) => {
      setSelectedCartaoId(cartaoId);
      const cartaoSelecionado = filteredCartoes.find(c => c.id === cartaoId);
      setSelectedCartaoImagemNome(cartaoSelecionado?.imagemNome || ''); // Set image name
  };

  if (authLoading) {
      return <p>Carregando autenticação...</p>;
  }

  if (!selectedMembership) {
      return <p>Por favor, selecione uma congregação para gerenciar as saídas de campo.</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Gerenciar Saídas de Campo</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Add Saida Dialog Trigger */}
      <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
          setIsAddDialogOpen(isOpen);
          if (!isOpen) { // Reset form on close
              setSelectedDate(new Date());
              setStartTime('09:00');
              setEndTime('');
              setSelectedBairroId('');
              setSelectedCartaoId('');
              setSelectedCartaoImagemNome('');
              setError('');
          }
      }}>
        <DialogTrigger asChild>
          <Button className="mb-4" disabled={bairros.length === 0 || cartoes.length === 0}>
            {bairros.length === 0 || cartoes.length === 0 ? 'Cadastre Bairros/Cartões Primeiro' : 'Registrar Nova Saída'}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Registrar Nova Saída de Campo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSaida}>
            <div className="grid gap-4 py-4">
              {/* Date Picker */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={`col-span-3 justify-start text-left font-normal ${!selectedDate && "text-muted-foreground"}`}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>
              {/* Start Time */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="start-time" className="text-right">Hora Início</Label>
                <Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="col-span-3" required />
              </div>
              {/* End Time */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="end-time" className="text-right">Hora Fim</Label>
                <Input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="col-span-3" />
              </div>
              {/* Bairro Selection */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bairro" className="text-right">Bairro</Label>
                <Select value={selectedBairroId} onValueChange={handleBairroChange} required>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecione o bairro" /></SelectTrigger>
                  <SelectContent>
                    {bairros.map((bairro) => (<SelectItem key={bairro.id} value={bairro.id}>{bairro.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {/* Cartao Selection */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cartao" className="text-right">Cartão</Label>
                <Select value={selectedCartaoId} onValueChange={handleCartaoChange} required disabled={!selectedBairroId}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder={selectedBairroId ? "Selecione o cartão" : "Selecione bairro"} /></SelectTrigger>
                  <SelectContent>
                    {filteredCartoes.map((cartao) => (<SelectItem key={cartao.id} value={cartao.id}>{`Cartão ${cartao.numero}`}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {/* Display Card Image */}
              {selectedCartaoImagemNome && imageBasePath && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Imagem</Label>
                  <div className="col-span-3">
                    <img
                      src={`${imageBasePath}${selectedCartaoImagemNome}`}
                      alt={`Imagem do Cartão ${filteredCartoes.find(c=>c.id === selectedCartaoId)?.numero}`}
                      className="max-w-full h-auto max-h-40 rounded border"
                      onError={(e) => { e.target.style.display = 'none'; console.warn("Erro ao carregar imagem do cartão") } } // Hide on error
                    />
                  </div>
                </div>
              )}
              {/* Dirigente Info */}
               <div className="grid grid-cols-4 items-center gap-4">
                 <Label className="text-right">Dirigente</Label>
                 <p className="col-span-3 text-sm text-muted-foreground">{currentUser?.displayName || currentUser?.email || 'Carregando...'}</p>
               </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={loading || !selectedBairroId || !selectedCartaoId || !startTime}>
                {loading ? 'Registrando...' : 'Registrar Saída'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Past Saidas Table */}
      <h2 className="text-xl font-semibold mb-2 mt-6">Histórico de Saídas</h2>
      {loading ? (
        <p>Carregando histórico...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Bairro</TableHead>
              <TableHead>Cartão</TableHead>
              <TableHead>Dirigente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {saidas.map((saida) => (
              <TableRow key={saida.id}>
                <TableCell>{format(saida.dataHoraInicio, "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                <TableCell>
                    {format(saida.dataHoraInicio, "HH:mm", { locale: ptBR })}
                    {saida.dataHoraFim ? ` - ${format(saida.dataHoraFim, "HH:mm", { locale: ptBR })}` : ''}
                </TableCell>
                <TableCell>{saida.bairroNome}</TableCell>
                <TableCell>{saida.cartaoNumero}</TableCell>
                <TableCell>{saida.dirigenteNome}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {saidas.length === 0 && !loading && <p className="mt-4 text-center text-muted-foreground">Nenhuma saída registrada para esta congregação.</p>}

    </div>
  );
}

export default SaidasCampoManager;

