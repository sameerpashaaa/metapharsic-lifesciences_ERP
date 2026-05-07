import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Company } from '../types';

interface CompanyContextType {
  company: Company | null;
  setCompany: (company: Company) => void;
  initializeCompany: (companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCompany: (companyData: Partial<Omit<Company, 'id' | 'createdAt' | 'updatedAt'>>) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [company, setCompany] = useState<Company | null>(null);

  const initializeCompany = (companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCompany: Company = {
      ...companyData,
      id: `COMP-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCompany(newCompany);
  };

  const updateCompany = (companyData: Partial<Omit<Company, 'id' | 'createdAt' | 'updatedAt'>>) => {
    if (!company) return;

    const updatedCompany = {
      ...company,
      ...companyData,
      updatedAt: new Date().toISOString(),
    };
    
    setCompany(updatedCompany);
  };

  return (
    <CompanyContext.Provider value={{ company, setCompany, initializeCompany, updateCompany }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};