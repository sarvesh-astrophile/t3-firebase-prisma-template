"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { api } from "@/trpc/react"; // Import the tRPC client

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // tRPC mutations
  const createSessionMutation = api.auth.createSession.useMutation();
  const deleteSessionMutation = api.auth.deleteSession.useMutation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);

      if (user) {
        try {
          // Get the ID token
          const idToken = await user.getIdToken();
          // Call the tRPC mutation to create the server session
          await createSessionMutation.mutateAsync({ idToken });
        } catch (error) {
          console.error("Error creating server session:", error);
          // Handle error appropriately, maybe sign out the user
        }
      } else {
        // If user logs out on Firebase side, ensure server session is cleared
        // (signIn function already handles clearing on explicit sign out)
        // Check if mutation has been called before to avoid unnecessary calls on initial load
        if (
          deleteSessionMutation.isIdle ||
          deleteSessionMutation.isSuccess ||
          deleteSessionMutation.isError
        ) {
          try {
            await deleteSessionMutation.mutateAsync();
          } catch (error) {
            console.error(
              "Error deleting server session on auth state change:",
              error
            );
          }
        }
      }
    });

    return () => unsubscribe();
    // Add mutations to dependency array if needed, depends on specific lint rules/behavior
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Keep dependencies minimal for onAuthStateChanged

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // Session creation is handled by the onAuthStateChanged listener
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const signOut = async () => {
    try {
      // Clear the server session first
      await deleteSessionMutation.mutateAsync();
      // Then sign out from Firebase
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      // Consider more robust error handling/user feedback
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
