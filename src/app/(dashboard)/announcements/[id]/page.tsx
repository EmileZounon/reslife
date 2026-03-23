"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Megaphone } from "lucide-react";
import type { Announcement } from "@/types";

const priorityColor: Record<string, string> = {
  NORMAL: "bg-gray-100 text-gray-700",
  IMPORTANT: "bg-yellow-100 text-yellow-700",
  URGENT: "bg-red-100 text-red-700",
};

export default function AnnouncementDetailPage() {
  const params = useParams();
  const announcementId = params.id as string;
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const db = getFirebaseDb();
      const snap = await getDoc(doc(db, "announcements", announcementId));
      if (snap.exists()) {
        setAnnouncement({ id: snap.id, ...snap.data() } as Announcement);
      }
      setLoading(false);
    }
    load();
  }, [announcementId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!announcement) return <p className="text-gray-500">Announcement not found</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/announcements" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Announcement</h2>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Megaphone className="w-6 h-6 text-blue-600 mt-0.5" />
              <div>
                <CardTitle className="text-xl">{announcement.title}</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  By {announcement.authorName} ·{" "}
                  {announcement.createdAt?.toDate?.()?.toLocaleDateString() || ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge className={priorityColor[announcement.priority]}>
                {announcement.priority}
              </Badge>
              <Badge variant="outline">
                {announcement.audience === "ALL" ? "All Students" : announcement.audience}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {announcement.body}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
