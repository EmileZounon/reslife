import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { verifyApiAuth, requireApiRole } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  try {
    // Authenticate the caller
    const caller = await verifyApiAuth(req);

    const body = await req.json();
    const { userId, roomId, buildingId, bedSpace } = body;

    if (!userId || !roomId || !buildingId || !bedSpace) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Authorization: students can only assign themselves, and only when selection is open
    if (caller.role === "STUDENT") {
      if (caller.uid !== userId) {
        return NextResponse.json({ error: "Students can only select rooms for themselves" }, { status: 403 });
      }
      // Check if selection window is open
      const db = getAdminDb();
      const selDoc = await db.collection("roomSelection").doc("current").get();
      if (!selDoc.exists || !selDoc.data()?.open) {
        return NextResponse.json({ error: "Room selection is currently closed" }, { status: 403 });
      }
    } else if (caller.role !== "ADMIN" && caller.role !== "STAFF") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const db = getAdminDb();

    // Use a transaction to prevent double-booking
    // IMPORTANT: All reads must happen before writes in Firestore transactions
    const result = await db.runTransaction(async (tx) => {
      // Read 1: Check if bed is already occupied
      const existingSnap = await tx.get(
        db.collection("roomAssignments")
          .where("roomId", "==", roomId)
          .where("bedSpace", "==", bedSpace)
          .where("status", "==", "ACTIVE")
      );

      // Read 2: Check if student already has an active assignment
      const studentSnap = await tx.get(
        db.collection("roomAssignments")
          .where("userId", "==", userId)
          .where("status", "==", "ACTIVE")
      );

      // Read 3: Get room to check capacity
      const roomDoc = await tx.get(db.collection("rooms").doc(roomId));

      // Read 4: Count current active assignments for the room
      const allAssignments = await tx.get(
        db.collection("roomAssignments")
          .where("roomId", "==", roomId)
          .where("status", "==", "ACTIVE")
      );

      // Now validate (all reads done)
      if (!existingSnap.empty) {
        throw new Error("CONFLICT: This bed is already occupied");
      }

      if (!studentSnap.empty) {
        throw new Error("CONFLICT: This student already has an active room assignment");
      }

      // Write 1: Create assignment
      const ref = db.collection("roomAssignments").doc();
      tx.set(ref, {
        userId,
        roomId,
        buildingId,
        bedSpace,
        startDate: Timestamp.now(),
        endDate: null,
        status: "ACTIVE",
      });

      // Write 2: Update room status if this fills the room
      const roomData = roomDoc.data();
      if (roomData && allAssignments.size + 1 >= roomData.capacity) {
        tx.update(db.collection("rooms").doc(roomId), { status: "OCCUPIED" });
      }

      return ref.id;
    });

    return NextResponse.json({ id: result }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (message.startsWith("CONFLICT:")) {
      return NextResponse.json({ error: message.replace("CONFLICT: ", "") }, { status: 409 });
    }
    console.error("Assignment creation error:", err);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Only admin/staff can end assignments
    await requireApiRole(req, "ADMIN", "STAFF");

    const body = await req.json();
    const { assignmentId, status } = body;

    if (!assignmentId || !status) {
      return NextResponse.json({ error: "Missing assignmentId or status" }, { status: 400 });
    }

    const validStatuses = ["MOVED", "GRADUATED", "CHECKED_OUT"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Status must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    const db = getAdminDb();

    await db.runTransaction(async (tx) => {
      // All reads first
      const assignmentRef = db.collection("roomAssignments").doc(assignmentId);
      const assignmentDoc = await tx.get(assignmentRef);

      if (!assignmentDoc.exists) {
        throw new Error("Assignment not found");
      }

      const data = assignmentDoc.data()!;
      if (data.status !== "ACTIVE") {
        throw new Error("Assignment is not active");
      }

      const roomAssignments = await tx.get(
        db.collection("roomAssignments")
          .where("roomId", "==", data.roomId)
          .where("status", "==", "ACTIVE")
      );

      // All writes after reads
      tx.update(assignmentRef, {
        status,
        endDate: Timestamp.now(),
      });

      // If this was the last active assignment (count=1 means only the one we're ending)
      if (roomAssignments.size <= 1) {
        tx.update(db.collection("rooms").doc(data.roomId), { status: "AVAILABLE" });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
    console.error("Move-out error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
