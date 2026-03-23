"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { isAdmin } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, CheckCircle, ArrowUp } from "lucide-react";
import type { IncidentReport, User } from "@/types";

const severityColor: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

const statusColor: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  REVIEWED: "bg-green-100 text-green-700",
  ESCALATED: "bg-red-100 text-red-700",
};

export default function IncidentDetailPage() {
  const params = useParams();
  const incidentId = params.id as string;
  const { user } = useAuth();
  const [incident, setIncident] = useState<IncidentReport | null>(null);
  const [reporter, setReporter] = useState<User | null>(null);
  const [involvedStudents, setInvolvedStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function load() {
      const db = getFirebaseDb();
      const snap = await getDoc(doc(db, "incidentReports", incidentId));
      if (!snap.exists()) {
        setLoading(false);
        return;
      }

      const data = { id: snap.id, ...snap.data() } as IncidentReport;
      setIncident(data);

      // Load reporter
      const reporterDoc = await getDoc(doc(db, "users", data.reporterId));
      if (reporterDoc.exists()) setReporter({ id: reporterDoc.id, ...reporterDoc.data() } as User);

      // Load students
      const studentDocs = await Promise.all(
        data.studentIds.map((id) => getDoc(doc(db, "users", id)))
      );
      setInvolvedStudents(
        studentDocs
          .filter((d) => d.exists())
          .map((d) => ({ id: d.id, ...d.data() } as User))
      );

      setLoading(false);
    }
    load();
  }, [incidentId]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!incident) return;
    setUpdating(true);
    const db = getFirebaseDb();
    await updateDoc(doc(db, "incidentReports", incident.id), { status: newStatus });
    setIncident({ ...incident, status: newStatus as IncidentReport["status"] });
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!incident) return <p className="text-gray-500">Incident not found</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/incidents" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Incident Report</h2>
      </div>

      {/* Header Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-500 mt-0.5" />
              <div>
                <p className="font-semibold text-lg">{incident.type.replace("_", " ")}</p>
                <p className="text-gray-500">{incident.location}</p>
                <p className="text-sm text-gray-400">
                  {incident.date} at {incident.time} · Reported by {reporter?.name || "Unknown"}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={severityColor[incident.severity]}>{incident.severity}</Badge>
              <Badge className={statusColor[incident.status]}>{incident.status.replace("_", " ")}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Students Involved</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {involvedStudents.map((s) => (
              <Link key={s.id} href={`/students/${s.id}`}>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer">
                  {s.name}
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 whitespace-pre-wrap">{incident.description}</p>
        </CardContent>
      </Card>

      {/* AI Summary */}
      {incident.aiSummary && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="text-base text-purple-700">AI Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{incident.aiSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Review Actions */}
      {isAdmin(user) && incident.status === "PENDING_REVIEW" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button
              onClick={() => handleStatusUpdate("REVIEWED")}
              disabled={updating}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Reviewed
            </Button>
            <Button
              variant="outline"
              onClick={() => handleStatusUpdate("ESCALATED")}
              disabled={updating}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <ArrowUp className="w-4 h-4 mr-2" />
              Escalate
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
