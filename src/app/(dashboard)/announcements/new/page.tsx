"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  writeBatch,
  doc,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import type { Building, User } from "@/types";

export default function NewAnnouncementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [audience, setAudience] = useState("ALL");
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBuildings() {
      const db = getFirebaseDb();
      const snap = await getDocs(collection(db, "buildings"));
      setBuildings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Building)));
    }
    loadBuildings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !body) {
      setError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const db = getFirebaseDb();

      // Create announcement
      const announcementRef = await addDoc(collection(db, "announcements"), {
        authorId: user.id,
        authorName: user.name,
        title,
        body,
        priority,
        audience,
        buildingIds: audience === "BUILDING" ? selectedBuildings : [],
        publishAt: null,
        expiresAt: null,
        published: true,
        createdAt: Timestamp.now(),
      });

      // Generate in-app notifications for recipients
      let recipientQuery;
      if (audience === "ALL") {
        recipientQuery = query(collection(db, "users"), where("role", "==", "STUDENT"));
      } else if (audience === "STAFF") {
        recipientQuery = query(collection(db, "users"), where("role", "in", ["STAFF", "ADMIN"]));
      } else {
        // BUILDING audience — get students assigned to selected buildings
        recipientQuery = query(collection(db, "users"), where("role", "==", "STUDENT"));
      }

      const recipientsSnap = await getDocs(recipientQuery);
      const batch = writeBatch(db);

      for (const recipientDoc of recipientsSnap.docs) {
        const notifRef = doc(collection(db, "notifications"));
        batch.set(notifRef, {
          userId: recipientDoc.id,
          type: "ANNOUNCEMENT",
          title,
          body: body.slice(0, 200),
          read: false,
          channel: "IN_APP",
          relatedId: announcementRef.id,
          sentAt: Timestamp.now(),
          readAt: null,
        });
      }

      await batch.commit();

      // Send email for important/urgent (would call Resend here)
      if (priority === "IMPORTANT" || priority === "URGENT") {
        try {
          await fetch("/api/notifications/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              announcementId: announcementRef.id,
              title,
              body,
              recipientIds: recipientsSnap.docs.map((d) => d.id),
            }),
          });
        } catch {
          // Email failure shouldn't block the announcement
          console.error("Email notification failed");
        }
      }

      router.push("/announcements");
    } catch {
      setError("Failed to create announcement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/announcements" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">New Announcement</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Announcement Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement title..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your announcement..."
                rows={6}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="IMPORTANT">Important</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="ALL">All Students</option>
                  <option value="BUILDING">Specific Building(s)</option>
                  <option value="STAFF">Staff Only</option>
                </select>
              </div>
            </div>

            {audience === "BUILDING" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Buildings
                </label>
                <div className="space-y-2">
                  {buildings.map((b) => (
                    <label key={b.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedBuildings.includes(b.id)}
                        onChange={(e) =>
                          setSelectedBuildings((prev) =>
                            e.target.checked
                              ? [...prev, b.id]
                              : prev.filter((id) => id !== b.id)
                          )
                        }
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{b.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {(priority === "IMPORTANT" || priority === "URGENT") && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                Email notifications will be sent to all recipients for {priority.toLowerCase()} announcements.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-4">
          <Link href="/announcements">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Publishing..." : "Publish Announcement"}
          </Button>
        </div>
      </form>
    </div>
  );
}
