import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function GET(request: Request) {
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = Timestamp.now();

    // Find unpublished announcements with publishAt <= now
    const snapshot = await getAdminDb()
      .collection("announcements")
      .where("published", "==", false)
      .where("publishAt", "<=", now)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ published: 0 });
    }

    const batch = getAdminDb().batch();
    let count = 0;

    for (const doc of snapshot.docs) {
      batch.update(doc.ref, { published: true });
      count++;

      // Generate notifications for each announcement
      const data = doc.data();
      const recipientsSnap = await getAdminDb()
        .collection("users")
        .where("role", "==", "STUDENT")
        .get();

      for (const recipient of recipientsSnap.docs) {
        const notifRef = getAdminDb().collection("notifications").doc();
        batch.set(notifRef, {
          userId: recipient.id,
          type: "ANNOUNCEMENT",
          title: data.title,
          body: (data.body as string).slice(0, 200),
          read: false,
          channel: "IN_APP",
          relatedId: doc.id,
          sentAt: now,
          readAt: null,
        });
      }
    }

    await batch.commit();

    return NextResponse.json({ published: count });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
