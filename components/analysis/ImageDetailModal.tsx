"use client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, ZoomIn, ZoomOut, AlertTriangle, CheckCircle, 
  Download, Maximize2, Minimize2, Image as ImageIcon,
  Calendar, Clock, ChevronDown, ChevronUp
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { CapturedImage, BarrelIssue } from "@/lib/types";
import { HealthScore } from "@/components/ui/HealthScore";
import { SeverityBadge } from "@/components/ui/SeverityBadge";

interface Props {
  image: CapturedImage | null;
  onClose: () => void;
}

/**
 * The only 9 defect names that are allowed to be displayed.
 * Any issue returned by the API whose issueName is NOT in this list
 * will be silently dropped before rendering.
 */
const ALLOWED_DEFECTS: string[] = [
  "Bulge",
  "Flecking Off",
  "Ringed Barrel",
  "Pitting",
  "Cuts",
  "Scratch / Scoring",
  "Corrosion",
  "Dent",
  "Carbon Deposit",
];

/**
 * The API returns confidence as a float 0–1 (e.g. 0.85).
 * Multiply by 100 and round to display as a percentage integer.
 */
function formatConfidence(confidence: number | undefined): string {
  if (confidence === undefined || confidence === null) return "0%";
  const pct = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
  return `${pct}%`;
}

/**
 * Filters the raw issues array from the API, keeping only issues whose
 * issueName exactly matches one of the 9 allowed defect types.
 * Any unknown, misspelled, or unlisted defect name is dropped silently.
 */
function filterAllowedIssues(issues: BarrelIssue[]): BarrelIssue[] {
  return issues.filter((issue) => {
    const name = (issue.issueName ?? "").trim();
    return ALLOWED_DEFECTS.includes(name);
  });
}

