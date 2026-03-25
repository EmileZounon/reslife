import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { requireApiRole } from "@/lib/api-auth";

const SELECTION_DOC_ID = "current";

// GET is public (students need to check if selection is open)
export async function GET() {
  try {
    const db = getAdminDb();
    const doc = await db.collection("roomSelection").doc(SELECTION_DOC_ID).get();

    if (!doc.exists) {
      return NextResponse.json({ open: false });
    }

    return NextResponse.json({ open: doc.data()?.open || false });
  } catch (err) {
    console.error("Selection window check error:", err);
    return NextResponse.json({ open: false });
  }
}

// POST requires admin role
export async function POST(req: NextRequest) {
  try {
    const caller = await requireApiRole(req, "ADMIN");

    const { open } = await req.json();

    if (typeof open !== "boolean") {
      return NextResponse.json({ error: "open must be a boolean" }, { status: 400 });
    }

    const db = getAdminDb();
    const ref = db.collection("roomSelection").doc(SELECTION_DOC_ID);

    await ref.set(
      {
        open,
        ...(open
          ? { openedAt: Timestamp.now(), openedBy: caller.uid }
          : { closedAt: Timestamp.now() }),
      },
      { merge: true }
    );

    return NextResponse.json({ open });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    console.error("Selection window update error:", err);
    return NextResponse.json({ error: "Failed to update selection window" }, { status: 500 });
  }
}
