import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, imageBasePath } from '../../config/firebaseConfig'; // Import imageBasePath
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDay, getHours } from 'date-fns'; // To get day of week and hour

// Placeholder data structure for charts
const initialChartData = {
  bairro: [],
  cartaoDiaSemana: [],
  cartaoHorario: [],
};

function RelatoriosPage() {
  const { selectedMembership, loading: authLoading } = useAuth();
  const [reportData, setReportData] = useState(initialChartData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bairros, setBairros] = useState([]);
  const [cartoes, setCartoes] = useState([]); // State to store fetched cards

  useEffect(() => {
    const fetchDataAndGenerateReports = async () => {
      if (!selectedMembership || authLoading) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const congregacaoId = selectedMembership.congregacaoId;

        // 1. Fetch necessary base data (Bairros, Cartoes, Saidas)
        const bairroQuery = query(collection(db, 'bairros'), where('congregacaoId', '==', congregacaoId));
        const bairroSnapshot = await getDocs(bairroQuery);
        const listaBairros = bairroSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBairros(listaBairros);

        const cartaoQuery = query(collection(db, 'cartoesTerritorio'), where('congregacaoId', '==', congregacaoId), orderBy('bairroId'), orderBy('numero')); // Order cards
        const cartaoSnapshot = await getDocs(cartaoQuery);
        const listaCartoes = cartaoSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            bairroNome: listaBairros.find(b => b.id === doc.data().bairroId)?.nome || 'Desconhecido'
        }));
        setCartoes(listaCartoes); // Store fetched cards in state

        const saidasQuery = query(collection(db, 'saidasCampo'), where('congregacaoId', '==', congregacaoId));
        const saidasSnapshot = await getDocs(saidasQuery);
        const listaSaidas = saidasSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          dataHoraInicio: doc.data().dataHoraInicio.toDate(),
          cartaoInfo: listaCartoes.find(c => c.id === doc.data().cartaoTerritorioId)
        }));

        // --- Generate Report Data --- 

        // a) Report by Bairro (Example: Number of Saidas per Bairro)
        const saidasPorBairro = listaBairros.map(bairro => {
            const count = listaSaidas.filter(saida => saida.bairroId === bairro.id).length;
            return { name: bairro.nome, Saidas: count };
        });

        // b) Report by Cartao / Day of Week (Example: Saidas per Cartao per Day)
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const saidasPorCartaoDia = listaCartoes.map(cartao => {
            const data = { name: `Cartão ${cartao.numero} (${cartao.bairroNome})` };
            diasSemana.forEach((dia, index) => {
                data[dia] = listaSaidas.filter(saida => 
                    saida.cartaoTerritorioId === cartao.id && 
                    getDay(saida.dataHoraInicio) === index
                ).length;
            });
            return data;
        });

        // c) Report by Cartao / Hour of Day (Example: Saidas per Cartao per Hour)
        const horasDia = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`); // 00:00 to 23:00
        const saidasPorCartaoHora = listaCartoes.map(cartao => {
            const data = { name: `Cartão ${cartao.numero} (${cartao.bairroNome})` };
            horasDia.forEach((hora, index) => {
                data[hora] = listaSaidas.filter(saida => 
                    saida.cartaoTerritorioId === cartao.id && 
                    getHours(saida.dataHoraInicio) === index
                ).length;
            });
            // Filter out hours with 0 saidas for clarity, maybe?
            const filteredData = { name: data.name };
            let hasData = false;
            horasDia.forEach(hora => {
                if (data[hora] > 0) {
                    filteredData[hora] = data[hora];
                    hasData = true;
                }
            });
            return hasData ? filteredData : null; // Return null if no saidas for this cartao
        }).filter(Boolean); // Remove null entries


        setReportData({
          bairro: saidasPorBairro,
          cartaoDiaSemana: saidasPorCartaoDia,
          cartaoHorario: saidasPorCartaoHora,
        });

      } catch (err) {
        console.error("Erro ao gerar relatórios: ", err);
        setError('Falha ao gerar relatórios.');
      } finally {
        setLoading(false);
      }
    };

    fetchDataAndGenerateReports();
  }, [selectedMembership, authLoading]);

  if (authLoading) {
    return <p>Carregando autenticação...</p>;
  }

  if (!selectedMembership) {
    return <p>Por favor, selecione uma congregação para visualizar os relatórios.</p>;
  }

  if (loading) {
    return <p>Gerando relatórios...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Relatórios de Desempenho</h1>

      {/* Relatório por Bairro */}
      <Card>
        <CardHeader>
          <CardTitle>Saídas por Bairro</CardTitle>
        </CardHeader>
        <CardContent>
          {reportData.bairro.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.bairro} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Saidas" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p>Nenhuma saída registrada para gerar este relatório.</p>
          )}
        </CardContent>
      </Card>

      {/* Relatório por Cartão / Dia da Semana */}
      <Card>
        <CardHeader>
          <CardTitle>Saídas por Cartão e Dia da Semana</CardTitle>
        </CardHeader>
        <CardContent>
          {reportData.cartaoDiaSemana.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}> 
              <BarChart data={reportData.cartaoDiaSemana} margin={{ top: 5, right: 30, left: 20, bottom: 70 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, index) => (
                  <Bar key={dia} dataKey={dia} stackId="a" fill={`hsl(${index * 50}, 70%, 50%)`} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p>Nenhuma saída registrada para gerar este relatório.</p>
          )}
        </CardContent>
      </Card>

      {/* Relatório por Cartão / Horário */}
       <Card>
        <CardHeader>
          <CardTitle>Saídas por Cartão e Horário</CardTitle>
        </CardHeader>
        <CardContent>
          {reportData.cartaoHorario.length > 0 ? (
             <ResponsiveContainer width="100%" height={400}>
               <BarChart data={reportData.cartaoHorario} margin={{ top: 5, right: 30, left: 20, bottom: 70 }}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} />
                 <YAxis allowDecimals={false} />
                 <Tooltip />
                 <Legend />
                 {/* Dynamically get keys (hours) from the first data point, excluding 'name' */}
                 {Object.keys(reportData.cartaoHorario[0] || {}).filter(key => key !== 'name').map((hora, index) => (
                   <Bar key={hora} dataKey={hora} stackId="a" fill={`hsl(${index * 15}, 70%, 60%)`} />
                 ))}
               </BarChart>
             </ResponsiveContainer>
          ) : (
            <p>Nenhuma saída registrada para gerar este relatório.</p>
          )}
        </CardContent>
      </Card>

      {/* Visualização das Imagens dos Cartões */}
      <Card>
        <CardHeader>
          <CardTitle>Imagens dos Cartões de Território</CardTitle>
        </CardHeader>
        <CardContent>
          {cartoes.length > 0 && imageBasePath ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {cartoes.map((cartao) => (
                cartao.imagemNome ? (
                  <div key={cartao.id} className="border rounded p-2 flex flex-col items-center">
                    <p className="text-sm font-medium mb-1">{`Cartão ${cartao.numero}`}</p>
                    <p className="text-xs text-muted-foreground mb-2">{cartao.bairroNome}</p>
                    <img
                      src={`${imageBasePath}${cartao.imagemNome}`}
                      alt={`Imagem do Cartão ${cartao.numero}`}
                      className="max-w-full h-auto max-h-40 rounded border object-contain"
                      loading="lazy" // Lazy load images
                      onError={(e) => { e.target.style.display = 'none'; console.warn(`Erro ao carregar imagem: ${cartao.imagemNome}`) }}
                    />
                  </div>
                ) : null // Don't render anything if no image
              ))}
            </div>
          ) : (
            <p>Nenhum cartão com imagem encontrado ou o caminho base das imagens não está configurado.</p>
          )}
          {cartoes.filter(c => c.imagemNome).length === 0 && cartoes.length > 0 && (
              <p>Nenhum dos cartões cadastrados possui imagem associada.</p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

export default RelatoriosPage;

