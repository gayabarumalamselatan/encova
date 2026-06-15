import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { Session, Account, AvailableModule } from "@/lib/types/auth";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  login: (session: Session) => void;
  logout: () => void;
  hasPermission: (modulePath: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Restore session on mount
    const storedSession = localStorage.getItem("encova_session");
    if (storedSession) {
      try {
        setSession(JSON.parse(storedSession));
      } catch (e) {
        localStorage.removeItem("encova_session");
      }
    }
    
    // Initialize default admin on the backend
    fetch("/api/accounts").catch(() => {});
    
    setLoading(false);
  }, []);

  const login = (newSession: Session) => {
    setSession(newSession);
    localStorage.setItem("encova_session", JSON.stringify(newSession));
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem("encova_session");
    router.push("/login");
  };

  const hasPermission = (modulePath: string) => {
    if (!session || !session.user) return false;
    
    // Admin bypasses all restrictions
    if (session.user.role === "admin") return true;

    // Check specific module permission
    // For example, if path is /cctv-encode, the module id might be "cctv-encode"
    const pathSegment = modulePath.replace(/^\//, '').split('/')[0];
    
    // Allow homepage
    if (!pathSegment) return true;
    
    return session.user.modules.includes("all") || session.user.modules.includes(pathSegment);
  };

  return (
    <AuthContext.Provider value={{ session, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
