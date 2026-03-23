"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin } from "lucide-react";
import type { Building, Room, RoomAssignment } from "@/types";

interface BuildingWithStats extends Building {
  totalBeds: number;
  occupiedBeds: number;
  roomCount: number;
}

export default function BuildingsPage() {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<BuildingWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const db = getFirebaseDb();
      const [buildingsSnap, roomsSnap, assignmentsSnap] = await Promise.all([
        getDocs(collection(db, "buildings")),
        getDocs(collection(db, "rooms")),
        getDocs(query(collection(db, "roomAssignments"), where("status", "==", "ACTIVE"))),
      ]);

      const rooms = roomsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Room));
      const assignments = assignmentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RoomAssignment));

      const result: BuildingWithStats[] = buildingsSnap.docs.map((d) => {
        const building = { id: d.id, ...d.data() } as Building;
        const buildingRooms = rooms.filter((r) => r.buildingId === building.id);
        const totalBeds = buildingRooms.reduce((sum, r) => sum + r.capacity, 0);
        const occupiedBeds = assignments.filter((a) => a.buildingId === building.id).length;

        return { ...building, totalBeds, occupiedBeds, roomCount: buildingRooms.length };
      });

      setBuildings(result);
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Buildings</h2>
        <p className="text-gray-500">Manage buildings and room assignments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {buildings.map((building) => {
          const occupancyPercent =
            building.totalBeds > 0
              ? Math.round((building.occupiedBeds / building.totalBeds) * 100)
              : 0;

          return (
            <Link key={building.id} href={`/buildings/${building.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      {building.name}
                    </CardTitle>
                    <Badge variant="outline">{building.floors} floors</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="w-3.5 h-3.5" />
                    {building.address}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{building.roomCount} rooms</span>
                      <span className="font-medium">
                        {building.occupiedBeds}/{building.totalBeds} beds
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${
                          occupancyPercent > 90
                            ? "bg-red-500"
                            : occupancyPercent > 70
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{ width: `${occupancyPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-right">{occupancyPercent}% occupied</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {buildings.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No buildings found</p>
        </div>
      )}
    </div>
  );
}
