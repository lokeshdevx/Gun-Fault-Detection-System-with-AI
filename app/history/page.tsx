"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Trash2, FileText, Crosshair, History, ArrowLeft,
  Calendar, User, Target, ChevronRight, Download, Eye,
  Filter, X, CheckCircle2, AlertCircle, Clock, BarChart3,
  TrendingUp, TrendingDown
} from "lucide-react";
import { getAllInspections, deleteInspection } from "@/lib/db/database";
import { generatePDFReport } from "@/lib/services/pdfService";
import { HealthScore } from "@/components/ui/HealthScore";
import { useToast } from "@/components/ui/ToastProvider";
import type { Inspection } from "@/lib/types";

export default function HistoryPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const all = await getAllInspections();
    setInspections(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = inspections.filter((insp) => {
    const reg = insp.registration;
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      reg.gunName.toLowerCase().includes(q) ||
      reg.batchNumber.toLowerCase().includes(q) ||
      reg.barrelSerialNumber.toLowerCase().includes(q) ||
      reg.inspectorName.toLowerCase().includes(q);
    const matchDate =
      !dateFilter ||
      new Date(insp.createdAt).toLocaleDateString().includes(dateFilter);
    return matchSearch && matchDate;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this inspection permanently?")) return;
    await deleteInspection(id);
    toast("Inspection deleted", "info");
    load();
  };

  const handleReport = async (insp: Inspection) => {
    try {
      await generatePDFReport(insp);
      toast("Report downloaded", "success");
    } catch {
      toast("Report failed", "error");
    }
  };

  const getStatusColor = (insp: Inspection) => {
    const completed = insp.images.filter((img) => img.status === "completed");
    const failed = insp.images.filter((img) => img.status === "failed");
    const processing = insp.images.filter((img) => img.status === "processing");
    
    if (failed.length > 0) return { color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Failed" };
    if (processing.length > 0) return { color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", label: "Processing" };
    if (completed.length === insp.images.length && insp.images.length > 0) return { color: "text-green-600", bg: "bg-green-50", border: "border-green-200", label: "Complete" };
    return { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "Pending" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Nav - enhanced */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/80 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 shadow-md">
            <Crosshair className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-800 tracking-wide">BARREL INSPECT</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="text-sm font-semibold text-gray-600">History</span>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-gray-800 to-gray-900 text-white hover:from-gray-700 hover:to-gray-800 transition-all shadow-sm hover:shadow-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          New Inspection
        </Link>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* Header - enhanced */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-200 flex items-center justify-center shadow-sm">
              <History className="w-6 h-6 text-gray-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Inspection History
                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                  {inspections.length}
                </span>
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                View and manage all your barrel inspections
              </p>
            </div>
          </div>
          
          {/* Quick stats */}
          {inspections.length > 0 && (
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span className="font-medium text-gray-700">
                  {inspections.filter(i => i.images.some(img => img.status === "completed")).length}
                </span>
                <span className="text-gray-400">completed</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-medium text-gray-700">
                  {inspections.filter(i => i.images.some(img => img.status === "pending" || img.status === "processing")).length}
                </span>
                <span className="text-gray-400">pending</span>
              </div>
            </div>
          )}
        </div>

        {/* Filters - enhanced */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by gun name, batch, serial, or inspector..."
              className="w-full bg-white border-2 border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-100 transition-all duration-200"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="relative sm:w-48">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-white border-2 border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-100 transition-all duration-200"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-xl border-2 border-gray-200 animate-pulse shadow-sm" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white border-2 border-dashed border-gray-200 rounded-2xl"
          >
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <History className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-lg font-semibold text-gray-600">No inspections found</p>
            <p className="text-sm text-gray-400 mt-1">Complete an inspection to see it here</p>
            <Link
              href="/"
              className="mt-4 px-6 py-2 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl text-sm font-semibold hover:from-gray-700 hover:to-gray-800 transition-all shadow-sm hover:shadow-md"
            >
              Start New Inspection
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map((insp, i) => {
                const reg = insp.registration;
                const completed = insp.images.filter((img) => img.status === "completed");
                const failed = insp.images.filter((img) => img.status === "failed");
                const processing = insp.images.filter((img) => img.status === "processing");
                const defects = completed.reduce((a, img) => a + (img.analysisResult?.issues?.length || 0), 0);
                const status = getStatusColor(insp);

                return (
                  <motion.div
                    key={insp.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.04 }}
                    className="group bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-gray-400 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-200"
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 w-full">
                        {/* Header row */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-base font-bold text-gray-900 truncate">
                            {reg.gunName}
                          </h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${status.bg} ${status.border} ${status.color}`}>
                            {status.label}
                          </span>
                          {defects > 0 && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-600 text-[10px] font-semibold">
                              <AlertCircle className="w-3 h-3" />
                              {defects} defect{defects !== 1 ? "s" : ""}
                            </span>
                          )}
                          {insp.aggregateHealthScore !== undefined && insp.aggregateHealthScore > 0 && (
                            <div className="ml-auto sm:ml-0">
                              <HealthScore score={insp.aggregateHealthScore} size="sm" />
                            </div>
                          )}
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <Target className="w-3 h-3 text-gray-400" />
                            <span className="font-mono font-medium text-gray-700">
                              {reg.caliber === "Other" ? reg.customCaliber : reg.caliber}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <User className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-700">{reg.inspectorName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-700">
                              {new Date(insp.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <FileText className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-700">
                              {insp.images.length} image{insp.images.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>

                        {/* Batch and serial */}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                          <span className="flex items-center gap-1 text-gray-400">
                            <span className="font-semibold text-gray-500">Batch:</span>
                            <span className="font-mono text-gray-700">{reg.batchNumber}</span>
                          </span>
                          <span className="w-px h-3 bg-gray-200" />
                          <span className="flex items-center gap-1 text-gray-400">
                            <span className="font-semibold text-gray-500">Serial:</span>
                            <span className="font-mono text-gray-700">{reg.barrelSerialNumber}</span>
                          </span>
                        </div>

                        {/* Image status indicators */}
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          {completed.length > 0 && (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle2 className="w-3 h-3" />
                              {completed.length} analyzed
                            </span>
                          )}
                          {processing.length > 0 && (
                            <span className="flex items-center gap-1 text-xs text-blue-600">
                              <Clock className="w-3 h-3 animate-spin" />
                              {processing.length} processing
                            </span>
                          )}
                          {failed.length > 0 && (
                            <span className="flex items-center gap-1 text-xs text-red-600">
                              <AlertCircle className="w-3 h-3" />
                              {failed.length} failed
                            </span>
                          )}
                          {insp.images.length === 0 && (
                            <span className="text-xs text-gray-400">No images captured</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                        <button
                          onClick={() => handleReport(insp)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-800 hover:bg-gray-50 transition-all shadow-sm"
                          title="Generate Report"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Report</span>
                        </button>
                        <button
                          onClick={() => handleDelete(insp.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border-2 border-gray-200 text-red-500 hover:border-red-300 hover:bg-red-50 transition-all shadow-sm"
                          title="Delete Inspection"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Progress bar for completion */}
                    {insp.images.length > 0 && (
                      <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${(completed.length / insp.images.length) * 100}%` 
                          }}
                          className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}