"use client";

import { ContextProviderProps } from "../types/index";
import { User } from "../types/user";
import { createContext, useContext, useState } from "react";

interface AppContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  navDashboardTitle: string;
  setNavDashboardTitle: (title: string) => void;
  isLoginOpen: boolean;
  setIsLoginOpen: (open: boolean) => void;
}

export const AppContext = createContext({} as AppContextValue);
export const useAppContext = () => useContext(AppContext);

export const AppContextProvider = ({ children }: ContextProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [navDashboardTitle, setNavDashboardTitle] = useState<string>("");
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        navDashboardTitle,
        setNavDashboardTitle,
        isLoginOpen,
        setIsLoginOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
