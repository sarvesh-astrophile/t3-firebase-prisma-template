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
import { toast } from "sonner"; // Import toast for feedback

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isServerSessionReady: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isServerSessionReady: false,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isServerSessionReady, setIsServerSessionReady] = useState(false);

  // tRPC mutations
  const createSessionMutation = api.auth.createSession.useMutation({
    onSuccess: () => {
      console.log("Server session created successfully.");
      // Navigation is now handled by route protection / login page redirect
    },
    onError: (error) => {
      console.error("Failed to create server session:", error);
      toast.error("Login failed: Could not establish server session.");
      // Optionally sign the user out from Firebase client-side if server session fails
      firebaseSignOut(auth).catch((e) =>
        console.error("Error signing out after session failure:", e)
      );
    },
  });

  const deleteSessionMutation = api.auth.deleteSession.useMutation({
    onSuccess: () => {
      console.log("Server session deleted successfully.");
    },
    onError: (error) => {
      // Less critical usually, but log it
      console.error("Failed to delete server session:", error);
      toast.error("Error during sign out process.");
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      setIsServerSessionReady(true);

      if (currentUser) {
        // User is signed in (or was already signed in)
        try {
          const idToken = await currentUser.getIdToken();
          // Trigger session creation. Backend handles upsert. Idempotency via upsert.
          // No need to check isIdle here if we remove the reload loop cause.
          createSessionMutation.mutate({ idToken });
        } catch (error) {
          console.error("Error getting ID token:", error);
          toast.error("Login failed: Could not verify identity.");
          firebaseSignOut(auth).catch((e) =>
            console.error("Error signing out after token failure:", e)
          );
        }
      } else {
        // User is signed out
        // Ensure server session is cleared if it might exist
        // Check mutation status to avoid redundant calls on initial load or after explicit signout
        if (deleteSessionMutation.isIdle || deleteSessionMutation.isError) {
          // No need to await if user is already null client-side
          deleteSessionMutation.mutate();
        }
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependencies remain minimal

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // Reset error state of mutation before attempting sign in again
      // We no longer need createSessionMutation.reset() here,
      // as the main trigger is onAuthStateChanged
      await signInWithPopup(auth, provider);
      // Session creation is handled by onAuthStateChanged listener
    } catch (error: any) {
      // Handle popup closed, network error etc. from signInWithPopup
      console.error("Error signing in with Google:", error);
      if (error.code !== "auth/popup-closed-by-user") {
        toast.error("Google Sign-In failed. Please try again.");
      }
    }
  };

  const signOut = async () => {
    try {
      // Reset mutation state before signing out
      deleteSessionMutation.reset();
      // Clear the server session first
      await deleteSessionMutation.mutateAsync();
      // Then sign out from Firebase client
      await firebaseSignOut(auth);
      // Redirect to login page after successful sign out
      // Keep this replace for sign out to ensure clean state
      window.location.replace("/auth/login");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Sign out failed. Please try again.");
      // Don't redirect if sign out failed, user might still be technically logged in server-side?
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, isServerSessionReady, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
