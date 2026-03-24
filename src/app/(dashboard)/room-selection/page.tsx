"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getFirebaseDb, getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, DoorOpen, CheckCircle, Lock, BedDouble } from "lucide-react";
import type { Building, Room, RoomAssignment, BedSpace } from "@/types";

interface RoomWithAvailability extends Room {
  buildingName: string;
  occupiedBeds: Set<string>;
  availableBeds: BedSpace[];
}

export default function RoomSelectionPage() {
  const { user } = useAuth();
  const [selectionOpen, setSelectionOpen] = useState<boolean | null>(null);
  const [currentAssignment, setCurrentAssignment] = useState<{
    buildingName: string;
    roomNumber: string;
    bedSpace: string;
  } | null>(null);
  const [rooms, setRooms] = useState<RoomWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<RoomWithAvailability | null>(null);
  const [selectedBed, setSelectedBed] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [buildingFilter, setBuildingFilter] = useState("all");
  const [buildings, setBuildings] = useState<Building[]>([]);

  useEffect(() => {
    async function load() {
      // Check if selection window is open
      const selRes = await fetch("/api/assignments/selection");
      const selData = await selRes.json();
      setSelectionOpen(selData.open);

      if (!selData.open) {
        setLoading(false);
        return;
      }

      const db = getFirebaseDb();
      const [buildingsSnap, roomsSnap, assignmentsSnap] = await Promise.all([
        getDocs(collection(db, "buildings")),
        getDocs(collection(db, "rooms")),
        getDocs(query(collection(db, "roomAssignments"), where("status", "==", "ACTIVE"))),
      ]);

      const buildingsMap = new Map<string, Building>();
      const buildingsList: Building[] = [];
      buildingsSnap.docs.forEach((d) => {
        const b = { id: d.id, ...d.data() } as Building;
        buildingsMap.set(d.id, b);
        buildingsList.push(b);
      });
      setBuildings(buildingsList);

      const assignments = assignmentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RoomAssignment));

      // Check if current student already has an assignment
      const myAssignment = assignments.find((a) => a.userId === user?.id);
      if (myAssignment) {
        const room = roomsSnap.docs.find((d) => d.id === myAssignment.roomId);
        const building = room ? buildingsMap.get(room.data().buildingId) : undefined;
        setCurrentAssignment({
          buildingName: building?.name || "Unknown",
          roomNumber: room?.data().number || "?",
          bedSpace: myAssignment.bedSpace,
        });
        setLoading(false);
        return;
      }

      // Build available rooms list
      const availableRooms: RoomWithAvailability[] = roomsSnap.docs
        .map((d) => {
          const room = { id: d.id, ...d.data() } as Room;
          if (room.status === "MAINTENANCE") return null;

          const building = buildingsMap.get(room.buildingId);
          const roomAssignments = assignments.filter((a) => a.roomId === room.id);
          const occupiedBeds = new Set(roomAssignments.map((a) => a.bedSpace));
          const allBeds = Array.from({ length: room.capacity }, (_, i) =>
            String.fromCharCode(65 + i)
          ) as BedSpace[];
          const availableBeds = allBeds.filter((b) => !occupiedBeds.has(b));

          if (availableBeds.length === 0) return null;

          return {
            ...room,
            buildingName: building?.name || "Unknown",
            occupiedBeds,
            availableBeds,
          };
        })
        .filter(Boolean) as RoomWithAvailability[];

      availableRooms.sort((a, b) => {
        if (a.buildingName !== b.buildingName) return a.buildingName.localeCompare(b.buildingName);
        return a.number.localeCompare(b.number);
      });

      setRooms(availableRooms);
      setLoading(false);
    }
    load();
  }, [user, success]);

  async function handleSelect() {
    if (!selectedRoom || !selectedBed || !user) return;
    setSubmitting(true);
    setError("");

    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          userId: user.id,
          roomId: selectedRoom.id,
          buildingId: selectedRoom.buildingId,
          bedSpace: selectedBed,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to select room");
        return;
      }

      setSuccess(true);
      setSelectedRoom(null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredRooms = buildingFilter === "all"
    ? rooms
    : rooms.filter((r) => r.buildingId === buildingFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Selection window is closed
  if (!selectionOpen) {
    return (
      <div className="text-center py-16">
        <Lock className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Room Selection is Closed</h2>
        <p className="text-gray-500">Room selection is not currently open. Check back later or contact your RA.</p>
      </div>
    );
  }

  // Student already has a room
  if (currentAssignment) {
    return (
      <div className="text-center py-16">
        <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">You Have a Room</h2>
        <p className="text-gray-600">
          {currentAssignment.buildingName}, Room {currentAssignment.roomNumber}, Bed {currentAssignment.bedSpace}
        </p>
        <p className="text-sm text-gray-500 mt-2">Contact your RA if you need to change rooms.</p>
      </div>
    );
  }

  // Success just happened
  if (success) {
    return (
      <div className="text-center py-16">
        <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Room Selected!</h2>
        <p className="text-gray-500">Your room assignment has been confirmed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Select Your Room</h2>
        <p className="text-gray-500">Browse available rooms and choose your bed. First come, first served.</p>
      </div>

      {/* Building filter */}
      <Select value={buildingFilter} onValueChange={setBuildingFilter}>
        <SelectTrigger className="w-full sm:w-64">
          <SelectValue placeholder="All Buildings" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Buildings ({rooms.length} rooms available)</SelectItem>
          {buildings.map((b) => {
            const count = rooms.filter((r) => r.buildingId === b.id).length;
            return (
              <SelectItem key={b.id} value={b.id}>
                {b.name} ({count} rooms)
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Room cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map((room) => (
          <Card key={room.id} className="border-2 border-green-200 bg-green-50 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-1.5">
                  <DoorOpen className="w-4 h-4" />
                  Room {room.number}
                </CardTitle>
                <Badge variant="outline">{room.type}</Badge>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {room.buildingName} — Floor {room.floor}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 mb-3">
                {Array.from({ length: room.capacity }).map((_, i) => {
                  const bed = String.fromCharCode(65 + i);
                  const isOccupied = room.occupiedBeds.has(bed);
                  return (
                    <div
                      key={bed}
                      className={`flex items-center gap-2 px-2 py-1 rounded text-sm ${
                        isOccupied ? "bg-gray-100 text-gray-400 line-through" : "bg-white"
                      }`}
                    >
                      <BedDouble className="w-3 h-3" />
                      <span>Bed {bed}</span>
                      {isOccupied ? (
                        <span className="ml-auto text-xs">Taken</span>
                      ) : (
                        <span className="ml-auto text-xs text-green-600">Available</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  setSelectedRoom(room);
                  setSelectedBed(room.availableBeds[0]);
                  setError("");
                }}
              >
                Select This Room
              </Button>
            </CardContent>
          </Card>
        ))}

        {filteredRooms.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <BedDouble className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No available rooms in this building</p>
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={!!selectedRoom} onOpenChange={() => setSelectedRoom(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Room Selection</DialogTitle>
          </DialogHeader>
          {selectedRoom && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-gray-600">
                {selectedRoom.buildingName}, Room {selectedRoom.number} ({selectedRoom.type})
              </p>

              <div>
                <label className="text-sm font-medium">Choose Your Bed</label>
                <Select value={selectedBed} onValueChange={setSelectedBed}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedRoom.availableBeds.map((b) => (
                      <SelectItem key={b} value={b}>Bed {b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedRoom(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSelect} disabled={submitting}>
                  {submitting ? "Confirming..." : "Confirm Selection"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
