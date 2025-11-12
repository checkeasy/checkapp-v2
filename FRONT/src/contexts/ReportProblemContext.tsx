import React, { createContext, useContext, useState, ReactNode } from "react";

interface ReportProblemContextType {
  isOpen: boolean;
  preselectedRoom?: string;
  openReportModal: (room?: string) => void;
  closeReportModal: () => void;
}

const ReportProblemContext = createContext<ReportProblemContextType | undefined>(undefined);

export const useReportProblem = () => {
  const context = useContext(ReportProblemContext);
  if (!context) {
    throw new Error("useReportProblem must be used within a ReportProblemProvider");
  }
  return context;
};

interface ReportProblemProviderProps {
  children: ReactNode;
}

export const ReportProblemProvider = ({ children }: ReportProblemProviderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [preselectedRoom, setPreselectedRoom] = useState<string | undefined>();

  const openReportModal = (room?: string) => {
    setPreselectedRoom(room);
    setIsOpen(true);
  };
  const closeReportModal = () => {
    setIsOpen(false);
    setPreselectedRoom(undefined);
  };

  return (
    <ReportProblemContext.Provider value={{
      isOpen,
      preselectedRoom,
      openReportModal,
      closeReportModal
    }}>
      {children}
    </ReportProblemContext.Provider>
  );
};