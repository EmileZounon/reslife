import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
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

async function assignSamples() {
  // Get all students
  const usersSnap = await db.collection("users").where("role", "==", "STUDENT").get();
  const students = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  console.log(`Found ${students.length} students:`);
  students.forEach((s) => console.log(`  ${s.name} (${s.email})`));

  if (students.length === 0) {
    console.log("No students to assign.");
    return;
  }

  // Get buildings and their rooms
  const buildingsSnap = await db.collection("buildings").get();
  const buildings = buildingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Spread students across different buildings for variety
  const roomsSnap = await db.collection("rooms").get();
  const allRooms = roomsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Pick rooms from different buildings — floor 1 rooms for easy demo
  const assignments = [];
  for (let i = 0; i < students.length; i++) {
    const building = buildings[i % buildings.length];
    const buildingRooms = allRooms
      .filter((r) => r.buildingId === building.id)
      .sort((a, b) => a.number.localeCompare(b.number));

    // Pick first available room in that building (skip already-picked ones)
    const pickedRoomIds = new Set(assignments.map((a) => a.roomId));
    const room = buildingRooms.find((r) => !pickedRoomIds.has(r.id));

    if (room) {
      assignments.push({
        student: students[i],
        building,
        room,
        roomId: room.id,
      });
    }
  }

  // Write assignments
  const batch = db.batch();
  for (const a of assignments) {
    const assignRef = db.collection("roomAssignments").doc();
    batch.set(assignRef, {
      userId: a.student.id,
      roomId: a.room.id,
      buildingId: a.building.id,
      bedSpace: "A",
      startDate: new Date(),
      endDate: null,
      status: "ACTIVE",
    });

    // Update room status
    batch.update(db.collection("rooms").doc(a.room.id), { status: "OCCUPIED" });

    console.log(`\n  ${a.student.name} → ${a.building.name}, Room ${a.room.number}`);
  }

  await batch.commit();
  console.log(`\nDone! Assigned ${assignments.length} students to rooms.`);
}

assignSamples().catch(console.error);
