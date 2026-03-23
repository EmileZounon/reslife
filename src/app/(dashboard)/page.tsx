"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, Wrench, AlertTriangle } from "lucide-react";

interface DashboardStats {
  totalStudents: number;
  totalRooms: number;
  occupiedBeds: number;
  totalBeds: number;
  openMaintenance: number;
  urgentMaintenance: number;
  recentIncidents: number;
  pendingReview: number;
}

interface RecentItem {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  severity?: string;
  status?: string;
}

const severityColor: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
  URGENT: "bg-red-100 text-red-700",
};

const statusColor: Record<string, string> = {
  REPORTED: "bg-blue-100 text-blue-700",
  ASSIGNED: "bg-yellow-100 text-yellow-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
};

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentList({ title, items, type }: { title: string; items: RecentItem[]; type: "incident" | "maintenance" }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">No items to display</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.subtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.severity && (
                    <Badge className={severityColor[item.severity] || ""}>{item.severity}</Badge>
                  )}
                  {item.status && (
                    <Badge className={statusColor[item.status] || ""}>{item.status.replace("_", " ")}</Badge>
                  )}
                  <span className="text-xs text-gray-400">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function timeAgo(timestamp: Timestamp): string {
  const now = Date.now();
  const ms = now - timestamp.toMillis();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<RecentItem[]>([]);
  const [recentMaintenance, setRecentMaintenance] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadDashboard() {
      const db = getFirebaseDb();

      try {
        // Fetch stats
        const [usersSnap, roomsSnap, assignmentsSnap, maintenanceSnap, incidentsSnap] =
          await Promise.all([
            getDocs(query(collection(db, "users"), where("role", "==", "STUDENT"))),
            getDocs(collection(db, "rooms")),
            getDocs(query(collection(db, "roomAssignments"), where("status", "==", "ACTIVE"))),
            getDocs(query(collection(db, "maintenanceRequests"), where("status", "in", ["REPORTED", "ASSIGNED", "IN_PROGRESS"]))),
            getDocs(query(collection(db, "incidentReports"), orderBy("createdAt", "desc"), limit(10))),
          ]);

        const totalBeds = roomsSnap.docs.reduce((sum, doc) => sum + (doc.data().capacity || 0), 0);
        const urgentMaint = maintenanceSnap.docs.filter((d) => d.data().priority === "URGENT").length;

        const sevenDaysAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentIncidentDocs = incidentsSnap.docs.filter(
          (d) => d.data().createdAt >= sevenDaysAgo
        );
        const pendingReview = recentIncidentDocs.filter(
          (d) => d.data().status === "PENDING_REVIEW"
        ).length;

        setStats({
          totalStudents: usersSnap.size,
          totalRooms: roomsSnap.size,
          occupiedBeds: assignmentsSnap.size,
          totalBeds,
          openMaintenance: maintenanceSnap.size,
          urgentMaintenance: urgentMaint,
          recentIncidents: recentIncidentDocs.length,
          pendingReview,
        });

        // Recent incidents
        setRecentIncidents(
          incidentsSnap.docs.slice(0, 5).map((doc) => {
            const d = doc.data();
            return {
              id: doc.id,
              title: `${d.type.replace("_", " ")} — ${d.location}`,
              subtitle: d.description.slice(0, 80) + (d.description.length > 80 ? "..." : ""),
              time: d.createdAt ? timeAgo(d.createdAt) : "",
              severity: d.severity,
            };
          })
        );

        // Recent maintenance
        const maintDocs = maintenanceSnap.docs.slice(0, 5);
        setRecentMaintenance(
          maintDocs.map((doc) => {
            const d = doc.data();
            return {
              id: doc.id,
              title: `${d.category} — Room ${d.roomId}`,
              subtitle: d.description.slice(0, 80) + (d.description.length > 80 ? "..." : ""),
              time: d.createdAt ? timeAgo(d.createdAt) : "",
              status: d.status,
            };
          })
        );
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [user]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const occupancyPercent = stats.totalBeds > 0 ? Math.round((stats.occupiedBeds / stats.totalBeds) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500">Welcome back, {user?.name}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          subtitle="in housing"
          icon={Users}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Occupancy"
          value={`${occupancyPercent}%`}
          subtitle={`${stats.totalBeds - stats.occupiedBeds} beds available`}
          icon={Building2}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          title="Open Requests"
          value={stats.openMaintenance}
          subtitle={`${stats.urgentMaintenance} urgent`}
          icon={Wrench}
          color="bg-orange-50 text-orange-600"
        />
        <StatCard
          title="Incidents (7d)"
          value={stats.recentIncidents}
          subtitle={`${stats.pendingReview} pending review`}
          icon={AlertTriangle}
          color="bg-red-50 text-red-600"
        />
      </div>

      {/* Lists */}
      {(user?.role === "ADMIN" || user?.role === "STAFF") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentList title="Recent Incidents" items={recentIncidents} type="incident" />
          <RecentList title="Maintenance Queue" items={recentMaintenance} type="maintenance" />
        </div>
      )}

      {user?.role === "MAINTENANCE" && (
        <RecentList title="Your Maintenance Queue" items={recentMaintenance} type="maintenance" />
      )}
    </div>
  );
}
