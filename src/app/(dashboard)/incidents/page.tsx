"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Plus, Search } from "lucide-react";
import type { IncidentReport, User } from "@/types";
import type { Timestamp } from "firebase/firestore";

interface IncidentRow extends IncidentReport {
  reporterName: string;
}

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

function timeAgo(timestamp: Timestamp): string {
  const ms = Date.now() - timestamp.toMillis();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function IncidentsPage() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const db = getFirebaseDb();
      const snap = await getDocs(
        query(collection(db, "incidentReports"), orderBy("createdAt", "desc"))
      );

      const items: IncidentRow[] = [];
      for (const d of snap.docs) {
        const data = { id: d.id, ...d.data() } as IncidentReport;
        let reporterName = "Unknown";
        try {
          const reporterDoc = await getDoc(doc(db, "users", data.reporterId));
          if (reporterDoc.exists()) reporterName = (reporterDoc.data() as User).name;
        } catch {}
        items.push({ ...data, reporterName });
      }

      setIncidents(items);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = incidents.filter(
    (i) =>
      i.location.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase()) ||
      i.type.toLowerCase().includes(search.toLowerCase())
  );

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
          <h2 className="text-2xl font-bold text-gray-900">Incident Reports</h2>
          <p className="text-gray-500">{incidents.length} reports</p>
        </div>
        <Link href="/incidents/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Report
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by location, type, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((incident) => (
          <Link key={incident.id} href={`/incidents/${incident.id}`}>
            <Card className="hover:shadow-sm transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 py-4">
                <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">
                    {incident.type.replace("_", " ")} — {incident.location}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{incident.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    By {incident.reporterName} · {incident.date} at {incident.time}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={severityColor[incident.severity]}>{incident.severity}</Badge>
                  <Badge className={statusColor[incident.status]}>
                    {incident.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{search ? "No incidents match your search" : "No incidents reported"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
