"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { isAdmin } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Upload, Settings } from "lucide-react";
import type { Building, Room, RoomAssignment, User } from "@/types";

interface OccupancyRow {
  buildingName: string;
  buildingId: string;
  roomNumber: string;
  roomId: string;
  floor: number;
  type: string;
  capacity: number;
  occupants: Array<{ name: string; email: string; studentId?: string; bedSpace: string; userId: string }>;
  availableBeds: string[];
  status: string;
}

export default function OccupancyPage() {
  const { user: currentUser } = useAuth();
  const [rows, setRows] = useState<OccupancyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [buildings, setBuildings] = useState<Building[]>([]);

  useEffect(() => {
    async function load() {
      const db = getFirebaseDb();
      const [buildingsSnap, roomsSnap, assignmentsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, "buildings")),
        getDocs(collection(db, "rooms")),
        getDocs(query(collection(db, "roomAssignments"), where("status", "==", "ACTIVE"))),
        getDocs(query(collection(db, "users"), where("role", "==", "STUDENT"))),
      ]);

      const buildingsMap = new Map<string, Building>();
      const buildingsList: Building[] = [];
      buildingsSnap.docs.forEach((d) => {
        const b = { id: d.id, ...d.data() } as Building;
        buildingsMap.set(d.id, b);
        buildingsList.push(b);
      });
      setBuildings(buildingsList);

      const usersMap = new Map<string, User>();
      usersSnap.docs.forEach((d) => {
        usersMap.set(d.id, { id: d.id, ...d.data() } as User);
      });

      const assignments = assignmentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RoomAssignment));

      const occupancyRows: OccupancyRow[] = roomsSnap.docs.map((d) => {
        const room = { id: d.id, ...d.data() } as Room;
        const building = buildingsMap.get(room.buildingId);
        const roomAssignments = assignments.filter((a) => a.roomId === room.id);

        const allBeds = Array.from({ length: room.capacity }, (_, i) =>
          String.fromCharCode(65 + i)
        );
        const occupiedBeds = new Set<string>(roomAssignments.map((a) => a.bedSpace));

        const occupants = roomAssignments
          .map((a) => {
            const u = usersMap.get(a.userId);
            return u
              ? { name: u.name, email: u.email, studentId: u.studentId, bedSpace: a.bedSpace, userId: u.id }
              : null;
          })
          .filter(Boolean) as OccupancyRow["occupants"];

        const availableBeds = allBeds.filter((b) => !occupiedBeds.has(b));
        const effectiveStatus =
          room.status === "MAINTENANCE"
            ? "MAINTENANCE"
            : occupants.length === 0
            ? "EMPTY"
            : occupants.length >= room.capacity
            ? "FULL"
            : "PARTIAL";

        return {
          buildingName: building?.name || "Unknown",
          buildingId: room.buildingId,
          roomNumber: room.number,
          roomId: room.id,
          floor: room.floor,
          type: room.type,
          capacity: room.capacity,
          occupants,
          availableBeds,
          status: effectiveStatus,
        };
      });

      occupancyRows.sort((a, b) => {
        if (a.buildingName !== b.buildingName) return a.buildingName.localeCompare(b.buildingName);
        if (a.floor !== b.floor) return a.floor - b.floor;
        return a.roomNumber.localeCompare(b.roomNumber);
      });

      setRows(occupancyRows);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = rows.filter((r) => {
    if (buildingFilter !== "all" && r.buildingId !== buildingFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        r.roomNumber.toLowerCase().includes(s) ||
        r.buildingName.toLowerCase().includes(s) ||
        r.occupants.some(
          (o) =>
            o.name.toLowerCase().includes(s) ||
            o.email.toLowerCase().includes(s) ||
            o.studentId?.toLowerCase().includes(s)
        )
      );
    }
    return true;
  });

  const totalBeds = filtered.reduce((sum, r) => sum + r.capacity, 0);
  const occupiedBeds = filtered.reduce((sum, r) => sum + r.occupants.length, 0);
  const emptyRooms = filtered.filter((r) => r.status === "EMPTY").length;
  const fullRooms = filtered.filter((r) => r.status === "FULL").length;

  const statusBadge: Record<string, string> = {
    EMPTY: "bg-green-100 text-green-700",
    PARTIAL: "bg-yellow-100 text-yellow-700",
    FULL: "bg-blue-100 text-blue-700",
    MAINTENANCE: "bg-orange-100 text-orange-700",
  };

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
          <h2 className="text-2xl font-bold text-gray-900">Room Occupancy</h2>
          <p className="text-gray-500">
            {occupiedBeds} of {totalBeds} beds occupied ({totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0}%)
          </p>
        </div>
        {isAdmin(currentUser) && (
          <div className="flex gap-2">
            <Link href="/assignments/bulk">
              <Button size="sm" variant="outline">
                <Upload className="w-4 h-4 mr-1" />
                Bulk Upload
              </Button>
            </Link>
            <Link href="/assignments/settings">
              <Button size="sm" variant="outline">
                <Settings className="w-4 h-4 mr-1" />
                Settings
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{emptyRooms}</p>
            <p className="text-sm text-gray-500">Empty Rooms</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{filtered.filter((r) => r.status === "PARTIAL").length}</p>
            <p className="text-sm text-gray-500">Partially Filled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{fullRooms}</p>
            <p className="text-sm text-gray-500">Full Rooms</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{totalBeds - occupiedBeds}</p>
            <p className="text-sm text-gray-500">Beds Available</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search room, building, or student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={buildingFilter} onValueChange={(v) => setBuildingFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Buildings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buildings</SelectItem>
            {buildings.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="EMPTY">Empty</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="FULL">Full</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Building</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Occupants</TableHead>
                <TableHead>Available Beds</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.roomId}>
                  <TableCell>
                    <Link href={`/buildings/${row.buildingId}`} className="text-blue-600 hover:underline">
                      {row.buildingName}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono">{row.roomNumber} (Floor {row.floor})</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusBadge[row.status] || ""}>{row.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {row.occupants.length === 0 ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <div className="space-y-1">
                        {row.occupants.map((o) => (
                          <div key={o.userId} className="text-sm">
                            <Link href={`/students/${o.userId}`} className="text-blue-600 hover:underline">
                              {o.name}
                            </Link>
                            <span className="text-gray-400 ml-1">(Bed {o.bedSpace})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.availableBeds.length === 0 ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <span className="font-mono text-green-600">{row.availableBeds.join(", ")}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No rooms match your filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
