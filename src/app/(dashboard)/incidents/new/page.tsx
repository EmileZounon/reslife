"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, addDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, X } from "lucide-react";
import type { User } from "@/types";

export default function NewIncidentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<User[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [type, setType] = useState("RULE_VIOLATION");
  const [severity, setSeverity] = useState("MEDIUM");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStudents() {
      const db = getFirebaseDb();
      const snap = await getDocs(query(collection(db, "users"), where("role", "==", "STUDENT")));
      setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as User)));
    }
    loadStudents();
  }, []);

  const filteredStudents = students.filter(
    (s) =>
      !selectedStudents.find((sel) => sel.id === s.id) &&
      (s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  const handleSummarize = async () => {
    if (!description.trim()) return;
    setSummarizing(true);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, type, severity }),
      });
      const data = await res.json();
      if (data.summary) setAiSummary(data.summary);
    } catch {
      setError("AI summarization failed");
    } finally {
      setSummarizing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || selectedStudents.length === 0 || !location || !description) {
      setError("Please fill in all required fields and select at least one student");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const db = getFirebaseDb();
      await addDoc(collection(db, "incidentReports"), {
        reporterId: user.id,
        studentIds: selectedStudents.map((s) => s.id),
        type,
        severity,
        date,
        time,
        location,
        description,
        aiSummary: aiSummary || null,
        attachmentUrls: [],
        status: "PENDING_REVIEW",
        createdAt: Timestamp.now(),
      });
      router.push("/incidents");
    } catch (err) {
      setError("Failed to create incident report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/incidents" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">New Incident Report</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Students Involved */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Students Involved</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {selectedStudents.map((s) => (
                <Badge key={s.id} className="flex items-center gap-1 bg-blue-100 text-blue-700">
                  {s.name}
                  <button type="button" onClick={() => setSelectedStudents((prev) => prev.filter((p) => p.id !== s.id))}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Search students..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
            {studentSearch && filteredStudents.length > 0 && (
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {filteredStudents.slice(0, 5).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudents((prev) => [...prev, s]);
                      setStudentSearch("");
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                  >
                    {s.name} <span className="text-gray-400">{s.email}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Incident Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incident Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="RULE_VIOLATION">Rule Violation</option>
                  <option value="HEALTH">Health Concern</option>
                  <option value="BEHAVIOR">Behavior Issue</option>
                  <option value="GENERAL">General</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., North Hall, Room 101"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened..."
                rows={5}
                required
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleSummarize}
              disabled={summarizing || !description.trim()}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {summarizing ? "Summarizing..." : "Summarize with AI"}
            </Button>

            {aiSummary && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm font-medium text-purple-700 mb-2">AI Summary</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiSummary}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/incidents">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </form>
    </div>
  );
}
