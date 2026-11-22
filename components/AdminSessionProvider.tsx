"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

interface AdminSessionContextValue {
  token: string | null;
  setToken: (token: string | null) => void;
  clearToken: () => void;
}

const AdminSessionContext = createContext<AdminSessionContextValue>({
  token: null,
  setToken: () => {},
  clearToken: () => {},
});

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);

  const setToken = useCallback((next: string | null) => {
    setTokenState(next);
  }, []);

  const clearToken = useCallback(() => {
    setTokenState(null);
  }, []);

  return (
    <AdminSessionContext.Provider value={{ token, setToken, clearToken }}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  return useContext(AdminSessionContext);
}
