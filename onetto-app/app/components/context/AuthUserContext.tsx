"use client";
import { me } from "@/lib/auth/auth";
import { AuthUser } from "@/lib/auth/responses/login.response";
import { createContext, useContext, useEffect, useState } from "react";

type AuthUserType = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void
};

const AuthUserContext = createContext<AuthUserType | undefined>(undefined);

interface AuthUserProviderProps {
  children: React.ReactNode;
}

export function AuthUserProvider({ children }: AuthUserProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);

  async function fetchUser() {
    const response = await me();
    if(!response.ok) {
      setUser(null);
      return;
    }

    setUser(response.data);
  }

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthUserContext.Provider value={{ user, setUser }}>
      {children}
    </AuthUserContext.Provider>
  );

}

export function useAuthUser() {
  const context = useContext(AuthUserContext);
  if (context === undefined) {
    throw new Error("useAuthUser must be used within an AuthUserProvider");
  }
  return context;
}