import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig'; // Adjust path
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy } from 'lucide-react';
import { toast, Toaster } from 'sonner'; // Using sonner for toast notifications (assuming it's installed or will be)

// Helper function to sort house numbers (basic alphanumeric sort)
const sortNumeros = (a, b) => {
    // Attempt to convert to numbers for comparison, fallback to string compare
    const numA = parseInt(a.numero, 10);
    const numB = parseInt(b.numero, 10);

    if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
    } 
    // Basic string comparison if not purely numeric
    return a.numero.localeCompare(b.numero, undefined, { numeric: true, sensitivity: 'base' });
};

// Component to display street view for Dirigente and allow sharing
function StreetViewDirigente() {
    const { ruaId } = useParams();
    const navigate = useNavigate();
    const [rua, setRua] = useState(null);
    const [imoveisPar, setImoveisPar] = useState([]);
    const [imoveisImpar, setImoveisImpar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStreetData = async () => {
            setLoading(true);
            setError('');
            try {
                // Fetch Rua details
                const ruaRef = doc(db, 'ruas', ruaId);
                const ruaSnap = await getDoc(ruaRef);

                if (!ruaSnap.exists()) {
                    throw new Error('Rua não encontrada.');
                }
                const ruaData = { id: ruaSnap.id, ...ruaSnap.data() };
                setRua(ruaData);

                // Fetch Imoveis for this Rua
                const imoveisQuery = query(collection(db, 'imoveis'), where('ruaId', '==', ruaId));
                const imoveisSnapshot = await getDocs(imoveisQuery);
                const listaImoveis = imoveisSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Separate and sort imoveis by lado (par/impar)
                const par = listaImoveis.filter(imovel => imovel.lado === 'par').sort(sortNumeros);
                const impar = listaImoveis.filter(imovel => imovel.lado === 'impar').sort(sortNumeros);

                setImoveisPar(par);
                setImoveisImpar(impar);

            } catch (err) {
                console.error("Erro ao buscar dados da rua: ", err);
                setError(err.message || 'Falha ao carregar dados da rua.');
            } finally {
                setLoading(false);
            }
        };

        if (ruaId) {
            fetchStreetData();
        }
    }, [ruaId]);

    const getPublicadorUrl = (face) => {
        // Construct the public URL based on current location
        const baseUrl = window.location.origin;
        return `${baseUrl}/publicador/${ruaId}/${face}`;
    };

    const copyUrlToClipboard = (face) => {
        const url = getPublicadorUrl(face);
        navigator.clipboard.writeText(url)
            .then(() => {
                toast.success(`URL do lado ${face === 'par' ? 'Par' : 'Ímpar'} copiada!`);
            })
            .catch(err => {
                console.error('Erro ao copiar URL: ', err);
                toast.error('Falha ao copiar URL.');
            });
    };

    const getStatusBadgeVariant = (status) => {
        switch (status) {
            case 'Atendido': return 'success'; // Assuming you have custom variants or use default
            case 'Revisita': return 'info';
            case 'Estudo': return 'warning';
            case 'Imóvel Fechado': return 'secondary';
            case 'Casa Vazia': return 'secondary';
            case 'Não Bater': return 'destructive';
            case 'Não Trabalhado':
            default: return 'outline';
        }
    };

    if (loading) {
        return <div className="container mx-auto p-4">Carregando dados da rua...</div>;
    }

    if (error) {
        return <div className="container mx-auto p-4 text-red-500">Erro: {error}</div>;
    }

    if (!rua) {
        return <div className="container mx-auto p-4">Rua não encontrada.</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <Toaster richColors />
            <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">Voltar</Button>
            <h1 className="text-3xl font-bold mb-2">Rua: {rua.nome}</h1>
            {/* TODO: Add Bairro/Cartão info if needed */}
            <p className="text-muted-foreground mb-6">Visualize os imóveis e compartilhe os links com os publicadores.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lado Ímpar */}
                <Card>
                    <CardHeader>
                        <CardTitle>Lado Ímpar</CardTitle>
                        <CardDescription>Imóveis com numeração ímpar.</CardDescription>
                        <Button size="sm" variant="outline" onClick={() => copyUrlToClipboard('impar')} className="mt-2">
                            <Copy className="mr-2 h-4 w-4" /> Copiar Link (Ímpar)
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {imoveisImpar.length === 0 && <p className="text-sm text-muted-foreground">Nenhum imóvel cadastrado neste lado.</p>}
                        {imoveisImpar.map(imovel => (
                            <div key={imovel.id} className="border p-3 rounded-md">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold">Nº {imovel.numero}</span>
                                    <Badge variant={getStatusBadgeVariant(imovel.status)}>{imovel.status || 'Não Trabalhado'}</Badge>
                                </div>
                                {imovel.moradorNome && <p className="text-sm">Morador: {imovel.moradorNome}</p>}
                                {imovel.observacoes && <p className="text-sm text-muted-foreground">Obs: {imovel.observacoes}</p>}
                                {imovel.ultimaAtualizacao && <p className="text-xs text-gray-500 mt-1">Atualizado: {format(imovel.ultimaAtualizacao.toDate(), "dd/MM/yy HH:mm")}</p>}
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Lado Par */}
                <Card>
                    <CardHeader>
                        <CardTitle>Lado Par</CardTitle>
                        <CardDescription>Imóveis com numeração par.</CardDescription>
                        <Button size="sm" variant="outline" onClick={() => copyUrlToClipboard('par')} className="mt-2">
                            <Copy className="mr-2 h-4 w-4" /> Copiar Link (Par)
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {imoveisPar.length === 0 && <p className="text-sm text-muted-foreground">Nenhum imóvel cadastrado neste lado.</p>}
                        {imoveisPar.map(imovel => (
                            <div key={imovel.id} className="border p-3 rounded-md">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold">Nº {imovel.numero}</span>
                                    <Badge variant={getStatusBadgeVariant(imovel.status)}>{imovel.status || 'Não Trabalhado'}</Badge>
                                </div>
                                {imovel.moradorNome && <p className="text-sm">Morador: {imovel.moradorNome}</p>}
                                {imovel.observacoes && <p className="text-sm text-muted-foreground">Obs: {imovel.observacoes}</p>}
                                {imovel.ultimaAtualizacao && <p className="text-xs text-gray-500 mt-1">Atualizado: {format(imovel.ultimaAtualizacao.toDate(), "dd/MM/yy HH:mm")}</p>}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default StreetViewDirigente;

