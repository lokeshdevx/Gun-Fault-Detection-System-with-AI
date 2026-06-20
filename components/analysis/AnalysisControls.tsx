"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  Scan, FileText, Save, Trash2, Activity, Shield, AlertTriangle,
  TrendingUp, TrendingDown, BarChart3, Clock, CheckCircle2,
  XCircle, Zap, Loader2
} from "lucide-react";
import { useSessionStore } from "@/lib/store/sessionStore";
import { analyzeMultipleImages, aggregateHealthScore, getOverallRecommendation } from "@/lib/services/claudeService";
import { generatePDFReport } from "@/lib/services/pdfService";
import { saveInspection, updateImage } from "@/lib/db/database";
import { HealthScore } from "@/components/ui/HealthScore";
import { useToast } from "@/components/ui/ToastProvider";
import type { Inspection } from "@/lib/types";

// ─── Elapsed-time hook ────────────────────────────────────────────────────────

/**
 * Returns the number of seconds elapsed since the timer was started.
 * Starts counting when `running` is true, resets to 0 when it becomes false.
 */
function useElapsedSeconds(running: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      setElapsed(0);
      intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setElapsed(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  return elapsed;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnalysisControls() {
  const {
    images, sessionId, registration,
    isAnalyzing, analysisProgress,
    setAnalyzing, setAnalysisProgress, clearSession, updateImage: updateStoreImage,
  } = useSessionStore();
  const { toast } = useToast();

  // Track which image number is currently being analyzed (1-based).
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const elapsed = useElapsedSeconds(isAnalyzing);

  const pendingImages = images.filter((i) => i.status === "pending");
  const completedImages = images.filter((i) => i.status === "completed");
  const processingImages = images.filter((i) => i.status === "processing");
  const failedImages = images.filter((i) => i.status === "failed");
  const hasImages = images.length > 0;

  const totalDefects = completedImages.reduce(
    (a, i) => a + (i.analysisResult?.issues?.length || 0), 
    0
  );

  const aggScore =
    completedImages.length > 0
      ? aggregateHealthScore(completedImages.map((i) => i.analysisResult!).filter(Boolean))
      : null;

  const handleAnalyze = async () => {
    if (!pendingImages.length || !sessionId) return;
    setAnalyzing(true);
    setAnalysisProgress(0);
    setCurrentImageIndex(0);

    const toAnalyze = pendingImages;
    for (const img of toAnalyze) {
      updateStoreImage(img.id, { status: "processing" });
    }

    try {
      for (let i = 0; i < toAnalyze.length; i++) {
        const img = toAnalyze[i];
        setCurrentImageIndex(i + 1);
        setAnalysisProgress(Math.round((i / toAnalyze.length) * 100));

        try {
          const result = await (
            await import("@/lib/services/claudeService")
          ).analyzeBarrelImage(img.dataUrl);
          updateStoreImage(img.id, { status: "completed", analysisResult: result });
          await updateImage(img.id, { status: "completed", analysisResult: result });
        } catch (e) {
          updateStoreImage(img.id, { status: "failed" });
          await updateImage(img.id, { status: "failed" });
          toast(`Analysis failed for ${img.position || img.fileName}`, "error");
        }
      }
      setAnalysisProgress(100);
      toast(`${toAnalyze.length} image(s) analyzed`, "success");
    } finally {
      setAnalyzing(false);
      setCurrentImageIndex(0);
    }
  };

  const handleGenerateReport = async () => {
    if (!registration || !sessionId) return;
    try {
      const inspection: Inspection = {
        id: sessionId,
        registration,
        images,
        aggregateHealthScore: aggScore ?? 0,
        overallRecommendation: getOverallRecommendation(aggScore ?? 0),
        completedAt: new Date().toISOString(),
        createdAt: registration.createdAt,
      };
      await generatePDFReport(inspection);
      toast("Report downloaded", "success");
    } catch (e) {
      toast("Report generation failed", "error");
    }
  };

  const handleSave = async () => {
    if (!registration || !sessionId) return;
    try {
      const inspection: Inspection = {
        id: sessionId,
        registration,
        images,
        aggregateHealthScore: aggScore ?? 0,
        overallRecommendation: getOverallRecommendation(aggScore ?? 0),
        completedAt: new Date().toISOString(),
        createdAt: registration.createdAt,
      };
      await saveInspection(inspection);
      toast("Inspection saved to history", "success");
    } catch (e) {
      toast("Save failed", "error");
    }
  };

  const handleClear = () => {
    if (confirm("Clear all images from this session?")) {
      clearSession();
      toast("Session cleared", "info");
    }
  };

  if (!hasImages) return null;

  const hasCompleted = completedImages.length > 0;
  const hasPending = pendingImages.length > 0;
  const hasDefects = totalDefects > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        {/* Stats - improved with better visual design */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { 
              label: "Total", 
              value: images.length, 
              icon: Activity, 
              color: "#4a6b8a",
              bg: "bg-blue-50",
              border: "border-blue-200"
            },
            { 
              label: "Pending", 
              value: pendingImages.length, 
              icon: Clock, 
              color: "#d97706",
              bg: "bg-amber-50",
              border: "border-amber-200"
            },
            { 
              label: "Analyzed", 
              value: completedImages.length, 
              icon: CheckCircle2, 
              color: "#059669",
              bg: "bg-green-50",
              border: "border-green-200"
            },
            {
              label: "Defects",
              value: totalDefects,
              icon: AlertTriangle,
              color: totalDefects > 0 ? "#dc2626" : "#6b7280",
              bg: totalDefects > 0 ? "bg-red-50" : "bg-gray-50",
              border: totalDefects > 0 ? "border-red-200" : "border-gray-200"
            },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <motion.div
              key={label}
              whileHover={{ scale: 1.02 }}
              className={`${bg} ${border} border rounded-xl p-3 shadow-sm transition-all`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3 h-3" style={{ color }} />
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                  {label}
                </span>
              </div>
              <span className="text-2xl font-bold" style={{ color }}>
                {value}
              </span>
              {label === "Defects" && value > 0 && (
                <span className="ml-1.5 text-xs text-red-400 font-medium">
                  ⚠️
                </span>
              )}
            </motion.div>
          ))}
        </div>

        {/* Aggregate score - enhanced */}
        {aggScore !== null && (
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border-2 border-gray-200 shadow-sm flex flex-col items-center gap-2"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                Aggregate Health Score
              </p>
            </div>
            <HealthScore score={aggScore} size="lg" />
            {aggScore >= 70 ? (
              <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                <TrendingUp className="w-3 h-3" />
                Good overall condition
              </div>
            ) : aggScore >= 50 ? (
              <div className="flex items-center gap-1.5 text-amber-600 text-xs font-medium">
                <AlertTriangle className="w-3 h-3" />
                Moderate condition - review recommended
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium">
                <TrendingDown className="w-3 h-3" />
                Poor condition - immediate action required
              </div>
            )}
          </motion.div>
        )}

        {/* Analysis progress — enhanced */}
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-4 border-2 border-blue-300 shadow-sm"
          >
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span className="text-xs font-bold text-blue-700">
                  Analyzing with Claude AI
                </span>
              </div>
              <span className="text-xs font-semibold text-blue-600">
                {analysisProgress}%
              </span>
            </div>

            {/* Sub-label: which image + elapsed time */}
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs text-gray-500 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-500" />
                Image {currentImageIndex} of {pendingImages.length + completedImages.length}
                {''} — deep inspection in progress…
              </span>
              <span className="text-xs font-mono font-medium text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                {formatElapsed(elapsed)}
              </span>
            </div>

            {/* Progress bar - enhanced */}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${analysisProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Status messages based on progress */}
            <div className="mt-2.5">
              {analysisProgress < 30 && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="animate-pulse">●</span>
                  Initializing analysis pipeline...
                </p>
              )}
              {analysisProgress >= 30 && analysisProgress < 60 && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="animate-pulse text-blue-500">●</span>
                  Scanning for defects and anomalies...
                </p>
              )}
              {analysisProgress >= 60 && analysisProgress < 90 && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="animate-pulse text-amber-500">●</span>
                  Evaluating severity and generating recommendations...
                </p>
              )}
              {analysisProgress >= 90 && (
                <p className="text-xs text-green-600 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Finalizing results...
                </p>
              )}
            </div>

            {/* Patience note — appears after 15 seconds */}
            {elapsed >= 15 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 text-xs text-amber-600 text-center font-medium bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5"
              >
                ⏱️ Detailed barrel inspection can take up to 5 minutes — please wait
              </motion.p>
            )}
          </motion.div>
        )}

        {/* Buttons - enhanced with better visual hierarchy */}
        <div className="space-y-2.5">
          {/* Primary action - Analyze */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleAnalyze}
            disabled={isAnalyzing || pendingImages.length === 0}
            className={`relative w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 overflow-hidden ${
              isAnalyzing || pendingImages.length === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-gray-800 to-gray-900 text-white hover:from-gray-700 hover:to-gray-800 hover:shadow-lg hover:shadow-gray-200/50"
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing image {currentImageIndex}…</span>
              </>
            ) : (
              <>
                <Scan className="w-4 h-4" />
                <span>Analyze {pendingImages.length} Image{pendingImages.length !== 1 ? "s" : ""}</span>
                {pendingImages.length > 0 && (
                  <span className="absolute top-0 right-0 mt-1 mr-2 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
                    {pendingImages.length}
                  </span>
                )}
              </>
            )}
          </motion.button>

          {/* Secondary actions - grid layout */}
          <div className="grid grid-cols-2 gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerateReport}
              disabled={completedImages.length === 0}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-all"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">PDF Report</span>
              <span className="sm:hidden">Report</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-500 hover:bg-gray-50 transition-all"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save History</span>
              <span className="sm:hidden">Save</span>
            </motion.button>
          </div>

          {/* Clear session - subtle */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClear}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Session
          </motion.button>
        </div>

        {/* Quick stats footer */}
        {hasCompleted && (
          <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400 border-t border-gray-100 pt-3">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              {completedImages.length} analyzed
            </span>
            {processingImages.length > 0 && (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                {processingImages.length} processing
              </span>
            )}
            {failedImages.length > 0 && (
              <span className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-red-500" />
                {failedImages.length} failed
              </span>
            )}
            {hasDefects && (
              <span className="flex items-center gap-1 text-red-400 font-medium">
                <AlertTriangle className="w-3 h-3" />
                {totalDefects} defects found
              </span>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}