"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Building2, Mail, Phone, Hash } from "lucide-react";
import type { User, RoomAssignment, Room, Building } from "@/types";

interface AssignmentHistory {
  assignment: RoomAssignment;
  room: Room;
  building: Building;
}

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params.id as string;
  const [student, setStudent] = useState<User | null>(null);
  const [history, setHistory] = useState<AssignmentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const db = getFirebaseDb();

      const studentDoc = await getDoc(doc(db, "users", studentId));
      if (!studentDoc.exists()) {
        setLoading(false);
        return;
      }
      setStudent({ id: studentDoc.id, ...studentDoc.data() } as User);

      const assignmentsSnap = await getDocs(
        query(collection(db, "roomAssignments"), where("userId", "==", studentId))
      );

      const assignments = assignmentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RoomAssignment));

      const historyItems: AssignmentHistory[] = [];
      for (const assignment of assignments) {
        const roomDoc = await getDoc(doc(db, "rooms", assignment.roomId));
        const room = roomDoc.exists() ? ({ id: roomDoc.id, ...roomDoc.data() } as Room) : null;
        if (!room) continue;

        const buildingDoc = await getDoc(doc(db, "buildings", room.buildingId));
        const building = buildingDoc.exists()
          ? ({ id: buildingDoc.id, ...buildingDoc.data() } as Building)
          : null;
        if (!building) continue;

        historyItems.push({ assignment, room, building });
      }

      // Sort: active first, then by startDate desc
      historyItems.sort((a, b) => {
        if (a.assignment.status === "ACTIVE" && b.assignment.status !== "ACTIVE") return -1;
        if (b.assignment.status === "ACTIVE" && a.assignment.status !== "ACTIVE") return 1;
        return b.assignment.startDate.toMillis() - a.assignment.startDate.toMillis();
      });

      setHistory(historyItems);
      setLoading(false);
    }
    load();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!student) {
    return <p className="text-gray-500">Student not found</p>;
  }

  const initials = student.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const statusColor: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    MOVED: "bg-yellow-100 text-yellow-700",
    GRADUATED: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/students" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Student Profile</h2>
      </div>

      <Card>
        <CardContent className="flex items-center gap-6 py-6">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="text-xl bg-blue-100 text-blue-700">{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h3 className="text-xl font-bold">{student.name}</h3>
            <div className="flex flex-wrap gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {student.email}
              </span>
              {student.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {student.phone}
                </span>
              )}
              {student.studentId && (
                <span className="flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5" />
                  {student.studentId}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Room Assignment History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">No room assignments</p>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.assignment.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    item.assignment.status === "ACTIVE" ? "border-green-200 bg-green-50" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">
                        {item.building.name} — Room {item.room.number}, Bed {item.assignment.bedSpace}
                      </p>
                      <p className="text-sm text-gray-500">
                        {item.assignment.startDate.toDate().toLocaleDateString()}
                        {item.assignment.endDate
                          ? ` — ${item.assignment.endDate.toDate().toLocaleDateString()}`
                          : " — Present"}
                      </p>
                    </div>
                  </div>
                  <Badge className={statusColor[item.assignment.status] || ""}>
                    {item.assignment.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
