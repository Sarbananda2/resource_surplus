import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User, InsertUser, LoginData } from "@shared/models/auth";
import { 
  signInWithGoogle, 
  exchangeTokenForSession, 
  signOut as firebaseSignOut,
  isFirebaseConfigured,
  checkFirebaseBackendStatus
} from "@/lib/firebase";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  // Check if Firebase is ready on the backend (cached for 5 minutes)
  const { data: firebaseStatus } = useQuery({
    queryKey: ["/api/firebase/status"],
    queryFn: checkFirebaseBackendStatus,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Login failed");
      }
      return res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/auth/user"], user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(userData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Registration failed");
      }
      return res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/auth/user"], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Sign out from Firebase if configured
      if (isFirebaseConfigured()) {
        await firebaseSignOut();
      }
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Logout failed");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      window.location.href = "/auth";
    },
  });

  // Firebase Google sign-in mutation
  const googleSignInMutation = useMutation({
    mutationFn: async () => {
      // Sign in with Google via Firebase
      const firebaseUser = await signInWithGoogle();
      if (!firebaseUser) {
        throw new Error("Google sign-in failed");
      }

      // Get the ID token
      const idToken = await firebaseUser.getIdToken();

      // Exchange Firebase token for server session
      return await exchangeTokenForSession(idToken);
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/auth/user"], user);
    },
  });

  // Firebase is ready if both frontend config exists AND backend is ready
  const isFirebaseAvailable = isFirebaseConfigured() && (firebaseStatus?.ready ?? false);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    loginMutation,
    register: registerMutation.mutate,
    registerMutation,
    logout: logoutMutation.mutate,
    logoutMutation,
    isLoggingOut: logoutMutation.isPending,
    googleSignIn: googleSignInMutation.mutate,
    googleSignInMutation,
    isFirebaseConfigured: isFirebaseAvailable,
  };
}
