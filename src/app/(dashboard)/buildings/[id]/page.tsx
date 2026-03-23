"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowLeft, DoorOpen, User as UserIcon } from "lucide-react";
import type { Building, Room, RoomAssignment, User } from "@/types";

interface RoomWithOccupants extends Room {
  occupants: Array<{ assignment: RoomAssignment; user: User }>;
}

export default function BuildingDetailPage() {
  const params = useParams();
  const buildingId = params.id as string;
  const [building, setBuilding] = useState<Building | null>(null);
  const [rooms, setRooms] = useState<RoomWithOccupants[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const db = getFirebaseDb();

      const buildingDoc = await getDoc(doc(db, "buildings", buildingId));
      if (!buildingDoc.exists()) return;
      setBuilding({ id: buildingDoc.id, ...buildingDoc.data() } as Building);

      const [roomsSnap, assignmentsSnap] = await Promise.all([
        getDocs(query(collection(db, "rooms"), where("buildingId", "==", buildingId))),
        getDocs(
          query(
            collection(db, "roomAssignments"),
            where("buildingId", "==", buildingId),
            where("status", "==", "ACTIVE")
          )
        ),
      ]);

      const assignments = assignmentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RoomAssignment));

      // Fetch users for all assignments
      const userIds = [...new Set(assignments.map((a) => a.userId))];
      const users: Record<string, User> = {};
      for (const uid of userIds) {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          users[uid] = { id: userDoc.id, ...userDoc.data() } as User;
        }
      }

      const roomsWithOccupants: RoomWithOccupants[] = roomsSnap.docs
        .map((d) => {
          const room = { id: d.id, ...d.data() } as Room;
          const roomAssignments = assignments.filter((a) => a.roomId === room.id);
          const occupants = roomAssignments
            .map((a) => ({ assignment: a, user: users[a.userId] }))
            .filter((o) => o.user);
          return { ...room, occupants };
        })
        .sort((a, b) => {
          if (a.floor !== b.floor) return a.floor - b.floor;
          return a.number.localeCompare(b.number);
        });

      setRooms(roomsWithOccupants);
      setLoading(false);
    }
    load();
  }, [buildingId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!building) {
    return <p className="text-gray-500">Building not found</p>;
  }

  // Group rooms by floor
  const floors = new Map<number, RoomWithOccupants[]>();
  for (const room of rooms) {
    const floorRooms = floors.get(room.floor) || [];
    floorRooms.push(room);
    floors.set(room.floor, floorRooms);
  }

  const roomStatusColor: Record<string, string> = {
    AVAILABLE: "border-green-200 bg-green-50",
    OCCUPIED: "border-blue-200 bg-blue-50",
    MAINTENANCE: "border-orange-200 bg-orange-50",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/buildings" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            {building.name}
          </h2>
          <p className="text-gray-500">{building.address}</p>
        </div>
      </div>

      {[...floors.entries()]
        .sort(([a], [b]) => a - b)
        .map(([floor, floorRooms]) => (
          <div key={floor}>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Floor {floor}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {floorRooms.map((room) => (
                <Card
                  key={room.id}
                  className={`${roomStatusColor[room.status] || ""} border-2`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-1.5">
                        <DoorOpen className="w-4 h-4" />
                        Room {room.number}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {room.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1.5">
                      {Array.from({ length: room.capacity }).map((_, i) => {
                        const bedLabel = String.fromCharCode(65 + i);
                        const occupant = room.occupants.find(
                          (o) => o.assignment.bedSpace === bedLabel
                        );

                        return (
                          <div
                            key={bedLabel}
                            className={`flex items-center gap-2 px-2 py-1 rounded text-sm ${
                              occupant ? "bg-white" : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            <span className="font-mono text-xs w-4">{bedLabel}</span>
                            {occupant ? (
                              <Link
                                href={`/students/${occupant.user.id}`}
                                className="flex items-center gap-1 text-blue-600 hover:underline"
                              >
                                <UserIcon className="w-3 h-3" />
                                {occupant.user.name}
                              </Link>
                            ) : (
                              <span>Empty</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {room.occupants.length}/{room.capacity} occupied
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
