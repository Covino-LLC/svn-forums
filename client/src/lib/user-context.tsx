import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { apiRequest } from "./queryClient";

// The signed-in account (null when browsing anonymously). Identity comes from the
// server session cookie; the client never tells the server who it is.
type SessionUser = Omit<User, "passwordHash"> | null;

interface UserContextType {
  currentUser: SessionUser;
  refreshUser: () => void;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  currentUser: null,
  refreshUser: () => {},
  logout: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery<SessionUser>({
    queryKey: ["/api/auth/me"],
  });

  const refreshUser = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    queryClient.setQueryData(["/api/auth/me"], null);
  };

  return (
    <UserContext.Provider value={{ currentUser: currentUser ?? null, refreshUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
