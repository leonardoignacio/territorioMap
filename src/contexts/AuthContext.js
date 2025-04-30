import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../config/firebaseConfig';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail // Import password reset function
} from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'; // Import Firestore functions

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userMemberships, setUserMemberships] = useState([]); // Stores { id, congregacaoId, role, status, ... }
  const [selectedMembership, setSelectedMembership] = useState(null); // Stores the selected { id, congregacaoId, role, ... }
  const [congregacaoDetails, setCongregacaoDetails] = useState({}); // Cache for congregation names {congId: name}
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(''); // Store auth errors

  // Fetch congregation details (name) - simple cache
  const fetchCongregacaoName = async (congId) => {
    if (congregacaoDetails[congId]) {
      return congregacaoDetails[congId];
    }
    try {
      const congRef = doc(db, 'congregacoes', congId);
      const congSnap = await getDoc(congRef);
      if (congSnap.exists()) {
        const name = congSnap.data().nome;
        setCongregacaoDetails(prev => ({ ...prev, [congId]: name }));
        return name;
      } else {
        return 'Congregação Desconhecida';
      }
    } catch (error) {
      console.error("Erro ao buscar nome da congregação:", error);
      return 'Erro ao buscar nome';
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthError(''); // Clear previous errors
      setCurrentUser(user);
      setUserMemberships([]);
      setSelectedMembership(null);
      setCongregacaoDetails({}); // Clear cache on user change

      if (user) {
        try {
          // Fetch all active memberships for the current user
          const q = query(
            collection(db, 'membrosCongregacao'),
            where('userId', '==', user.uid),
            where('status', '==', 'Ativo')
          );
          const querySnapshot = await getDocs(q);
          const memberships = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setUserMemberships(memberships);

          // Pre-fetch congregation names for memberships
          const congIds = [...new Set(memberships.map(m => m.congregacaoId))];
          await Promise.all(congIds.map(id => fetchCongregacaoName(id)));

          // Automatically select if only one membership exists
          if (memberships.length === 1) {
            setSelectedMembership(memberships[0]);
          }
          // If multiple memberships, user will need to select one (handled by UI)

        } catch (error) {
          console.error("Erro ao buscar associações do usuário:", error);
          setAuthError('Falha ao carregar informações do usuário.');
          // Consider signing out if memberships are crucial and fail to load
          // await firebaseSignOut(auth);
        }
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Simplified signup - only creates Firebase Auth user
  const signup = (email, password) => {
    setAuthError('');
    return createUserWithEmailAndPassword(auth, email, password)
      .catch(error => {
        console.error("Erro no signup:", error);
        setAuthError(error.message); // Store error message
        throw error; // Re-throw error for component handling
      });
    // Linking to congregation happens via invites or creating a congregation
  };

  // Login
  const login = (email, password) => {
    setAuthError('');
    return signInWithEmailAndPassword(auth, email, password)
      .catch(error => {
        console.error("Erro no login:", error);
        setAuthError(error.message);
        throw error;
      });
  };

  // Google Sign-In
  const googleSignIn = async () => {
    setAuthError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle fetching memberships
      return result;
    } catch (error) {
      console.error("Erro no login com Google:", error);
      setAuthError(error.message);
      throw error;
    }
  };

  // Logout
  const logout = () => {
    setAuthError('');
    // States will be reset by onAuthStateChanged
    return firebaseSignOut(auth);
  };

  // Password Reset
  const sendPasswordReset = (email) => {
    setAuthError('');
    return firebaseSendPasswordResetEmail(auth, email)
      .catch(error => {
        console.error("Erro ao enviar email de redefinição de senha:", error);
        setAuthError(error.message);
        throw error;
      });
  };

  // Function for UI components to call when a congregation context is selected
  const selectCongregacaoContext = (membership) => {
    if (userMemberships.some(m => m.id === membership.id)) {
      setSelectedMembership(membership);
    } else {
      console.error("Tentativa de selecionar associação inválida");
      // Handle error appropriately
    }
  };

  // Function to clear selected congregation (e.g., show selector again)
  const clearCongregacaoContext = () => {
    setSelectedMembership(null);
  };

  const value = {
    currentUser,
    userMemberships, // List of { id, congregacaoId, role, status, ... }
    selectedMembership, // The selected { id, congregacaoId, role, ... }
    congregacaoDetails, // Cache of { congId: name }
    loading,
    authError,
    signup,
    login,
    googleSignIn,
    logout,
    sendPasswordReset,
    selectCongregacaoContext,
    clearCongregacaoContext,
    fetchCongregacaoName // Expose function to fetch names on demand
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

