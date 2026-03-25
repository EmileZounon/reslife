"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { isAdmin } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Search, Upload } from "lucide-react";
import type { User, RoomAssignment, Room, Building } from "@/types";

interface StudentRow extends User {
  roomNumber?: string;
  buildingName?: string;
  bedSpace?: string;
}

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const db = getFirebaseDb();
      const [usersSnap, assignmentsSnap, roomsSnap, buildingsSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), where("role", "==", "STUDENT"))),
        getDocs(query(collection(db, "roomAssignments"), where("status", "==", "ACTIVE"))),
        getDocs(collection(db, "rooms")),
        getDocs(collection(db, "buildings")),
      ]);

      const assignments = assignmentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RoomAssignment));
      const rooms = new Map(roomsSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as Room]));
      const buildings = new Map(buildingsSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as Building]));

      const result: StudentRow[] = usersSnap.docs.map((d) => {
        const user = { id: d.id, ...d.data() } as User;
        const assignment = assignments.find((a) => a.userId === user.id);
        const room = assignment ? rooms.get(assignment.roomId) : undefined;
        const building = room ? buildings.get(room.buildingId) : undefined;

        return {
          ...user,
          roomNumber: room?.number,
          buildingName: building?.name,
          bedSpace: assignment?.bedSpace,
        };
      });

      setStudents(result);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId?.toLowerCase().includes(search.toLowerCase())
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Students</h2>
        <p className="text-gray-500">{students.length} students in housing</p>
        {isAdmin(user) && (
          <Link href="/assignments/bulk">
            <Button size="sm" className="mt-2">
              <Upload className="w-4 h-4 mr-1" />
              Bulk Upload
            </Button>
          </Link>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by name, email, or student ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((student) => (
          <Link key={student.id} href={`/students/${student.id}`}>
            <Card className="hover:shadow-sm transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 py-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                    {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{student.name}</p>
                  <p className="text-sm text-gray-500 truncate">{student.email}</p>
                </div>
                {student.studentId && (
                  <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                    {student.studentId}
                  </Badge>
                )}
                {student.roomNumber ? (
                  <div className="text-right text-sm">
                    <p className="font-medium">{student.buildingName}</p>
                    <p className="text-gray-500">
                      Room {student.roomNumber}, Bed {student.bedSpace}
                    </p>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-gray-400">
                    Unassigned
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{search ? "No students match your search" : "No students found"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
