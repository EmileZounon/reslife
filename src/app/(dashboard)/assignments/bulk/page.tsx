"use client";

import { useState } from "react";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, Upload, CheckCircle, XCircle } from "lucide-react";
import { CsvUpload } from "@/components/csv-upload";
import { parseCsv } from "@/lib/csv-parser";
import { bulkAssignmentRowSchema } from "@/lib/validations";

interface ParsedRow {
  name: string;
  email: string;
  studentId: string;
  building: string;
  roomNumber: string;
  bed: string;
  valid: boolean;
  error?: string;
}

interface UploadResult {
  row: number;
  status: "success" | "error";
  message: string;
}

type PageState = "upload" | "preview" | "results";

export default function BulkUploadPage() {
  const { user } = useAuth();
  const [state, setState] = useState<PageState>("upload");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Role guard: only admin/staff can access this page
  if (user && user.role !== "ADMIN" && user.role !== "STAFF") {
    return <p className="text-center py-12 text-gray-500">You do not have permission to access this page.</p>;
  }

  function handleFileContent(content: string) {
    if (!content) {
      setParsedRows([]);
      setParseErrors([]);
      setState("upload");
      return;
    }

    const { rows, errors } = parseCsv(content);

    if (errors.length > 0 && rows.length === 0) {
      setParseErrors(errors.map((e) => `Row ${e.row}: ${e.message}`));
      setState("upload");
      return;
    }

    const validated: ParsedRow[] = rows.map((row) => {
      const result = bulkAssignmentRowSchema.safeParse(row);
      if (!result.success) {
        return {
          ...row,
          name: row.name || "",
          email: row.email || "",
          studentId: row.studentId || "",
          building: row.building || "",
          roomNumber: row.roomNumber || "",
          bed: row.bed || "",
          valid: false,
          error: result.error.issues.map((e) => e.message).join("; "),
        };
      }
      return { ...result.data, valid: true };
    });

    setParsedRows(validated);
    setParseErrors(errors.map((e) => `Row ${e.row}: ${e.message}`));
    setState("preview");
  }

  async function handleSubmit() {
    const validRows = parsedRows.filter((r) => r.valid);
    if (validRows.length === 0) return;

    setSubmitting(true);
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const res = await fetch("/api/assignments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ rows: validRows }),
      });

      const data = await res.json();
      setResults(data.results || []);
      setState("results");
    } catch {
      alert("Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/students" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bulk Room Assignment</h2>
          <p className="text-gray-500">Upload a CSV to assign multiple students at once</p>
        </div>
      </div>

      {/* Download template */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">CSV Template</p>
            <p className="text-sm text-gray-500">Download and fill in the template, then upload it below</p>
          </div>
          <a href="/templates/room-assignments-template.csv" download>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Download Template
            </Button>
          </a>
        </CardContent>
      </Card>

      {state === "upload" && (
        <>
          <CsvUpload onFileContent={handleFileContent} />
          {parseErrors.length > 0 && (
            <Card className="border-red-200">
              <CardContent className="p-4">
                <p className="font-medium text-red-600 mb-2">Parse Errors</p>
                {parseErrors.map((e, i) => (
                  <p key={i} className="text-sm text-red-600">{e}</p>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {state === "preview" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Preview ({parsedRows.length} rows)</span>
                <div className="flex gap-2">
                  <Badge className="bg-green-100 text-green-700">
                    {parsedRows.filter((r) => r.valid).length} valid
                  </Badge>
                  {parsedRows.some((r) => !r.valid) && (
                    <Badge className="bg-red-100 text-red-700">
                      {parsedRows.filter((r) => !r.valid).length} invalid
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Bed</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, i) => (
                    <TableRow key={i} className={row.valid ? "" : "bg-red-50"}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.studentId}</TableCell>
                      <TableCell>{row.building}</TableCell>
                      <TableCell>{row.roomNumber}</TableCell>
                      <TableCell>{row.bed}</TableCell>
                      <TableCell>
                        {row.valid ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <span className="text-xs text-red-600">{row.error}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setState("upload"); setParsedRows([]); }}>
              Start Over
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || parsedRows.filter((r) => r.valid).length === 0}
            >
              <Upload className="w-4 h-4 mr-1" />
              {submitting
                ? "Uploading..."
                : `Assign ${parsedRows.filter((r) => r.valid).length} Students`}
            </Button>
          </div>
        </>
      )}

      {state === "results" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Upload Complete — {results.filter((r) => r.status === "success").length} succeeded,{" "}
                {results.filter((r) => r.status === "error").length} failed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, i) => (
                    <TableRow key={i} className={r.status === "error" ? "bg-red-50" : ""}>
                      <TableCell>{r.row}</TableCell>
                      <TableCell>
                        {r.status === "success" ? (
                          <Badge className="bg-green-100 text-green-700">Success</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">Error</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{r.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setState("upload"); setParsedRows([]); setResults([]); }}>
              Upload Another
            </Button>
            <Link href="/occupancy">
              <Button>View Occupancy</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
