import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig'; // Adjust path
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // For observations
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast, Toaster } from 'sonner';

// Helper function to sort house numbers (basic alphanumeric sort)
const sortNumeros = (a, b) => {
    const numA = parseInt(a.numero, 10);
    const numB = parseInt(b.numero, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
    }
    return a.numero.localeCompare(b.numero, undefined, { numeric: true, sensitivity: 'base' });
};

// Component for the public publisher view
function PublicadorView() {
    const { ruaId, face } = useParams(); // face should be 'par' or 'impar'
    const [rua, setRua] = useState(null);
    const [imoveis, setImoveis] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // State for the update dialog
    const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
    const [imovelToUpdate, setImovelToUpdate] = useState(null); // The full imovel object
    const [newStatus, setNewStatus] = useState('');
    const [moradorNome, setMoradorNome] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [updateLoading, setUpdateLoading] = useState(false);
    const [updateError, setUpdateError] = useState('');

    const fetchImoveis = useCallback(async () => {
        if (!ruaId || !face) return;
        setLoading(true);
        setError('');
        try {
            // Fetch Rua details (optional, but good for context)
            const ruaRef = doc(db, 'ruas', ruaId);
            const ruaSnap = await getDoc(ruaRef);
            if (ruaSnap.exists()) {
                setRua({ id: ruaSnap.id, ...ruaSnap.data() });
            } else {
                console.warn('Rua não encontrada, mas continuando a buscar imóveis.');
                // Not throwing error, maybe just show imoveis
            }

            // Fetch Imoveis for this Rua and specific face (lado)
            const imoveisQuery = query(
                collection(db, 'imoveis'),
                where('ruaId', '==', ruaId),
                where('lado', '==', face) // Filter by 'par' or 'impar'
            );
            const imoveisSnapshot = await getDocs(imoveisQuery);
            const listaImoveis = imoveisSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort imoveis
            listaImoveis.sort(sortNumeros);
            setImoveis(listaImoveis);

        } catch (err) {
            console.error("Erro ao buscar dados para publicador: ", err);
            setError('Falha ao carregar dados do território. Verifique o link ou tente novamente.');
        } finally {
            setLoading(false);
        }
    }, [ruaId, face]);

    useEffect(() => {
        fetchImoveis();
    }, [fetchImoveis]);

    const openUpdateDialog = (imovel) => {
        setImovelToUpdate(imovel);
        setNewStatus(imovel.status || 'Não Trabalhado');
        setMoradorNome(imovel.moradorNome || '');
        setObservacoes(imovel.observacoes || '');
        setUpdateError('');
        setIsUpdateDialogOpen(true);
    };

    const handleUpdateImovel = async (e) => {
        e.preventDefault();
        if (!imovelToUpdate || !newStatus) {
            setUpdateError('Selecione um status.');
            return;
        }

        const requiresDetails = ['Atendido', 'Revisita', 'Estudo'].includes(newStatus);
        if (requiresDetails && !moradorNome.trim()) {
            setUpdateError('Nome do morador é obrigatório para este status.');
            return;
        }

        setUpdateLoading(true);
        setUpdateError('');

        try {
            const imovelRef = doc(db, 'imoveis', imovelToUpdate.id);
            await updateDoc(imovelRef, {
                status: newStatus,
                moradorNome: requiresDetails ? moradorNome.trim() : '',
                observacoes: requiresDetails ? observacoes.trim() : '',
                ultimaAtualizacao: Timestamp.now(),
                // atualizadoPorUrlToken: face // Simple tracking: which side updated it
            });

            toast.success(`Imóvel Nº ${imovelToUpdate.numero} atualizado para ${newStatus}.`);
            setIsUpdateDialogOpen(false);
            setImovelToUpdate(null);
            // Refetch data to show updated status immediately
            fetchImoveis();
        } catch (err) {
            console.error("Erro ao atualizar imóvel: ", err);
            setUpdateError('Falha ao salvar atualização. Tente novamente.');
            toast.error('Falha ao salvar atualização.');
        } finally {
            setUpdateLoading(false);
        }
    };

    const getStatusBadgeVariant = (status) => {
        switch (status) {
            case 'Atendido': return 'success';
            case 'Revisita': return 'info';
            case 'Estudo': return 'warning';
            case 'Imóvel Fechado': return 'secondary';
            case 'Casa Vazia': return 'secondary';
            case 'Não Bater': return 'destructive';
            case 'Não Trabalhado':
            default: return 'outline';
        }
    };

    const statusOptions = [
        'Não Trabalhado',
        'Atendido',
        'Revisita',
        'Estudo',
        'Imóvel Fechado',
        'Casa Vazia',
        'Não Bater'
    ];

    const showDetailsFields = ['Atendido', 'Revisita', 'Estudo'].includes(newStatus);

    if (loading) {
        return <div className="container mx-auto p-4 text-center">Carregando território...</div>;
    }

    if (error) {
        return <div className="container mx-auto p-4 text-center text-red-500">Erro: {error}</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <Toaster richColors />
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Trabalho de Pregação</CardTitle>
                    <CardDescription>
                        Rua: {rua?.nome || 'Carregando...'} - Lado {face === 'par' ? 'Par' : 'Ímpar'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {imoveis.length === 0 && <p className="text-sm text-muted-foreground text-center">Nenhum imóvel encontrado para este lado da rua.</p>}
                    {imoveis.map(imovel => (
                        <div key={imovel.id} className="border p-4 rounded-lg shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-lg font-semibold">Nº {imovel.numero}</span>
                                <Badge variant={getStatusBadgeVariant(imovel.status)}>{imovel.status || 'Não Trabalhado'}</Badge>
                            </div>
                            {imovel.moradorNome && <p className="text-sm">Morador: {imovel.moradorNome}</p>}
                            {imovel.observacoes && <p className="text-sm text-muted-foreground">Obs: {imovel.observacoes}</p>}
                            {imovel.ultimaAtualizacao && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Última visita: {format(imovel.ultimaAtualizacao.toDate(), "dd/MM/yy HH:mm", { locale: ptBR })}
                                </p>
                            )}
                            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => openUpdateDialog(imovel)}>
                                Atualizar Status
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Update Status Dialog */}
            <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Atualizar Status - Nº {imovelToUpdate?.numero}</DialogTitle>
                        <DialogDescription>
                            Selecione o novo status e adicione detalhes se necessário.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateImovel}>
                        <div className="grid gap-4 py-4">
                            {updateError && <p className="text-red-500 text-sm col-span-4">{updateError}</p>}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="status" className="text-right">
                                    Status
                                </Label>
                                <Select value={newStatus} onValueChange={setNewStatus} required>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Selecione o status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusOptions.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {showDetailsFields && (
                                <>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="morador" className="text-right">
                                            Morador
                                        </Label>
                                        <Input
                                            id="morador"
                                            value={moradorNome}
                                            onChange={(e) => setMoradorNome(e.target.value)}
                                            className="col-span-3"
                                            placeholder="Nome do morador (se aplicável)"
                                            required={showDetailsFields} // Make required if status needs it
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-start gap-4">
                                        <Label htmlFor="obs" className="text-right pt-2">
                                            Obs
                                        </Label>
                                        <Textarea
                                            id="obs"
                                            value={observacoes}
                                            onChange={(e) => setObservacoes(e.target.value)}
                                            className="col-span-3"
                                            placeholder="Observações (publicação, assunto, etc.)"
                                            rows={3}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancelar</Button>
                            </DialogClose>
                            <Button type="submit" disabled={updateLoading || !newStatus}>
                                {updateLoading ? 'Salvando...' : 'Salvar Status'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default PublicadorView;

