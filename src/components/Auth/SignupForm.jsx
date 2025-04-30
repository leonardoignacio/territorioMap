import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Assuming shadcn/ui select
import { db } from '../../config/firebaseConfig'; // Import db to fetch congregations
import { collection, getDocs } from 'firebase/firestore';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nome, setNome] = useState('');
  const [congregacaoId, setCongregacaoId] = useState('');
  const [congregacoes, setCongregacoes] = useState([]); // State for congregations list
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  // Fetch congregations on component mount
  useEffect(() => {
    const fetchCongregacoes = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'congregacoes'));
        const listaCongregacoes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCongregacoes(listaCongregacoes);
        // TODO: Handle case where there are no congregations
      } catch (err) {
        console.error("Erro ao buscar congregações: ", err);
        setError('Erro ao carregar lista de congregações. Tente novamente mais tarde.');
        // Set dummy data for development if needed
        // setCongregacoes([{ id: 'dummy1', nome: 'Congregação Teste 1' }, { id: 'dummy2', nome: 'Congregação Teste 2' }]);
      }
      setLoading(false);
    };

    fetchCongregacoes();
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError('As senhas não coincidem.');
    }
    if (!congregacaoId) {
        return setError('Por favor, selecione uma congregação.');
    }

    setError('');
    setLoading(true);
    try {
      await signup(email, password, nome, congregacaoId);
      navigate('/'); // Redirect to home or dashboard after signup
    } catch (err) {
      setError('Falha ao criar conta. Verifique os dados ou tente novamente.');
      console.error("Signup Error:", err);
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Registrar</CardTitle>
        <CardDescription>
          Crie sua conta de Dirigente de Saída de Campo.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <form onSubmit={handleSignup} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome Completo</Label>
            <Input
              id="nome"
              type="text"
              placeholder="Seu Nome Completo"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirmar Senha</Label>
            <Input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="congregacao">Congregação</Label>
            <Select onValueChange={setCongregacaoId} value={congregacaoId} disabled={loading || congregacoes.length === 0}>
              <SelectTrigger id="congregacao">
                <SelectValue placeholder="Selecione sua congregação" />
              </SelectTrigger>
              <SelectContent>
                {congregacoes.length === 0 && !loading && <SelectItem value="none" disabled>Nenhuma congregação encontrada</SelectItem>}
                {congregacoes.map((cong) => (
                  <SelectItem key={cong.id} value={cong.id}>
                    {cong.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {congregacoes.length === 0 && !loading && <p className="text-sm text-muted-foreground">É necessário cadastrar congregações primeiro.</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading || congregacoes.length === 0}>
            {loading ? 'Registrando...' : 'Registrar'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="text-sm">
        Já tem uma conta? <Link to="/login" className="ml-1 underline">Entrar</Link>
      </CardFooter>
    </Card>
  );
}

export default SignupForm;

