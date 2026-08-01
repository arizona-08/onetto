"use client";
import { getMyActiveCompany } from '@/lib/companies/companies';
import { Company } from '@/lib/companies/dtos/create-company.dto';
import React from 'react'

export type ActiveCompanyContextType = {
  activeCompany: Company | null;
  setActiveCompany: (company: Company | null) => void;
}

const activeCompanyContext = React.createContext<ActiveCompanyContextType | undefined>(undefined);

interface ActiveCompanyProviderProps {
  children: React.ReactNode;
}

function ActiveCompanyProvider({ children }: ActiveCompanyProviderProps) {
  const [activeCompany, setActiveCompany] = React.useState<Company | null>(null);

  async function fetchActiveCompany() {
    try {
      const response = await getMyActiveCompany();
      if(!response.ok){
        console.error("Erreur lors de la récupération de l'entreprise active :", response.error);
      } else {
        setActiveCompany(response.data);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de l'entreprise active :", error);
    }
  }

  React.useEffect(() => {
    fetchActiveCompany();
  }, []);

  const value = React.useMemo(() => ({
    activeCompany,
    setActiveCompany
  }), [activeCompany]);

  return (
    <activeCompanyContext.Provider value={value}>
      {children}
    </activeCompanyContext.Provider>
  )
}

export function useActiveCompany() {
  const context = React.useContext(activeCompanyContext);
  if (context === undefined) {
    throw new Error('useActiveCompany must be used within an ActiveCompanyProvider');
  }
  return context;
}

export default ActiveCompanyProvider