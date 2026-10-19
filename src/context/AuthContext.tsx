import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client.ts';
import { User, Workspace } from '../types/index.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  selectWorkspace: (ws: Workspace) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  joinWorkspace: (inviteCode: string) => Promise<Workspace>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  leaveWorkspace: (workspaceId: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('cofound_token'));
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUserData = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      setWorkspaces(res.data.workspaces);

      const savedWsId = localStorage.getItem('cofound_workspace_id');
      if (savedWsId) {
        const found = res.data.workspaces.find((w: Workspace) => w.id === savedWsId);
        if (found) {
          setCurrentWorkspace(found);
        } else if (res.data.workspaces.length > 0) {
          setCurrentWorkspace(res.data.workspaces[0]);
          localStorage.setItem('cofound_workspace_id', res.data.workspaces[0].id);
        }
      } else if (res.data.workspaces.length > 0) {
        setCurrentWorkspace(res.data.workspaces[0]);
        localStorage.setItem('cofound_workspace_id', res.data.workspaces[0].id);
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
      setUser(null);
      setToken(null);
      localStorage.removeItem('cofound_token');
      localStorage.removeItem('cofound_workspace_id');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshUserData();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const newToken = res.data.token;
    localStorage.setItem('cofound_token', newToken);
    setToken(newToken);
    await refreshUserData();
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const res = await api.post('/auth/register', { name, email, password, phone });
    const newToken = res.data.token;
    localStorage.setItem('cofound_token', newToken);
    setToken(newToken);
    await refreshUserData();
  };

  const logout = () => {
    localStorage.removeItem('cofound_token');
    localStorage.removeItem('cofound_workspace_id');
    setUser(null);
    setToken(null);
    setWorkspaces([]);
    setCurrentWorkspace(null);
  };

  const selectWorkspace = (ws: Workspace) => {
    setCurrentWorkspace(ws);
    localStorage.setItem('cofound_workspace_id', ws.id);
  };

  const createWorkspace = async (name: string): Promise<Workspace> => {
    const res = await api.post('/workspaces', { name });
    await refreshUserData();
    const newWs: Workspace = {
      id: res.data.workspace.id,
      name: res.data.workspace.name,
      role: 'owner',
      isOwner: true,
      inviteCode: res.data.workspace.inviteCode,
      createdAt: new Date().toISOString(),
    };
    selectWorkspace(newWs);
    return newWs;
  };

  const joinWorkspace = async (inviteCode: string): Promise<Workspace> => {
    const res = await api.post('/workspaces/join', { inviteCode });
    await refreshUserData();
    const joinedWs: Workspace = {
      id: res.data.workspace.id,
      name: res.data.workspace.name,
      role: res.data.workspace.role,
      isOwner: res.data.workspace.role === 'owner',
      createdAt: new Date().toISOString(),
    };
    selectWorkspace(joinedWs);
    return joinedWs;
  };

  const deleteWorkspace = async (workspaceId: string): Promise<void> => {
    await api.delete(`/workspaces/${workspaceId}`);
    if (currentWorkspace?.id === workspaceId) {
      localStorage.removeItem('cofound_workspace_id');
      setCurrentWorkspace(null);
    }
    await refreshUserData();
  };

  const leaveWorkspace = async (workspaceId: string): Promise<void> => {
    await api.post(`/workspaces/${workspaceId}/leave`);
    if (currentWorkspace?.id === workspaceId) {
      localStorage.removeItem('cofound_workspace_id');
      setCurrentWorkspace(null);
    }
    await refreshUserData();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        workspaces,
        currentWorkspace,
        loading,
        login,
        register,
        logout,
        selectWorkspace,
        createWorkspace,
        joinWorkspace,
        deleteWorkspace,
        leaveWorkspace,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
