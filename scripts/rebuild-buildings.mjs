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

const BUILDINGS = [
  { name: "Kennedy Hall", address: "Campus Drive" },
  { name: "Emerson Hall", address: "Campus Drive" },
  { name: "Gardner Hall", address: "Campus Drive" },
  { name: "Wheatley Hall", address: "Campus Drive" },
];

const FLOORS = 3;
const ROOMS_PER_FLOOR = 30;

async function rebuild() {
  // 1. Delete all existing rooms and their assignments
  console.log("Deleting existing rooms and assignments...");

  const roomsSnap = await db.collection("rooms").get();
  const assignmentsSnap = await db.collection("roomAssignments").get();

  // Delete in batches of 500 (Firestore limit)
  let batch = db.batch();
  let count = 0;

  for (const doc of assignmentsSnap.docs) {
    batch.delete(doc.ref);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  console.log(`  Deleted ${assignmentsSnap.size} assignments`);

  for (const doc of roomsSnap.docs) {
    batch.delete(doc.ref);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log(`  Deleted ${roomsSnap.size} rooms`);

  // 2. Delete existing buildings
  const buildingsSnap = await db.collection("buildings").get();
  batch = db.batch();
  for (const doc of buildingsSnap.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
  console.log(`  Deleted ${buildingsSnap.size} buildings`);

  // 3. Create new buildings and rooms
  for (const building of BUILDINGS) {
    const buildingRef = await db.collection("buildings").add({
      name: building.name,
      address: building.address,
      floors: FLOORS,
      createdAt: new Date(),
    });

    console.log(`\nCreated ${building.name} (${buildingRef.id})`);

    // Create rooms in batches
    batch = db.batch();
    count = 0;

    for (let floor = 1; floor <= FLOORS; floor++) {
      for (let room = 1; room <= ROOMS_PER_FLOOR; room++) {
        const roomNumber = `${floor}${String(room).padStart(2, "0")}`;
        const roomRef = db.collection("rooms").doc();
        batch.set(roomRef, {
          buildingId: buildingRef.id,
          number: roomNumber,
          floor,
          type: "SINGLE",
          capacity: 1,
          status: "AVAILABLE",
        });
        count++;

        if (count % 400 === 0) {
          await batch.commit();
          batch = db.batch();
        }
      }
    }

    await batch.commit();
    console.log(`  Created ${FLOORS * ROOMS_PER_FLOOR} rooms (${FLOORS} floors x ${ROOMS_PER_FLOOR} rooms)`);
  }

  const totalRooms = BUILDINGS.length * FLOORS * ROOMS_PER_FLOOR;
  console.log(`\nDone! ${BUILDINGS.length} buildings, ${totalRooms} total rooms (all SINGLE).`);
}

rebuild().catch(console.error);
