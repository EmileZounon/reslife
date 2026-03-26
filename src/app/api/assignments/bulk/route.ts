import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { requireApiRole } from "@/lib/api-auth";

interface BulkRow {
  studentEmail: string;
  buildingName: string;
  roomNumber: string;
}

interface RowResult {
  row: number;
  status: "success" | "skipped" | "error";
  message: string;
}

export async function POST(req: NextRequest) {
  try {
    // Only admin/staff can bulk upload
    await requireApiRole(req, "ADMIN", "STAFF");

    const { rows } = (await req.json()) as { rows: BulkRow[] };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    if (rows.length > 500) {
      return NextResponse.json({ error: "Maximum 500 rows per upload. Please split your CSV." }, { status: 400 });
    }

    const db = getAdminDb();

    // Pre-load all buildings, rooms, users, and active assignments for lookup
    const [buildingsSnap, roomsSnap, usersSnap, assignmentsSnap] = await Promise.all([
      db.collection("buildings").get(),
      db.collection("rooms").get(),
      db.collection("users").where("role", "==", "STUDENT").get(),
      db.collection("roomAssignments").where("status", "==", "ACTIVE").get(),
    ]);

    const buildingsByName = new Map<string, string>(); // name (lowercase) -> id
    buildingsSnap.docs.forEach((d) => {
      buildingsByName.set(d.data().name.toLowerCase(), d.id);
    });

    const roomsByKey = new Map<string, { id: string; capacity: number; buildingId: string; status: string }>();
    roomsSnap.docs.forEach((d) => {
      const data = d.data();
      const buildingId = data.buildingId;
      const key = `${buildingId}:${data.number}`;
      roomsByKey.set(key, { id: d.id, capacity: data.capacity, buildingId, status: data.status });
    });

    const usersByEmail = new Map<string, { id: string; name: string }>(); // email -> { id, name }
    usersSnap.docs.forEach((d) => {
      const data = d.data();
      usersByEmail.set(data.email.toLowerCase(), { id: d.id, name: data.name });
    });

    // Track currently occupied rooms and students with active assignments
    const occupiedRooms = new Set<string>(); // roomId
    const studentsWithAssignments = new Set<string>(); // userId
    assignmentsSnap.docs.forEach((d) => {
      const data = d.data();
      occupiedRooms.add(data.roomId);
      studentsWithAssignments.add(data.userId);
    });

    const results: RowResult[] = [];
    const batch = db.batch();
    let batchCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header, array is 0-indexed

      // Find student by email
      const student = usersByEmail.get(row.studentEmail.toLowerCase());
      if (!student) {
        results.push({ row: rowNum, status: "error", message: `Student not found: ${row.studentEmail}` });
        continue;
      }

      // Check if student already has an active assignment
      if (studentsWithAssignments.has(student.id)) {
        results.push({ row: rowNum, status: "skipped", message: `${student.name} already has an active room assignment` });
        continue;
      }

      // Find building by name
      const buildingId = buildingsByName.get(row.buildingName.toLowerCase());
      if (!buildingId) {
        results.push({ row: rowNum, status: "error", message: `Building "${row.buildingName}" not found` });
        continue;
      }

      // Find room by building + number
      const roomKey = `${buildingId}:${row.roomNumber}`;
      const room = roomsByKey.get(roomKey);
      if (!room) {
        results.push({ row: rowNum, status: "error", message: `Room ${row.roomNumber} not found in ${row.buildingName}` });
        continue;
      }

      // Check if room is already occupied
      if (occupiedRooms.has(room.id)) {
        results.push({ row: rowNum, status: "skipped", message: `Room ${row.roomNumber} in ${row.buildingName} is already occupied` });
        continue;
      }

      // All good — create the assignment with bedSpace "A" and update room status
      const assignmentRef = db.collection("roomAssignments").doc();
      batch.set(assignmentRef, {
        userId: student.id,
        roomId: room.id,
        buildingId,
        bedSpace: "A",
        startDate: Timestamp.now(),
        endDate: null,
        status: "ACTIVE",
      });

      // Update room status to OCCUPIED
      const roomRef = db.collection("rooms").doc(room.id);
      batch.update(roomRef, { status: "OCCUPIED" });

      // Mark as occupied/assigned so subsequent rows in same CSV don't double-book
      occupiedRooms.add(room.id);
      studentsWithAssignments.add(student.id);
      batchCount++;

      results.push({
        row: rowNum,
        status: "success",
        message: `${student.name} assigned to ${row.buildingName} Room ${row.roomNumber}`,
      });
    }

    // Commit batch
    if (batchCount > 0) {
      await batch.commit();
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const skippedCount = results.filter((r) => r.status === "skipped").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      summary: { total: rows.length, success: successCount, skipped: skippedCount, errors: errorCount },
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
    console.error("Bulk upload error:", err);
    return NextResponse.json({ error: "Bulk upload failed" }, { status: 500 });
  }
}
