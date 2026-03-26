/**
 * Add 15 more student accounts to Firebase Auth + Firestore.
 * Run with: node scripts/add-more-students.mjs
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

const students = [
  { email: "sophia.rodriguez@school.edu", name: "Sophia Rodriguez", studentId: "STU-011" },
  { email: "liam.nguyen@school.edu", name: "Liam Nguyen", studentId: "STU-012" },
  { email: "olivia.patel@school.edu", name: "Olivia Patel", studentId: "STU-013" },
  { email: "noah.williams@school.edu", name: "Noah Williams", studentId: "STU-014" },
  { email: "ava.thompson@school.edu", name: "Ava Thompson", studentId: "STU-015" },
  { email: "ethan.kim@school.edu", name: "Ethan Kim", studentId: "STU-016" },
  { email: "mia.johnson@school.edu", name: "Mia Johnson", studentId: "STU-017" },
  { email: "lucas.garcia@school.edu", name: "Lucas Garcia", studentId: "STU-018" },
  { email: "isabella.chen@school.edu", name: "Isabella Chen", studentId: "STU-019" },
  { email: "mason.clark@school.edu", name: "Mason Clark", studentId: "STU-020" },
  { email: "charlotte.lewis@school.edu", name: "Charlotte Lewis", studentId: "STU-021" },
  { email: "aiden.walker@school.edu", name: "Aiden Walker", studentId: "STU-022" },
  { email: "amelia.scott@school.edu", name: "Amelia Scott", studentId: "STU-023" },
  { email: "james.robinson@school.edu", name: "James Robinson", studentId: "STU-024" },
  { email: "harper.adams@school.edu", name: "Harper Adams", studentId: "STU-025" },
];

async function createStudent(email, name, studentId) {
  let uid;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    console.log(`  [exists] ${email} (uid: ${uid})`);
  } catch {
    const created = await auth.createUser({
      email,
      password: "password123",
      displayName: name,
    });
    uid = created.uid;
    console.log(`  [created] ${email} (uid: ${uid})`);
  }

  await db.collection("users").doc(uid).set({
    email,
    name,
    role: "STUDENT",
    studentId,
    createdAt: now,
  });

  return uid;
}

async function main() {
  console.log("Adding 15 new students to Firebase Auth + Firestore...\n");

  let created = 0;
  for (const s of students) {
    await createStudent(s.email, s.name, s.studentId);
    created++;
  }

  console.log(`\nDone! ${created} students processed.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
