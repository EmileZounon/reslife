"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { isStaff } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, Plus } from "lucide-react";
import type { Announcement } from "@/types";

const priorityColor: Record<string, string> = {
  NORMAL: "bg-gray-100 text-gray-700",
  IMPORTANT: "bg-yellow-100 text-yellow-700",
  URGENT: "bg-red-100 text-red-700",
};

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const db = getFirebaseDb();
      const snap = await getDocs(
        query(
          collection(db, "announcements"),
          where("published", "==", true),
          orderBy("createdAt", "desc")
        )
      );

      setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement)));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Announcements</h2>
          <p className="text-gray-500">{announcements.length} announcements</p>
        </div>
        {isStaff(user) && (
          <Link href="/announcements/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Announcement
            </Button>
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {announcements.map((ann) => (
          <Link key={ann.id} href={`/announcements/${ann.id}`}>
            <Card className="hover:shadow-sm transition-shadow cursor-pointer">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Megaphone className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">{ann.title}</p>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ann.body}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        By {ann.authorName} · {ann.createdAt?.toDate?.()?.toLocaleDateString() || ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={priorityColor[ann.priority]}>{ann.priority}</Badge>
                    <Badge variant="outline" className="text-xs">
                      {ann.audience === "ALL" ? "All Students" : ann.audience}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {announcements.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Megaphone className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No announcements yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
