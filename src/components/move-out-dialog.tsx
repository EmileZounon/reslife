"use client";

import { useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
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

interface MoveOutDialogProps {
  open: boolean;
  onClose: () => void;
  assignmentId: string;
  studentName: string;
  roomNumber: string;
  bedSpace: string;
  onMoveOut: () => void;
}

export function MoveOutDialog({
  open,
  onClose,
  assignmentId,
  studentName,
  roomNumber,
  bedSpace,
  onMoveOut,
}: MoveOutDialogProps) {
  const [reason, setReason] = useState("CHECKED_OUT");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setSubmitting(true);
    setError("");

    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const res = await fetch("/api/assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ assignmentId, status: reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to process move-out");
        return;
      }

      onMoveOut();
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
          <DialogTitle>Move Out Student</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-sm text-gray-600">
            Remove <strong>{studentName}</strong> from Room {roomNumber}, Bed {bedSpace}?
          </p>

          <div>
            <label className="text-sm font-medium">Reason</label>
            <Select value={reason} onValueChange={(v) => v && setReason(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CHECKED_OUT">Checked Out</SelectItem>
                <SelectItem value="MOVED">Moved to Another Room</SelectItem>
                <SelectItem value="GRADUATED">Graduated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
              {submitting ? "Processing..." : "Confirm Move-Out"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
