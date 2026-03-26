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
import { ArrowLeft, Download, Upload, CheckCircle, XCircle, SkipForward } from "lucide-react";
import { CsvUpload } from "@/components/csv-upload";
import { parseCsv } from "@/lib/csv-parser";
import { bulkAssignmentRowSchema } from "@/lib/validations";

interface ParsedRow {
  studentEmail: string;
  buildingName: string;
  roomNumber: string;
  valid: boolean;
  error?: string;
}

interface UploadResult {
  row: number;
  status: "success" | "skipped" | "error";
  message: string;
}

interface UploadSummary {
  total: number;
  success: number;
  skipped: number;
  errors: number;
}

type PageState = "upload" | "preview" | "results";

export default function BulkUploadPage() {
  const { user } = useAuth();
  const [state, setState] = useState<PageState>("upload");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [summary, setSummary] = useState<UploadSummary | null>(null);
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
          studentEmail: row.studentEmail || "",
          buildingName: row.buildingName || "",
          roomNumber: row.roomNumber || "",
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
      setSummary(data.summary || null);
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
          <p className="text-gray-500">Upload a CSV to assign multiple students to rooms at once</p>
        </div>
      </div>

      {/* Download template */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">CSV Template</p>
            <p className="text-sm text-gray-500">
              Columns: student_email, building_name, room_number
            </p>
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
                    <TableHead>Student Email</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, i) => (
                    <TableRow key={i} className={row.valid ? "" : "bg-red-50"}>
                      <TableCell>{row.studentEmail}</TableCell>
                      <TableCell>{row.buildingName}</TableCell>
                      <TableCell>{row.roomNumber}</TableCell>
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
          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{summary.total}</p>
                  <p className="text-sm text-gray-500">Total Rows</p>
                </CardContent>
              </Card>
              <Card className="border-green-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{summary.success}</p>
                  <p className="text-sm text-gray-500">Assigned</p>
                </CardContent>
              </Card>
              <Card className="border-yellow-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{summary.skipped}</p>
                  <p className="text-sm text-gray-500">Skipped</p>
                </CardContent>
              </Card>
              <Card className="border-red-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{summary.errors}</p>
                  <p className="text-sm text-gray-500">Errors</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Results</CardTitle>
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
                    <TableRow
                      key={i}
                      className={
                        r.status === "error"
                          ? "bg-red-50"
                          : r.status === "skipped"
                            ? "bg-yellow-50"
                            : ""
                      }
                    >
                      <TableCell>{r.row}</TableCell>
                      <TableCell>
                        {r.status === "success" && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Assigned
                          </Badge>
                        )}
                        {r.status === "skipped" && (
                          <Badge className="bg-yellow-100 text-yellow-700">
                            <SkipForward className="w-3 h-3 mr-1" />
                            Skipped
                          </Badge>
                        )}
                        {r.status === "error" && (
                          <Badge className="bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3 mr-1" />
                            Error
                          </Badge>
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
            <Button variant="outline" onClick={() => { setState("upload"); setParsedRows([]); setResults([]); setSummary(null); }}>
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
