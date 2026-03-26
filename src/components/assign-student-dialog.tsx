"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getFirebaseDb, getFirebaseAuth } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Loader2 } from "lucide-react";
import type { User, RoomAssignment } from "@/types";

interface AssignStudentDialogProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  buildingId: string;
  roomNumber: string;
  buildingName: string;
  availableBeds: string[];
  onAssigned: () => void;
}

export function AssignStudentDialog({
  open,
  onClose,
  roomId,
  buildingId,
  roomNumber,
  buildingName,
  onAssigned,
}: AssignStudentDialogProps) {
  const [students, setStudents] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setError("");
    loadUnassignedStudents();
  }, [open]);

  async function loadUnassignedStudents() {
    setLoading(true);
    const db = getFirebaseDb();

    const [usersSnap, assignmentsSnap] = await Promise.all([
      getDocs(query(collection(db, "users"), where("role", "==", "STUDENT"))),
      getDocs(query(collection(db, "roomAssignments"), where("status", "==", "ACTIVE"))),
    ]);

    const assignedUserIds = new Set(
      assignmentsSnap.docs.map((d) => (d.data() as RoomAssignment).userId)
    );

    const unassigned = usersSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as User))
      .filter((u) => !assignedUserIds.has(u.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    setStudents(unassigned);
    setLoading(false);
  }

  async function handleAssign(studentId: string) {
    setAssigning(studentId);
    setError("");

    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: studentId,
          roomId,
          buildingId,
          bedSpace: "A",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to assign");
        setAssigning(null);
        return;
      }

      setAssigning(null);
      onAssigned();
      onClose();
    } catch {
      setError("Network error");
      setAssigning(null);
    }
  }

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Student to Room {roomNumber}</DialogTitle>
          <DialogDescription>
            {buildingName} — tap a student to assign them.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 px-1">{error}</p>
        )}

        <div className="max-h-64 overflow-y-auto space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">
              {search ? "No matching students" : "All students are assigned"}
            </p>
          ) : (
            filtered.map((student) => (
              <button
                key={student.id}
                onClick={() => handleAssign(student.id)}
                disabled={assigning !== null}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                    {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{student.name}</p>
                  <p className="text-xs text-gray-500 truncate">{student.email}</p>
                </div>
                {student.studentId && (
                  <Badge variant="outline" className="text-xs">
                    {student.studentId}
                  </Badge>
                )}
                {assigning === student.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <UserPlus className="w-4 h-4 text-gray-400" />
                )}
              </button>
            ))
          )}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
