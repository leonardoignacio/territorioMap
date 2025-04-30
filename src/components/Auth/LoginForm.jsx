import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button'; // Assuming shadcn/ui button
import { Input } from '@/components/ui/input'; // Assuming shadcn/ui input
import { Label } from '@/components/ui/label'; // Assuming shadcn/ui label
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'; // Assuming shadcn/ui card

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, googleSignIn } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/'); // Redirect to home or dashboard after login
    } catch (err) {
      setError('Falha ao fazer login. Verifique suas credenciais.');
      console.error("Login Error:", err);
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await googleSignIn();
      navigate('/'); // Redirect to home or dashboard after login
    } catch (err) {
      setError('Falha ao fazer login com Google.');
      console.error("Google Sign-In Error:", err);
      // Handle specific errors like 'Usuário Google não registrado como Dirigente.' if needed
      if (err.message.includes('Dirigente')) {
          setError(err.message);
      }
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>
          Entre com seu email e senha para acessar o sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <form onSubmit={handleLogin} className="grid gap-4">
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Ou continue com
            </span>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
          {/* Add Google Icon here if available */}
          Login com Google
        </Button>
      </CardContent>
      <CardFooter className="text-sm">
        Não tem uma conta? <Link to="/signup" className="ml-1 underline">Registre-se</Link>
      </CardFooter>
    </Card>
  );
}

export default LoginForm;

