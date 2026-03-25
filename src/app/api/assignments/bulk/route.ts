import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { requireApiRole } from "@/lib/api-auth";

interface BulkRow {
  name: string;
  email: string;
  studentId: string;
  building: string;
  roomNumber: string;
  bed: string;
}

interface RowResult {
  row: number;
  status: "success" | "error";
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

    // Pre-load all buildings and rooms for lookup
    const [buildingsSnap, roomsSnap, usersSnap, assignmentsSnap] = await Promise.all([
      db.collection("buildings").get(),
      db.collection("rooms").get(),
      db.collection("users").where("role", "==", "STUDENT").get(),
      db.collection("roomAssignments").where("status", "==", "ACTIVE").get(),
    ]);

    const buildingsByName = new Map<string, string>(); // name -> id
    buildingsSnap.docs.forEach((d) => {
      buildingsByName.set(d.data().name.toLowerCase(), d.id);
    });

    const roomsByKey = new Map<string, { id: string; capacity: number; buildingId: string }>();
    roomsSnap.docs.forEach((d) => {
      const data = d.data();
      const buildingId = data.buildingId;
      const key = `${buildingId}:${data.number}`;
      roomsByKey.set(key, { id: d.id, capacity: data.capacity, buildingId });
    });

    const usersByEmail = new Map<string, string>(); // email -> id
    const usersByStudentId = new Map<string, string>(); // studentId -> id
    usersSnap.docs.forEach((d) => {
      const data = d.data();
      usersByEmail.set(data.email.toLowerCase(), d.id);
      if (data.studentId) usersByStudentId.set(data.studentId, d.id);
    });

    // Track currently occupied beds: "roomId:bedSpace" -> true
    const occupiedBeds = new Set<string>();
    const studentsWithAssignments = new Set<string>();
    assignmentsSnap.docs.forEach((d) => {
      const data = d.data();
      occupiedBeds.add(`${data.roomId}:${data.bedSpace}`);
      studentsWithAssignments.add(data.userId);
    });

    const results: RowResult[] = [];
    const batch = db.batch();
    let batchCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header, array is 0-indexed

      // Find building
      const buildingId = buildingsByName.get(row.building.toLowerCase());
      if (!buildingId) {
        results.push({ row: rowNum, status: "error", message: `Building "${row.building}" not found` });
        continue;
      }

      // Find room
      const roomKey = `${buildingId}:${row.roomNumber}`;
      const room = roomsByKey.get(roomKey);
      if (!room) {
        results.push({ row: rowNum, status: "error", message: `Room ${row.roomNumber} not found in ${row.building}` });
        continue;
      }

      // Validate bed space
      const bed = row.bed.toUpperCase();
      const maxBed = String.fromCharCode(64 + room.capacity); // A=1, B=2, etc.
      if (bed > maxBed || bed < "A") {
        results.push({ row: rowNum, status: "error", message: `Bed ${bed} invalid for this room (capacity: ${room.capacity}, beds A-${maxBed})` });
        continue;
      }

      // Find student by email or studentId
      let userId = usersByEmail.get(row.email.toLowerCase());
      if (!userId && row.studentId) {
        userId = usersByStudentId.get(row.studentId);
      }
      if (!userId) {
        results.push({ row: rowNum, status: "error", message: `Student not found: ${row.email} / ${row.studentId}` });
        continue;
      }

      // Check if student already has assignment
      if (studentsWithAssignments.has(userId)) {
        results.push({ row: rowNum, status: "error", message: `${row.name} already has an active room assignment` });
        continue;
      }

      // Check if bed is occupied
      const bedKey = `${room.id}:${bed}`;
      if (occupiedBeds.has(bedKey)) {
        results.push({ row: rowNum, status: "error", message: `Bed ${bed} in Room ${row.roomNumber} (${row.building}) is already occupied` });
        continue;
      }

      // All good — add to batch
      const ref = db.collection("roomAssignments").doc();
      batch.set(ref, {
        userId,
        roomId: room.id,
        buildingId,
        bedSpace: bed,
        startDate: Timestamp.now(),
        endDate: null,
        status: "ACTIVE",
      });

      // Mark as occupied so subsequent rows in same CSV don't double-book
      occupiedBeds.add(bedKey);
      studentsWithAssignments.add(userId);
      batchCount++;

      results.push({ row: rowNum, status: "success", message: `${row.name} assigned to ${row.building} Room ${row.roomNumber}, Bed ${bed}` });
    }

    // Commit batch
    if (batchCount > 0) {
      await batch.commit();
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      summary: { total: rows.length, success: successCount, errors: errorCount },
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
