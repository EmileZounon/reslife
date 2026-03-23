"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wrench, Plus, Search } from "lucide-react";
import type { MaintenanceRequest, Room, Building } from "@/types";

interface RequestRow extends MaintenanceRequest {
  roomNumber: string;
  buildingName: string;
}

const priorityColor: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const statusColor: Record<string, string> = {
  REPORTED: "bg-blue-100 text-blue-700",
  ASSIGNED: "bg-yellow-100 text-yellow-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
};

export default function MaintenancePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const db = getFirebaseDb();
      const snap = await getDocs(
        query(collection(db, "maintenanceRequests"), orderBy("createdAt", "desc"))
      );

      const rooms = new Map<string, Room>();
      const buildings = new Map<string, Building>();

      const items: RequestRow[] = [];
      for (const d of snap.docs) {
        const data = { id: d.id, ...d.data() } as MaintenanceRequest;

        // Filter: students only see their own
        if (user?.role === "STUDENT" && data.requesterId !== user.id) continue;

        if (!rooms.has(data.roomId)) {
          const roomDoc = await getDoc(doc(db, "rooms", data.roomId));
          if (roomDoc.exists()) rooms.set(data.roomId, { id: roomDoc.id, ...roomDoc.data() } as Room);
        }
        const room = rooms.get(data.roomId);

        if (room && !buildings.has(room.buildingId)) {
          const bDoc = await getDoc(doc(db, "buildings", room.buildingId));
          if (bDoc.exists()) buildings.set(room.buildingId, { id: bDoc.id, ...bDoc.data() } as Building);
        }
        const building = room ? buildings.get(room.buildingId) : undefined;

        items.push({
          ...data,
          roomNumber: room?.number || "Unknown",
          buildingName: building?.name || "Unknown",
        });
      }

      setRequests(items);
      setLoading(false);
    }
    load();
  }, [user]);

  const filtered = requests.filter((r) => {
    const matchesSearch =
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase()) ||
      r.buildingName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          <h2 className="text-2xl font-bold text-gray-900">Maintenance Requests</h2>
          <p className="text-gray-500">{requests.length} requests</p>
        </div>
        <Link href="/maintenance/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="ALL">All Status</option>
          <option value="REPORTED">Reported</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((req) => (
          <Link key={req.id} href={`/maintenance/${req.id}`}>
            <Card className="hover:shadow-sm transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 py-4">
                <Wrench className="w-5 h-5 text-orange-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">
                    {req.category} — {req.buildingName}, Room {req.roomNumber}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{req.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={priorityColor[req.priority]}>{req.priority}</Badge>
                  <Badge className={statusColor[req.status]}>{req.status.replace("_", " ")}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Wrench className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{search ? "No requests match your search" : "No maintenance requests"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
