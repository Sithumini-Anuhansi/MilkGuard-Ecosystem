import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";
import { getCollectionsByDateRange, toDateString } from "./milkCollectionService";

const reportsRef = collection(db, "reports");

const REPORT_COLUMNS = [
  "Date",
  "Collector",
  "Quantity (L)",
  "pH",
  "Gas (ppm)",
  "Temp (°C)",
  "Status",
];

const toRows = (records) =>
  records.map((r) => [
    toDateString(r),
    r.collectorName,
    r.quantity,
    r.pH,
    r.gas,
    r.temperature,
    r.status,
  ]);

/**
 * Resolve a start/end Date range from a named period, or pass explicit dates through.
 */
export const resolveRange = (period) => {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case "weekly":
      start.setDate(end.getDate() - 7);
      break;
    case "monthly":
      start.setMonth(end.getMonth() - 1);
      break;
    case "daily":
    default:
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start, end };
};

/**
 * Fetch the records for a report, optionally filtered to one collector.
 */
export const getReportData = async (period = "daily", collectorId = null) => {
  const { start, end } = resolveRange(period);
  const records = await getCollectionsByDateRange(start, end);

  if (!collectorId) return records;

  return records.filter((r) => r.collectorId === collectorId);
};

/**
 * Record that a report was generated — metadata only (no fileUrl, since these
 * exports are client-side downloads rather than uploaded to Cloud Storage).
 */
const logReportGeneration = async (reportName, generatedByRole) => {
  try {
    await addDoc(reportsRef, {
      reportName,
      fileUrl: null,
      generatedBy: generatedByRole || "OWNER",
      generatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to log report generation:", err);
  }
};

/**
 * Export records to a downloadable PDF.
 */
export const exportToPDF = (records, title = "MilkGuard Report", generatedByRole) => {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(title, 14, 16);

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [REPORT_COLUMNS],
    body: toRows(records),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 175] },
  });

  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
  logReportGeneration(title, generatedByRole);
};

/**
 * Export records to a downloadable Excel workbook.
 */
export const exportToExcel = (records, title = "MilkGuard_Report", generatedByRole) => {
  const worksheet = XLSX.utils.json_to_sheet(
    records.map((r) => ({
      Date: toDateString(r),
      Collector: r.collectorName,
      "Quantity (L)": r.quantity,
      pH: r.pH,
      "Gas (ppm)": r.gas,
      "Temp (°C)": r.temperature,
      Status: r.status,
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

  XLSX.writeFile(workbook, `${title.replace(/\s+/g, "_")}.xlsx`);
  logReportGeneration(title, generatedByRole);
};

/**
 * Export records to a downloadable CSV file.
 */
export const exportToCSV = (records, title = "MilkGuard_Report", generatedByRole) => {
  const header = REPORT_COLUMNS.join(",");
  const rows = toRows(records).map((row) => row.join(","));
  const csvContent = [header, ...rows].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.replace(/\s+/g, "_")}.csv`;
  link.click();

  URL.revokeObjectURL(url);
  logReportGeneration(title, generatedByRole);
};
