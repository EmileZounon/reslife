"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getFirebaseDb, getFirebaseAuth } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User, BedSpace } from "@/types";

interface AssignStudentDialogProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  buildingId: string;
  roomNumber: string;
  buildingName: string;
  availableBeds: BedSpace[];
  onAssigned: () => void;
}

export function AssignStudentDialog({
  open,
  onClose,
  roomId,
  buildingId,
  roomNumber,
  buildingName,
  availableBeds,
  onAssigned,
}: AssignStudentDialogProps) {
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedBed, setSelectedBed] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    async function loadUnassigned() {
      const db = getFirebaseDb();
      const [usersSnap, assignmentsSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), where("role", "==", "STUDENT"))),
        getDocs(query(collection(db, "roomAssignments"), where("status", "==", "ACTIVE"))),
      ]);

      const assignedUserIds = new Set(assignmentsSnap.docs.map((d) => d.data().userId));
      const unassigned = usersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as User))
        .filter((u) => !assignedUserIds.has(u.id))
        .sort((a, b) => a.name.localeCompare(b.name));

      setStudents(unassigned);
    }
    loadUnassigned();
    setSelectedStudent("");
    setSelectedBed(availableBeds[0] || "");
    setError("");
  }, [open, availableBeds]);

  async function handleAssign() {
    if (!selectedStudent || !selectedBed) return;
    setSubmitting(true);
    setError("");

    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          userId: selectedStudent,
          roomId,
          buildingId,
          bedSpace: selectedBed,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to assign");
        return;
      }

      onAssigned();
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Student to Room {roomNumber}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500">{buildingName}</p>

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">Student</label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student..." />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.email})
                  </SelectItem>
                ))}
                {students.length === 0 && (
                  <SelectItem value="_none" disabled>
                    No unassigned students
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Bed Space</label>
            <Select value={selectedBed} onValueChange={setSelectedBed}>
              <SelectTrigger>
                <SelectValue placeholder="Select bed..." />
              </SelectTrigger>
              <SelectContent>
                {availableBeds.map((b) => (
                  <SelectItem key={b} value={b}>
                    Bed {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!selectedStudent || !selectedBed || submitting}>
              {submitting ? "Assigning..." : "Assign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
