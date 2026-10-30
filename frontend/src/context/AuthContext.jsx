import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cest_doux_staff_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('cest_doux_staff_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('cest_doux_staff_user');
    }
  }, [user]);

  const login = async (username, password) => {
    setLoading(true);
    // Simular validación rápida o conectar con backend
    await new Promise((resolve) => setTimeout(resolve, 350));
    
    // Asignación de rol según usuario o por defecto mesero/administrador
    const cleanUser = (username || '').trim().toLowerCase();
    let role = 'Mesero';
    let displayName = username || 'Personal de Turno';
    
    if (cleanUser.includes('admin') || cleanUser === 'gerente') {
      role = 'Administrador';
      displayName = 'Administrador';
    } else if (cleanUser.includes('coci') || cleanUser === 'chef') {
      role = 'Cocina';
      displayName = 'Jefe de Cocina';
    } else {
      displayName = username ? username.charAt(0).toUpperCase() + username.slice(1) : 'Mesero';
    }

    const userData = {
      id: Date.now(),
      username: username || 'empleado',
      displayName,
      role,
      loginTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setUser(userData);
    setLoading(false);
    return { success: true, user: userData };
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