export function ImageDetailModal({ image, onClose }: Props) {
  // ─── ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS ──────────────
  
  const [zoom, setZoom] = useState(1);
  const [imageError, setImageError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedIssues, setExpandedIssues] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((z) => Math.min(z + 0.25, 3));
      }
      if (e.key === '-') {
        e.preventDefault();
        setZoom((z) => Math.max(z - 0.25, 0.5));
      }
      if (e.key === '0') {
        e.preventDefault();
        setZoom(1);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isFullscreen]);

  // ─── EARLY RETURN AFTER ALL HOOKS ──────────────────────────────────────────
  
  // Return null if no image - this is safe because all hooks are called above
  if (!image) return null;

  // ─── COMPUTED VALUES ──────────────────────────────────────────────────────
  
  const ar = image.analysisResult;
  const rawIssues = ar?.issues ?? [];
  const issues = filterAllowedIssues(rawIssues);
  const criticalIssues = issues.filter((i) => i.severity === "High").length;

  // ─── HANDLERS ──────────────────────────────────────────────────────────────
  
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);
  const handleToggleFullscreen = () => setIsFullscreen(!isFullscreen);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.dataUrl;
    link.download = image.fileName || 'barrel-image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleIssue = (issueName: string) => {
    setExpandedIssues(expandedIssues === issueName ? null : issueName);
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={`bg-white border border-gray-200 rounded-2xl w-full max-w-6xl shadow-2xl transition-all duration-300 ${
            isFullscreen ? 'fixed inset-4 max-w-none rounded-3xl' : 'max-h-[90vh] overflow-y-auto'
          }`}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-20 flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-200">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200">
                <ImageIcon className="w-4 h-4 text-gray-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900 truncate">
                  {image.position || image.fileName || "Untitled Image"}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {image.capturedAt
                      ? new Date(image.capturedAt).toLocaleDateString()
                      : "Unknown date"}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {image.capturedAt
                      ? new Date(image.capturedAt).toLocaleTimeString()
                      : "Unknown time"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {ar && ar.barrelHealthScore !== undefined && (
                <div className="mr-1">
                  <HealthScore score={ar.barrelHealthScore} size="sm" />
                </div>
              )}
              <button
                onClick={handleDownload}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                title="Download image"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleToggleFullscreen}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-5 p-5 ${isFullscreen ? 'h-[calc(100vh-80px)]' : ''}`}>
            {/* Left — Image */}
            <div className={isFullscreen ? 'h-full' : ''}>
              <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden border border-gray-200 h-full">
                <div className="overflow-auto" style={{ maxHeight: isFullscreen ? 'calc(100vh - 180px)' : '450px' }}>
                  <div className="relative inline-block w-full min-h-[250px]">
                    {!imageError ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image.dataUrl}
                        alt="Barrel inspection"
                        className="w-full object-contain"
                        style={{
                          transform: `scale(${zoom})`,
                          transformOrigin: "center center",
                          transition: "transform 0.2s ease",
                        }}
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <AlertTriangle className="w-12 h-12 mb-3 text-gray-300" />
                        <p className="text-sm font-medium text-gray-500">Failed to load image</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Zoom controls */}
                <div className="absolute bottom-3 right-3 flex gap-1.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl shadow-lg border border-gray-200">
                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                    aria-label="Zoom in (+)"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                    aria-label="Zoom out (-)"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <div className="w-px bg-gray-200" />
                  <button
                    onClick={handleResetZoom}
                    className="px-2 py-1 rounded-lg hover:bg-gray-100 text-gray-700 text-xs font-medium transition-colors"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                </div>

                {/* Zoom level indicator */}
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs text-white/80 font-mono">
                  {Math.round(zoom * 100)}%
                </div>
              </div>

              {/* Quality Issues */}
              {image.qualityIssues && image.qualityIssues.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 bg-amber-50 border-2 border-amber-200 rounded-xl p-3.5"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <p className="text-xs font-semibold text-amber-800">Quality Issues Detected</p>
                  </div>
                  <ul className="space-y-0.5">
                    {image.qualityIssues.map((q, i) => (
                      <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                        <span className="text-amber-400">•</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </div>

            {/* Right — Analysis */}
            <div className={`space-y-3.5 ${isFullscreen ? 'h-full overflow-y-auto' : ''}`}>
              {ar ? (
                <>
                  {/* Overall Condition */}
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border-2 border-gray-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                          Overall Condition
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {ar.overallCondition || "No condition assessment available"}
                        </p>
                      </div>
                      {criticalIssues > 0 && (
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border-2 border-red-200 text-red-700 text-xs font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {criticalIssues} Critical
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Issues list */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                    {issues.length === 0 ? (
                      <motion.div
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-3 text-green-700 bg-green-50 border-2 border-green-200 rounded-xl p-4"
                      >
                        <div className="p-2 rounded-full bg-green-100">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">No defects detected</p>
                          <p className="text-xs text-green-600">The barrel appears to be in good condition</p>
                        </div>
                      </motion.div>
                    ) : (
                      issues.map((issue, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-all"
                        >
                          <button
                            onClick={() => toggleIssue(issue.issueName)}
                            className="w-full text-left p-3.5 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-sm font-semibold text-gray-900 truncate">
                                  {issue.issueName}
                                </span>
                                <SeverityBadge severity={issue.severity || "low"} />
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-gray-400 font-medium">
                                  {formatConfidence(issue.confidence)}
                                </span>
                                {expandedIssues === issue.issueName ? (
                                  <ChevronUp className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                            </div>
                          </button>

                          <AnimatePresence>
                            {expandedIssues === issue.issueName && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-3.5 pb-3.5"
                              >
                                <div className="pt-3 border-t border-gray-100 space-y-2.5">
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-gray-50 rounded-lg p-2">
                                      <span className="text-gray-500">Confidence</span>
                                      <p className="font-semibold text-gray-900">
                                        {formatConfidence(issue.confidence)}
                                      </p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2">
                                      <span className="text-gray-500">Risk Level</span>
                                      <p className="font-semibold text-orange-700">
                                        {issue.riskLevel || "Unknown"}
                                      </p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2">
                                      <span className="text-gray-500">Affected Area</span>
                                      <p className="font-semibold text-gray-900">
                                        {issue.affectedArea || "Unknown"}
                                      </p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2">
                                      <span className="text-gray-500">Location</span>
                                      <p className="font-semibold text-gray-900 capitalize">
                                        {issue.location?.replace(/-/g, " ") || "Center"}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {issue.description && (
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                      {issue.description}
                                    </p>
                                  )}
                                  
                                  {issue.solution && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                                      <p className="text-xs text-blue-800 font-semibold mb-0.5">💡 Solution</p>
                                      <p className="text-xs text-blue-700">{issue.solution}</p>
                                    </div>
                                  )}
                                  
                                  {issue.maintenanceAction && (
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5">
                                      <p className="text-xs text-purple-800 font-semibold mb-0.5">🔧 Maintenance</p>
                                      <p className="text-xs text-purple-700">{issue.maintenanceAction}</p>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"
                >
                  <div className="p-4 rounded-full bg-gray-100">
                    <AlertTriangle className="w-10 h-10 text-gray-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600 mt-3">Not Yet Analyzed</p>
                  <p className="text-xs text-gray-400 mt-1">Click "Analyze" to process this image</p>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}