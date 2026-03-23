"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, updateDoc, Timestamp, arrayUnion } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { isMaintenance } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Wrench, Clock, CheckCircle, Play, UserCheck } from "lucide-react";
import type { MaintenanceRequest, User, Room, Building, MaintenanceNote } from "@/types";

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

const statusIcon: Record<string, React.ElementType> = {
  REPORTED: Clock,
  ASSIGNED: UserCheck,
  IN_PROGRESS: Play,
  COMPLETED: CheckCircle,
};

export default function MaintenanceDetailPage() {
  const params = useParams();
  const requestId = params.id as string;
  const { user } = useAuth();
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [requester, setRequester] = useState<User | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function load() {
      const db = getFirebaseDb();
      const snap = await getDoc(doc(db, "maintenanceRequests", requestId));
      if (!snap.exists()) {
        setLoading(false);
        return;
      }

      const data = { id: snap.id, ...snap.data() } as MaintenanceRequest;
      setRequest(data);

      const [requesterDoc, roomDoc] = await Promise.all([
        getDoc(doc(db, "users", data.requesterId)),
        getDoc(doc(db, "rooms", data.roomId)),
      ]);

      if (requesterDoc.exists()) setRequester({ id: requesterDoc.id, ...requesterDoc.data() } as User);
      if (roomDoc.exists()) {
        const roomData = { id: roomDoc.id, ...roomDoc.data() } as Room;
        setRoom(roomData);
        const bDoc = await getDoc(doc(db, "buildings", roomData.buildingId));
        if (bDoc.exists()) setBuilding({ id: bDoc.id, ...bDoc.data() } as Building);
      }

      setLoading(false);
    }
    load();
  }, [requestId]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!request || !user) return;
    setUpdating(true);
    const db = getFirebaseDb();
    const updates: Record<string, unknown> = { status: newStatus };

    if (newStatus === "ASSIGNED") updates.assigneeId = user.id;
    if (newStatus === "COMPLETED") updates.completedAt = Timestamp.now();

    await updateDoc(doc(db, "maintenanceRequests", request.id), updates);
    setRequest({ ...request, ...updates } as MaintenanceRequest);
    setUpdating(false);
  };

  const handleAddNote = async () => {
    if (!request || !user || !newNote.trim()) return;
    setUpdating(true);
    const db = getFirebaseDb();
    const note: MaintenanceNote = {
      authorId: user.id,
      authorName: user.name,
      content: newNote.trim(),
      createdAt: Timestamp.now(),
    };

    await updateDoc(doc(db, "maintenanceRequests", request.id), {
      notes: arrayUnion(note),
    });

    setRequest({
      ...request,
      notes: [...(request.notes || []), note],
    });
    setNewNote("");
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!request) return <p className="text-gray-500">Request not found</p>;

  const canManage = isMaintenance(user);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/maintenance" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Maintenance Request</h2>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Wrench className="w-6 h-6 text-orange-500 mt-0.5" />
              <div>
                <p className="font-semibold text-lg">{request.category}</p>
                <p className="text-gray-500">
                  {building?.name} — Room {room?.number}
                </p>
                <p className="text-sm text-gray-400">
                  Requested by {requester?.name || "Unknown"}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={priorityColor[request.priority]}>{request.priority}</Badge>
              <Badge className={statusColor[request.status]}>{request.status.replace("_", " ")}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{request.description}</p>
        </CardContent>
      </Card>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {["REPORTED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"].map((status) => {
              const StatusIcon = statusIcon[status];
              const isActive = request.status === status;
              const isPast =
                ["REPORTED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"].indexOf(request.status) >=
                ["REPORTED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"].indexOf(status);

              return (
                <div
                  key={status}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    isActive ? "bg-blue-50 border border-blue-200" : ""
                  }`}
                >
                  <StatusIcon
                    className={`w-5 h-5 ${isPast ? "text-blue-600" : "text-gray-300"}`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      isPast ? "text-gray-900" : "text-gray-400"
                    }`}
                  >
                    {status.replace("_", " ")}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(request.notes || []).length === 0 && (
            <p className="text-sm text-gray-500">No notes yet</p>
          )}
          {(request.notes || []).map((note, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700">{note.content}</p>
              <p className="text-xs text-gray-400 mt-1">
                {note.authorName} · {note.createdAt?.toDate?.()?.toLocaleString() || ""}
              </p>
            </div>
          ))}

          {canManage && request.status !== "COMPLETED" && (
            <div className="flex gap-2 mt-3">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                rows={2}
                className="flex-1"
              />
              <Button onClick={handleAddNote} disabled={updating || !newNote.trim()} size="sm">
                Add
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {canManage && request.status !== "COMPLETED" && (
        <Card>
          <CardContent className="flex gap-3 py-4">
            {request.status === "REPORTED" && (
              <Button onClick={() => handleStatusUpdate("ASSIGNED")} disabled={updating}>
                <UserCheck className="w-4 h-4 mr-2" />
                Assign to Me
              </Button>
            )}
            {request.status === "ASSIGNED" && (
              <Button onClick={() => handleStatusUpdate("IN_PROGRESS")} disabled={updating}>
                <Play className="w-4 h-4 mr-2" />
                Start Work
              </Button>
            )}
            {request.status === "IN_PROGRESS" && (
              <Button
                onClick={() => handleStatusUpdate("COMPLETED")}
                disabled={updating}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Complete
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
