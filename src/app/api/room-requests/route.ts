import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { verifyApiAuth, requireApiRole } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  try {
    const caller = await verifyApiAuth(req);

    if (caller.role !== "STUDENT") {
      return NextResponse.json({ error: "Only students can request room changes" }, { status: 403 });
    }

    const body = await req.json();
    const {
      currentAssignmentId,
      currentBuildingId,
      currentBuildingName,
      currentRoomNumber,
      currentBedSpace,
      desiredRoomId,
      desiredBuildingId,
      desiredBuildingName,
      desiredRoomNumber,
      desiredBedSpace,
    } = body;

    if (!currentAssignmentId || !desiredRoomId || !desiredBedSpace) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getAdminDb();

    const selDoc = await db.collection("roomSelection").doc("current").get();
    if (!selDoc.exists || !selDoc.data()?.open) {
      return NextResponse.json({ error: "Room selection is currently closed" }, { status: 403 });
    }

    const userDoc = await db.collection("users").doc(caller.uid).get();
    const userData = userDoc.data();

    const existingSnap = await db.collection("roomChangeRequests")
      .where("studentId", "==", caller.uid)
      .where("status", "==", "PENDING")
      .get();

    if (!existingSnap.empty) {
      return NextResponse.json({ error: "You already have a pending room change request" }, { status: 409 });
    }

    const bedCheck = await db.collection("roomAssignments")
      .where("roomId", "==", desiredRoomId)
      .where("bedSpace", "==", desiredBedSpace)
      .where("status", "==", "ACTIVE")
      .get();

    if (!bedCheck.empty) {
      return NextResponse.json({ error: "That bed is no longer available" }, { status: 409 });
    }

    const ref = await db.collection("roomChangeRequests").add({
      studentId: caller.uid,
      studentName: userData?.name || "Unknown",
      studentEmail: userData?.email || "",
      currentAssignmentId,
      currentBuildingId,
      currentBuildingName,
      currentRoomNumber,
      currentBedSpace,
      desiredRoomId,
      desiredBuildingId,
      desiredBuildingName,
      desiredRoomNumber,
      desiredBedSpace,
      status: "PENDING",
      requestedAt: Timestamp.now(),
      resolvedAt: null,
      resolvedBy: null,
      resolvedByName: null,
      denyReason: null,
    });

    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.error("Room change request error:", err);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const caller = await verifyApiAuth(req);
    const db = getAdminDb();

    if (caller.role === "STUDENT") {
      const snap = await db.collection("roomChangeRequests")
        .where("studentId", "==", caller.uid)
        .orderBy("requestedAt", "desc")
        .get();
      const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ requests });
    }

    if (caller.role !== "ADMIN" && caller.role !== "STAFF") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const statusFilter = req.nextUrl.searchParams.get("status");
    let snap;
    if (statusFilter) {
      snap = await db.collection("roomChangeRequests")
        .where("status", "==", statusFilter)
        .orderBy("requestedAt", "desc")
        .get();
    } else {
      snap = await db.collection("roomChangeRequests")
        .orderBy("requestedAt", "desc")
        .get();
    }

    const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ requests });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.error("Room change request list error:", err);
    return NextResponse.json({ error: "Failed to list requests" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const caller = await requireApiRole(req, "ADMIN", "STAFF");

    const body = await req.json();
    const { requestId, action, denyReason } = body;

    if (!requestId || !action) {
      return NextResponse.json({ error: "Missing requestId or action" }, { status: 400 });
    }

    if (action !== "approve" && action !== "deny") {
      return NextResponse.json({ error: "Action must be 'approve' or 'deny'" }, { status: 400 });
    }

    const db = getAdminDb();

    const approverDoc = await db.collection("users").doc(caller.uid).get();
    const approverName = approverDoc.data()?.name || "Unknown";

    if (action === "deny") {
      await db.collection("roomChangeRequests").doc(requestId).update({
        status: "DENIED",
        resolvedAt: Timestamp.now(),
        resolvedBy: caller.uid,
        resolvedByName: approverName,
        denyReason: denyReason || null,
      });
      return NextResponse.json({ success: true, status: "DENIED" });
    }

    // Approve: transaction to end old assignment + create new one
    await db.runTransaction(async (tx) => {
      const requestRef = db.collection("roomChangeRequests").doc(requestId);
      const requestDoc = await tx.get(requestRef);

      if (!requestDoc.exists) {
        throw new Error("Request not found");
      }

      const reqData = requestDoc.data()!;
      if (reqData.status !== "PENDING") {
        throw new Error("Request is no longer pending");
      }

      // Read: check desired bed is still available
      const bedCheck = await tx.get(
        db.collection("roomAssignments")
          .where("roomId", "==", reqData.desiredRoomId)
          .where("bedSpace", "==", reqData.desiredBedSpace)
          .where("status", "==", "ACTIVE")
      );

      if (!bedCheck.empty) {
        throw new Error("CONFLICT: The desired bed is no longer available");
      }

      const currentAssignmentRef = db.collection("roomAssignments").doc(reqData.currentAssignmentId);
      const currentAssignment = await tx.get(currentAssignmentRef);

      const currentRoomAssignments = await tx.get(
        db.collection("roomAssignments")
          .where("roomId", "==", currentAssignment.data()?.roomId)
          .where("status", "==", "ACTIVE")
      );

      const desiredRoomDoc = await tx.get(db.collection("rooms").doc(reqData.desiredRoomId));
      const desiredRoomAssignments = await tx.get(
        db.collection("roomAssignments")
          .where("roomId", "==", reqData.desiredRoomId)
          .where("status", "==", "ACTIVE")
      );

      // --- All reads done, now writes ---

      if (currentAssignment.exists) {
        tx.update(currentAssignmentRef, {
          status: "MOVED",
          endDate: Timestamp.now(),
        });

        if (currentRoomAssignments.size <= 1) {
          tx.update(db.collection("rooms").doc(currentAssignment.data()!.roomId), { status: "AVAILABLE" });
        }
      }

      const newAssignmentRef = db.collection("roomAssignments").doc();
      tx.set(newAssignmentRef, {
        userId: reqData.studentId,
        roomId: reqData.desiredRoomId,
        buildingId: reqData.desiredBuildingId,
        bedSpace: reqData.desiredBedSpace,
        startDate: Timestamp.now(),
        endDate: null,
        status: "ACTIVE",
      });

      const desiredRoomData = desiredRoomDoc.data();
      if (desiredRoomData && desiredRoomAssignments.size + 1 >= desiredRoomData.capacity) {
        tx.update(db.collection("rooms").doc(reqData.desiredRoomId), { status: "OCCUPIED" });
      }

      tx.update(requestRef, {
        status: "APPROVED",
        resolvedAt: Timestamp.now(),
        resolvedBy: caller.uid,
        resolvedByName: approverName,
      });
    });

    return NextResponse.json({ success: true, status: "APPROVED" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
    if (message.startsWith("CONFLICT:")) {
      return NextResponse.json({ error: message.replace("CONFLICT: ", "") }, { status: 409 });
    }
    console.error("Room change approval error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
