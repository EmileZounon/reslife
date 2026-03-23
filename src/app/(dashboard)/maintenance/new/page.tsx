"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, addDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import type { Room, Building, RoomAssignment } from "@/types";

interface RoomOption {
  roomId: string;
  buildingId: string;
  label: string;
}

export default function NewMaintenancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [roomOptions, setRoomOptions] = useState<RoomOption[]>([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [category, setCategory] = useState("PLUMBING");
  const [priority, setPriority] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRooms() {
      const db = getFirebaseDb();

      // For students, auto-select their assigned room
      if (user?.role === "STUDENT") {
        const assignSnap = await getDocs(
          query(
            collection(db, "roomAssignments"),
            where("userId", "==", user.id),
            where("status", "==", "ACTIVE")
          )
        );
        if (assignSnap.docs.length > 0) {
          const assignment = assignSnap.docs[0].data() as RoomAssignment;
          setSelectedRoom(assignment.roomId);
          setRoomOptions([
            {
              roomId: assignment.roomId,
              buildingId: assignment.buildingId,
              label: `Your Room`,
            },
          ]);
        }
        return;
      }

      // For staff/admin, show all rooms
      const [roomsSnap, buildingsSnap] = await Promise.all([
        getDocs(collection(db, "rooms")),
        getDocs(collection(db, "buildings")),
      ]);

      const buildings = new Map(
        buildingsSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as Building])
      );

      const options: RoomOption[] = roomsSnap.docs.map((d) => {
        const room = { id: d.id, ...d.data() } as Room;
        const building = buildings.get(room.buildingId);
        return {
          roomId: room.id,
          buildingId: room.buildingId,
          label: `${building?.name || "Unknown"} — Room ${room.number}`,
        };
      });

      options.sort((a, b) => a.label.localeCompare(b.label));
      setRoomOptions(options);
    }
    loadRooms();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRoom || !description) {
      setError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const db = getFirebaseDb();
      const roomOption = roomOptions.find((r) => r.roomId === selectedRoom);

      await addDoc(collection(db, "maintenanceRequests"), {
        requesterId: user.id,
        roomId: selectedRoom,
        buildingId: roomOption?.buildingId || "",
        category,
        priority,
        description,
        status: "REPORTED",
        assigneeId: null,
        attachmentUrls: [],
        notes: [],
        createdAt: Timestamp.now(),
        completedAt: null,
      });

      router.push("/maintenance");
    } catch {
      setError("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/maintenance" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">New Maintenance Request</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
              {user?.role === "STUDENT" ? (
                <p className="text-sm text-gray-600">
                  {roomOptions[0]?.label || "No room assigned"}
                </p>
              ) : (
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select a room...</option>
                  {roomOptions.map((r) => (
                    <option key={r.roomId} value={r.roomId}>
                      {r.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="PLUMBING">Plumbing</option>
                  <option value="ELECTRICAL">Electrical</option>
                  <option value="FURNITURE">Furniture</option>
                  <option value="HVAC">HVAC</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue..."
                rows={4}
                required
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-4">
          <Link href="/maintenance">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </form>
    </div>
  );
}
