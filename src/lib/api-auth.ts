import { NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import type { UserRole } from "@/types";

interface AuthResult {
  uid: string;
  role: UserRole;
}

/**
 * Verify the Firebase Auth token from the Authorization header.
 * Returns the user's uid and role, or throws an error.
 */
export async function verifyApiAuth(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }

  const token = authHeader.slice(7);
  const decoded = await getAdminAuth().verifyIdToken(token);
  const uid = decoded.uid;

  // Get user role from Firestore
  const db = getAdminDb();
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new Error("UNAUTHORIZED");
  }

  const role = userDoc.data()!.role as UserRole;
  return { uid, role };
}

/**
 * Require the caller to have one of the specified roles.
 */
export async function requireApiRole(
  req: NextRequest,
  ...roles: UserRole[]
): Promise<AuthResult> {
  const auth = await verifyApiAuth(req);
  if (!roles.includes(auth.role)) {
    throw new Error("FORBIDDEN");
  }
  return auth;
}
