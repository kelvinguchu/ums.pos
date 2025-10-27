"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { createClient } from "@/lib/utils/supabase/client";
import { getCurrentUser } from "@/lib/actions/users";

interface User {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
  is_active?: boolean | null;
}

interface AuthContextType {
  user: User | null;
  userRole: string | null | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  updateAuthState: (state: Partial<AuthContextType>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  readonly children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const isInitialized = useRef(false);

  const isAuthenticated = !!user;

  const updateAuthState = useCallback((state: Partial<AuthContextType>) => {
    if (state.user !== undefined) setUser(state.user);
    if (state.userRole !== undefined) setUserRole(state.userRole);
    if (state.isLoading !== undefined) setIsLoading(state.isLoading);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      // Prevent double initialization in strict mode
      if (isInitialized.current) return;
      isInitialized.current = true;

      try {
        // Get session from Supabase (stored in httpOnly cookies via middleware)
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user && isMounted) {
          const currentUser = await getCurrentUser();
          if (currentUser && isMounted) {
            setUser(currentUser);
            setUserRole(currentUser.role);
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (isMounted) {
          setUser(null);
          setUserRole(undefined);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      // Handle sign out
      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
        setUserRole(undefined);
        setIsLoading(false);
        return;
      }

      // Handle sign in or token refresh
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        try {
          const currentUser = await getCurrentUser();
          if (currentUser && isMounted) {
            setUser(currentUser);
            setUserRole(currentUser.role);
          }
        } catch (error) {
          console.error("Error getting user data:", error);
          if (isMounted) {
            setUser(null);
            setUserRole(undefined);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value: AuthContextType = useMemo(
    () => ({
      user,
      userRole,
      isAuthenticated,
      isLoading,
      updateAuthState,
    }),
    [user, userRole, isAuthenticated, isLoading, updateAuthState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
