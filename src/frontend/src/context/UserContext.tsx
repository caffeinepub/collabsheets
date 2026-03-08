import { type ReactNode, createContext, useContext, useState } from "react";
import { getRandomColor } from "../utils/colors";

export interface UserState {
  name: string;
  color: string;
}

interface UserContextType {
  user: UserState | null;
  setUser: (user: UserState) => void;
  clearUser: () => void;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserState | null>(() => {
    try {
      const stored = localStorage.getItem("collab_user");
      if (stored) return JSON.parse(stored) as UserState;
    } catch {
      // ignore
    }
    return null;
  });

  const setUser = (u: UserState) => {
    localStorage.setItem("collab_user", JSON.stringify(u));
    setUserState(u);
  };

  const clearUser = () => {
    localStorage.removeItem("collab_user");
    setUserState(null);
  };

  return (
    <UserContext.Provider value={{ user, setUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export { getRandomColor };
