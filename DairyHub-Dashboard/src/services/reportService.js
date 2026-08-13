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
 * Resolve a start/end Date range from a named period and a reference date.
 */
export const resolveRange = (period, referenceDate = new Date()) => {
  const ref = new Date(referenceDate);

  switch (period) {
    case "weekly": {
      const start = new Date(ref);
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "monthly": {
      const start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case "daily":
    default: {
      const start = new Date(ref);
      start.setHours(0, 0, 0, 0);
      const end = new Date(ref);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  }
};

export const formatReportRange = (period, referenceDate = new Date()) => {
  const { start, end } = resolveRange(period, referenceDate);

  if (period === "daily") {
    return start.toLocaleDateString();
  }

  if (period === "weekly") {
    return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
  }

  return start.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

/**
 * Fetch the records for a report, optionally filtered to one collector.
 * collectorId is the business id (COL001), not the Firestore document uid.
 */
export const getReportData = async (
  period = "daily",
  collectorId = null,
  referenceDate = new Date()
) => {
  const { start, end } = resolveRange(period, referenceDate);
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
