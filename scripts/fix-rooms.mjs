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

async function fixRooms() {
  // 1. Update all rooms to SINGLE, capacity 1
  const roomsSnap = await db.collection("rooms").get();
  console.log(`Found ${roomsSnap.size} rooms. Updating all to SINGLE...`);

  const batch = db.batch();
  for (const doc of roomsSnap.docs) {
    const data = doc.data();
    console.log(`  Room ${data.number} (${data.type}, capacity ${data.capacity}) → SINGLE, capacity 1`);
    batch.update(doc.ref, {
      type: "SINGLE",
      capacity: 1,
    });
  }

  // 2. Remove any extra bed assignments (keep only bedSpace "A" active, end others)
  const assignmentsSnap = await db.collection("roomAssignments").where("status", "==", "ACTIVE").get();
  const roomAssignments = new Map(); // roomId -> first assignment

  for (const doc of assignmentsSnap.docs) {
    const data = doc.data();
    const roomId = data.roomId;

    if (!roomAssignments.has(roomId)) {
      // Keep first assignment, set bedSpace to A
      roomAssignments.set(roomId, doc.id);
      batch.update(doc.ref, { bedSpace: "A" });
      console.log(`  Keeping assignment for room ${roomId}, setting bedSpace to A`);
    } else {
      // End duplicate assignments (room is now single)
      batch.update(doc.ref, {
        status: "MOVED",
        endDate: new Date(),
        bedSpace: "A",
      });
      console.log(`  Ending duplicate assignment in room ${roomId} (now single room)`);
    }
  }

  await batch.commit();
  console.log("\nDone! All rooms are now SINGLE with capacity 1.");

  // 3. Show current buildings
  const buildingsSnap = await db.collection("buildings").get();
  console.log("\nCurrent buildings:");
  for (const doc of buildingsSnap.docs) {
    const data = doc.data();
    console.log(`  ${doc.id}: ${data.name} (${data.address})`);
  }
}

fixRooms().catch(console.error);
