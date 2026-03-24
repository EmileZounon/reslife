"use client";

import { useEffect, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, ToggleLeft, ToggleRight } from "lucide-react";

export default function AssignmentSettingsPage() {
  const { user } = useAuth();
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // All hooks must be called before any conditional returns (React Rules of Hooks)
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/assignments/selection");
      const data = await res.json();
      setSelectionOpen(data.open || false);
      setLoading(false);
    }
    load();
  }, []);

  async function handleToggle() {
    setToggling(true);
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const res = await fetch("/api/assignments/selection", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ open: !selectionOpen }),
      });
      const data = await res.json();
      setSelectionOpen(data.open);
    } catch {
      alert("Failed to update");
    } finally {
      setToggling(false);
    }
  }

  // Role guard: only admin can access settings (placed AFTER hooks)
  if (user && user.role !== "ADMIN") {
    return <p className="text-center py-12 text-gray-500">Admin access required.</p>;
  }

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
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Room Assignment Settings
        </h2>
        <p className="text-gray-500">Control the student room selection process</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student Room Selection Window</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                When open, students can log in and select their own rooms from available options.
              </p>
              <div className="mt-2">
                Status:{" "}
                {selectionOpen ? (
                  <Badge className="bg-green-100 text-green-700">Open</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-700">Closed</Badge>
                )}
              </div>
            </div>
            <Button
              onClick={handleToggle}
              disabled={toggling}
              variant={selectionOpen ? "destructive" : "default"}
              size="lg"
            >
              {selectionOpen ? (
                <>
                  <ToggleRight className="w-5 h-5 mr-1" />
                  {toggling ? "Closing..." : "Close Selection"}
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5 mr-1" />
                  {toggling ? "Opening..." : "Open Selection"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
