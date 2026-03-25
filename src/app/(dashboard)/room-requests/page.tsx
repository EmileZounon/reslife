"use client";

import { useEffect, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, CheckCircle, XCircle, Clock } from "lucide-react";

interface RoomRequest {
  id: string;
  studentName: string;
  studentEmail: string;
  currentBuildingName: string;
  currentRoomNumber: string;
  currentBedSpace: string;
  desiredBuildingName: string;
  desiredRoomNumber: string;
  desiredBedSpace: string;
  status: string;
  requestedAt: { _seconds: number };
  resolvedByName?: string;
  denyReason?: string;
}

export default function RoomRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RoomRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [processing, setProcessing] = useState<string | null>(null);
  const [denyDialog, setDenyDialog] = useState<{ id: string; studentName: string } | null>(null);
  const [denyReason, setDenyReason] = useState("");

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  // Role guard (after hooks)
  if (user && user.role !== "ADMIN" && user.role !== "STAFF") {
    return <p className="text-center py-12 text-gray-500">Insufficient permissions.</p>;
  }

  async function loadRequests() {
    setLoading(true);
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const url = statusFilter === "ALL"
        ? "/api/room-requests"
        : `/api/room-requests?status=${statusFilter}`;
      const res = await fetch(url, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      setRequests(data.requests || []);
    } catch {
      console.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(requestId: string, action: "approve" | "deny", reason?: string) {
    setProcessing(requestId);
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const res = await fetch("/api/room-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ requestId, action, denyReason: reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to process request");
        return;
      }

      await loadRequests();
      setDenyDialog(null);
      setDenyReason("");
    } catch {
      alert("Network error");
    } finally {
      setProcessing(null);
    }
  }

  function formatDate(ts: { _seconds: number }) {
    return new Date(ts._seconds * 1000).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    });
  }

  const statusBadge: Record<string, { className: string; icon: React.ElementType }> = {
    PENDING: { className: "bg-yellow-100 text-yellow-700", icon: Clock },
    APPROVED: { className: "bg-green-100 text-green-700", icon: CheckCircle },
    DENIED: { className: "bg-red-100 text-red-700", icon: XCircle },
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
          <h2 className="text-2xl font-bold text-gray-900">Room Change Requests</h2>
          <p className="text-gray-500">Review and approve student room change requests</p>
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "PENDING")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="DENIED">Denied</SelectItem>
            <SelectItem value="ALL">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No {statusFilter === "ALL" ? "" : statusFilter.toLowerCase()} requests
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Current Room</TableHead>
                  <TableHead></TableHead>
                  <TableHead>Requested Room</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => {
                  const badge = statusBadge[r.status] || statusBadge.PENDING;
                  const BadgeIcon = badge.icon;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{r.studentName}</p>
                          <p className="text-xs text-gray-500">{r.studentEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{r.currentBuildingName}</p>
                        <p className="text-xs text-gray-500">Room {r.currentRoomNumber}, Bed {r.currentBedSpace}</p>
                      </TableCell>
                      <TableCell>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{r.desiredBuildingName}</p>
                        <p className="text-xs text-gray-500">Room {r.desiredRoomNumber}, Bed {r.desiredBedSpace}</p>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {r.requestedAt ? formatDate(r.requestedAt) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={badge.className}>
                          <BadgeIcon className="w-3 h-3 mr-1" />
                          {r.status}
                        </Badge>
                        {r.status === "DENIED" && r.denyReason && (
                          <p className="text-xs text-gray-500 mt-1">{r.denyReason}</p>
                        )}
                        {r.resolvedByName && (
                          <p className="text-xs text-gray-400 mt-1">by {r.resolvedByName}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.status === "PENDING" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleAction(r.id, "approve")}
                              disabled={processing === r.id}
                            >
                              {processing === r.id ? "..." : "Approve"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDenyDialog({ id: r.id, studentName: r.studentName })}
                              disabled={processing === r.id}
                            >
                              Deny
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Deny dialog */}
      <Dialog open={!!denyDialog} onOpenChange={() => { setDenyDialog(null); setDenyReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Room Change Request</DialogTitle>
          </DialogHeader>
          {denyDialog && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-gray-600">
                Deny {denyDialog.studentName}&apos;s room change request?
              </p>
              <div>
                <label className="text-sm font-medium">Reason (optional)</label>
                <Textarea
                  placeholder="Explain why the request is denied..."
                  value={denyReason}
                  onChange={(e) => setDenyReason(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setDenyDialog(null); setDenyReason(""); }}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleAction(denyDialog.id, "deny", denyReason)}
                  disabled={processing === denyDialog.id}
                >
                  {processing === denyDialog.id ? "Denying..." : "Deny Request"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
