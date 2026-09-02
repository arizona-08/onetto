"use client";
import { getMyActiveCompany } from '@/lib/companies/companies';
import { Company } from '@/lib/companies/dtos/create-company.dto';
import React from 'react'
import { useToast } from './ToastContext';
import { useAuthUser } from './AuthUserContext';
import { COMPANY_UPDATED_EVENT } from '@/lib/companies/company-events';

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
  const { showToast } = useToast();
  const { user } = useAuthUser();

  const fetchActiveCompany = React.useCallback(async () => {
    try {
      if (!user) {
        setActiveCompany(null);
        return;
      }
      const response = await getMyActiveCompany();
      if(!response.ok){
        showToast("Impossible de charger l’entreprise active. Veuillez actualiser la page.", 'error');
      } else {
        setActiveCompany(response.data);
      }
    } catch {
      showToast("Impossible de charger l’entreprise active. Veuillez actualiser la page.", 'error');
    }
  }, [showToast, user]);

  React.useEffect(() => {
    void fetchActiveCompany();
    window.addEventListener(COMPANY_UPDATED_EVENT, fetchActiveCompany);
    return () => window.removeEventListener(COMPANY_UPDATED_EVENT, fetchActiveCompany);
  }, [fetchActiveCompany]);

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
