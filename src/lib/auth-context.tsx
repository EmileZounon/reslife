"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./firebase";
import type { User, UserRole } from "@/types";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const firestore = getFirebaseDb();

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // Set session cookie for middleware route protection
        const token = await fbUser.getIdToken();
        document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Lax`;

        try {
          const userDoc = await getDoc(doc(firestore, "users", fbUser.uid));
          if (userDoc.exists()) {
            setUser({ id: userDoc.id, ...userDoc.data() } as User);
          } else {
            // User authenticated but no Firestore doc — create one
            await setDoc(doc(firestore, "users", fbUser.uid), {
              email: fbUser.email,
              name: fbUser.displayName || "Unknown",
              role: "STUDENT" as UserRole,
              createdAt: Timestamp.now(),
            });
            setUser({
              id: fbUser.uid,
              email: fbUser.email || "",
              name: fbUser.displayName || "Unknown",
              role: "STUDENT",
              createdAt: Timestamp.now(),
            } as User);
          }
        } catch (err) {
          console.error("Failed to load user profile:", err);
          setUser(null);
        }
      } else {
        document.cookie = "__session=; path=/; max-age=0";
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  };

  const signUp = async (email: string, password: string, name: string) => {
    const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN;
    if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) {
      throw new Error(`Registration is restricted to @${allowedDomain} emails`);
    }

    const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    await updateProfile(cred.user, { displayName: name });

    await setDoc(doc(getFirebaseDb(), "users", cred.user.uid), {
      email,
      name,
      role: "STUDENT" as UserRole,
      createdAt: Timestamp.now(),
    });
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(getFirebaseAuth(), provider);

    const userDoc = await getDoc(doc(getFirebaseDb(), "users", cred.user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(getFirebaseDb(), "users", cred.user.uid), {
        email: cred.user.email,
        name: cred.user.displayName || "Unknown",
        role: "STAFF" as UserRole,
        avatar: cred.user.photoURL,
        createdAt: Timestamp.now(),
      });
    }
  };

  const signOut = async () => {
    await firebaseSignOut(getFirebaseAuth());
    document.cookie = "__session=; path=/; max-age=0";
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ firebaseUser, user, loading, signIn, signUp, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
