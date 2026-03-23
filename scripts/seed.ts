/**
 * Seed script for Firestore development data.
 * Run with: npx tsx scripts/seed.ts
 *
 * Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * in .env.local (loaded via dotenv).
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { config } from "dotenv";

config({ path: ".env.local" });

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore(app);
const auth = getAuth(app);

const now = Timestamp.now();

async function createUser(
  email: string,
  name: string,
  role: string,
  extra: Record<string, unknown> = {}
) {
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
  } catch {
    const created = await auth.createUser({
      email,
      password: "password123",
      displayName: name,
    });
    uid = created.uid;
  }

  await db.collection("users").doc(uid).set({
    email,
    name,
    role,
    createdAt: now,
    ...extra,
  });

  return uid;
}

async function seed() {
  console.log("Seeding Firestore...");

  // ─── Users ─────────────────────────────────────
  const adminId = await createUser("admin@school.edu", "Dr. Sarah Chen", "ADMIN", {
    phone: "617-555-0100",
  });
  const staff1Id = await createUser("ra.johnson@school.edu", "Marcus Johnson", "STAFF", {
    phone: "617-555-0201",
  });
  const staff2Id = await createUser("rd.williams@school.edu", "Lisa Williams", "STAFF", {
    phone: "617-555-0202",
  });
  const maintId = await createUser("maint.garcia@school.edu", "Carlos Garcia", "MAINTENANCE", {
    phone: "617-555-0301",
  });

  const studentIds: string[] = [];
  const students = [
    { email: "alice.wang@school.edu", name: "Alice Wang", studentId: "STU-001" },
    { email: "bob.smith@school.edu", name: "Bob Smith", studentId: "STU-002" },
    { email: "carol.davis@school.edu", name: "Carol Davis", studentId: "STU-003" },
    { email: "david.lee@school.edu", name: "David Lee", studentId: "STU-004" },
    { email: "emma.brown@school.edu", name: "Emma Brown", studentId: "STU-005" },
    { email: "frank.wilson@school.edu", name: "Frank Wilson", studentId: "STU-006" },
    { email: "grace.kim@school.edu", name: "Grace Kim", studentId: "STU-007" },
    { email: "henry.taylor@school.edu", name: "Henry Taylor", studentId: "STU-008" },
    { email: "iris.martinez@school.edu", name: "Iris Martinez", studentId: "STU-009" },
    { email: "jack.anderson@school.edu", name: "Jack Anderson", studentId: "STU-010" },
  ];

  for (const s of students) {
    const id = await createUser(s.email, s.name, "STUDENT", { studentId: s.studentId });
    studentIds.push(id);
  }

  // ─── Buildings ─────────────────────────────────
  const buildings = [
    { name: "North Hall", address: "100 Campus Drive", floors: 4 },
    { name: "West Hall", address: "200 Campus Drive", floors: 3 },
    { name: "East Hall", address: "300 Campus Drive", floors: 3 },
  ];

  const buildingIds: string[] = [];
  for (const b of buildings) {
    const ref = await db.collection("buildings").add({ ...b, createdAt: now });
    buildingIds.push(ref.id);
  }

  // ─── Building Staff ────────────────────────────
  await db.collection("buildingStaff").add({
    buildingId: buildingIds[0],
    userId: staff1Id,
    role: "RA",
  });
  await db.collection("buildingStaff").add({
    buildingId: buildingIds[1],
    userId: staff2Id,
    role: "RD",
  });

  // ─── Rooms ─────────────────────────────────────
  const rooms: Array<{
    buildingId: string;
    number: string;
    floor: number;
    type: string;
    capacity: number;
    status: string;
  }> = [];

  // North Hall: 4 floors, 2 rooms each
  for (let floor = 1; floor <= 4; floor++) {
    rooms.push({
      buildingId: buildingIds[0],
      number: `${floor}01`,
      floor,
      type: "DOUBLE",
      capacity: 2,
      status: "AVAILABLE",
    });
    rooms.push({
      buildingId: buildingIds[0],
      number: `${floor}02`,
      floor,
      type: "SINGLE",
      capacity: 1,
      status: "AVAILABLE",
    });
  }

  // West Hall: 3 floors, 2 rooms each
  for (let floor = 1; floor <= 3; floor++) {
    rooms.push({
      buildingId: buildingIds[1],
      number: `${floor}01`,
      floor,
      type: "DOUBLE",
      capacity: 2,
      status: "AVAILABLE",
    });
    rooms.push({
      buildingId: buildingIds[1],
      number: `${floor}02`,
      floor,
      type: "TRIPLE",
      capacity: 3,
      status: "AVAILABLE",
    });
  }

  // East Hall: 3 floors, 2 rooms each
  for (let floor = 1; floor <= 3; floor++) {
    rooms.push({
      buildingId: buildingIds[2],
      number: `${floor}01`,
      floor,
      type: "SUITE",
      capacity: 4,
      status: "AVAILABLE",
    });
  }

  const roomIds: string[] = [];
  for (const r of rooms) {
    const ref = await db.collection("rooms").add(r);
    roomIds.push(ref.id);
  }

  // ─── Room Assignments (first 6 students) ──────
  const assignments = [
    { userId: studentIds[0], roomId: roomIds[0], buildingId: buildingIds[0], bedSpace: "A" },
    { userId: studentIds[1], roomId: roomIds[0], buildingId: buildingIds[0], bedSpace: "B" },
    { userId: studentIds[2], roomId: roomIds[2], buildingId: buildingIds[0], bedSpace: "A" },
    { userId: studentIds[3], roomId: roomIds[8], buildingId: buildingIds[1], bedSpace: "A" },
    { userId: studentIds[4], roomId: roomIds[8], buildingId: buildingIds[1], bedSpace: "B" },
    { userId: studentIds[5], roomId: roomIds[14], buildingId: buildingIds[2], bedSpace: "A" },
  ];

  for (const a of assignments) {
    await db.collection("roomAssignments").add({
      ...a,
      startDate: now,
      endDate: null,
      status: "ACTIVE",
    });
  }

  // ─── Sample Maintenance Request ────────────────
  await db.collection("maintenanceRequests").add({
    requesterId: studentIds[0],
    roomId: roomIds[0],
    buildingId: buildingIds[0],
    category: "HVAC",
    priority: "HIGH",
    description: "Heater is not working. Room temperature is very cold.",
    status: "REPORTED",
    assigneeId: null,
    attachmentUrls: [],
    notes: [],
    createdAt: now,
    completedAt: null,
  });

  // ─── Sample Incident Report ────────────────────
  await db.collection("incidentReports").add({
    reporterId: staff1Id,
    studentIds: [studentIds[0], studentIds[1]],
    type: "RULE_VIOLATION",
    severity: "MEDIUM",
    date: "2026-03-22",
    time: "23:30",
    location: "North Hall, Room 101",
    description: "Noise violation after quiet hours. Students were playing loud music.",
    aiSummary: null,
    attachmentUrls: [],
    status: "PENDING_REVIEW",
    createdAt: now,
  });

  // ─── Sample Announcement ───────────────────────
  await db.collection("announcements").add({
    authorId: adminId,
    authorName: "Dr. Sarah Chen",
    title: "Spring Break Move-Out Deadline",
    body: "All students must vacate their rooms by Friday, March 28 at 5:00 PM. Please ensure all personal belongings are removed and rooms are cleaned before departure.",
    priority: "IMPORTANT",
    audience: "ALL",
    buildingIds: [],
    publishAt: null,
    expiresAt: null,
    published: true,
    createdAt: now,
  });

  console.log("Seed complete!");
  console.log(`  ${studentIds.length + 4} users`);
  console.log(`  ${buildingIds.length} buildings`);
  console.log(`  ${roomIds.length} rooms`);
  console.log(`  ${assignments.length} room assignments`);
  console.log(`  1 maintenance request`);
  console.log(`  1 incident report`);
  console.log(`  1 announcement`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
