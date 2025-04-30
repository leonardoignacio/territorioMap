import React, { useState, useEffect, useContext } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { AuthContext } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Trash2, Mail } from 'lucide-react'; // Icons

// Component to manage Congregation Members (Invites, Roles)
// Expects congregacaoId as a prop
function MembrosManager({ congregacaoId }) {
  const [membros, setMembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Dirigente'); // Default role
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  // Add states for delete/edit dialogs if needed later

  const { currentUser } = useContext(AuthContext);

  // Fetch members for the specific congregation
  const fetchMembros = async () => {
    if (!congregacaoId) return;
    setLoading(true);
    setError('');
    try {
      const q = query(collection(db, 'membrosCongregacao'), where('congregacaoId', '==', congregacaoId));
      const querySnapshot = await getDocs(q);
      const listaMembros = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // TODO: Fetch user details (like name) based on userId for active members
      setMembros(listaMembros);
    } catch (err) {
      console.error("Erro ao buscar membros da congregação: ", err);
      setError('Falha ao carregar membros.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembros();
  }, [congregacaoId]); // Refetch if congregacaoId changes

  // Invite member (creates 'Pendente' entry)
  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !currentUser || !congregacaoId) {
      setError('Email inválido ou informações ausentes.');
      return;
    }
    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(inviteEmail)) {
        setError('Formato de email inválido.');
        return;
    }

    setLoading(true);
    setError('');
    try {
      // Check if invite already exists (pending or active) for this email/congregation
      const q = query(collection(db, 'membrosCongregacao'),
                      where('congregacaoId', '==', congregacaoId),
                      where('email', '==', inviteEmail)); // Assuming email is stored for pending invites
      const existingInvite = await getDocs(q);
      if (!existingInvite.empty) {
          setError('Já existe um convite ou membro ativo com este email para esta congregação.');
          setLoading(false);
          return;
      }

      // Add MembroCongregacao document with 'Pendente' status
      await addDoc(collection(db, 'membrosCongregacao'), {
        email: inviteEmail, // Store email for pending invites
        userId: null, // Will be filled upon acceptance
        congregacaoId: congregacaoId,
        role: inviteRole,
        status: 'Pendente',
        convidadoPorUserId: currentUser.uid,
        dataConvite: serverTimestamp(),
      });

      // **IMPORTANT**: This only creates the Firestore record.
      // A real implementation needs a backend (e.g., Firebase Functions)
      // to actually send an email with a unique activation link.
      // The activation link handler would then verify the token,
      // find this pending record, update its status to 'Ativo',
      // and link the correct userId.

      setInviteEmail('');
      setInviteRole('Dirigente');
      setIsInviteDialogOpen(false);
      fetchMembros(); // Refresh list
      // Show success notification (optional)

    } catch (err) {
      console.error("Erro ao convidar membro: ", err);
      setError('Falha ao enviar convite.');
      setLoading(false);
    }
  };

  // TODO: Implement functions for deleting invites/members or changing roles (with permission checks)
  // const handleDeleteInvite = async (membroId) => { ... };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-3">Gerenciar Membros</h2>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Invite Member Dialog Trigger */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogTrigger asChild>
          {/* TODO: Disable button if user is not Admin for this cong */}
          <Button className="mb-4" disabled={!currentUser || !congregacaoId}>
            <Mail className="mr-2 h-4 w-4" /> Convidar Membro
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Novo Membro</DialogTitle>
            <DialogDescription>
              Insira o email e selecione o papel (Admin ou Dirigente).
              O usuário receberá um convite para se juntar a esta congregação.
              (Nota: O envio real de email não está implementado.)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteMember}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="invite-email" className="text-right">
                  Email
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="col-span-3"
                  required
                  placeholder="nome@exemplo.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="invite-role" className="text-right">
                  Papel
                </Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecione o papel" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Dirigente">Dirigente</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={loading || !inviteEmail.trim() || !currentUser}>
                {loading ? 'Enviando...' : 'Enviar Convite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Members Table */}
      {loading ? (
        <p>Carregando membros...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email / Usuário</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {membros.map((membro) => (
              <TableRow key={membro.id}>
                {/* Display email for pending, potentially user name for active */}
                <TableCell>{membro.email || membro.userId || 'N/A'}</TableCell>
                <TableCell>{membro.role}</TableCell>
                <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${membro.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {membro.status}
                    </span>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {/* TODO: Add buttons for delete/edit role, with permission checks */}
                  {membro.status === 'Pendente' && (
                    <Button variant="ghost" size="icon" /* onClick={() => openDeleteInviteDialog(membro)} */ className="text-red-500 hover:text-red-700" disabled={!currentUser /* Add role check */}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {/* Add other actions for active members if needed */}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {membros.length === 0 && !loading && <p className="mt-4 text-center text-muted-foreground">Nenhum membro encontrado para esta congregação.</p>}

      {/* TODO: Add Dialogs for Delete Invite / Edit Role */}

    </div>
  );
}

export default MembrosManager;

