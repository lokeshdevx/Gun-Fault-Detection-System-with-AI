"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trash2, Eye, Image as ImageIcon, Calendar,
} from "lucide-react";
import { useSessionStore } from "@/lib/store/sessionStore";
import { HealthScore } from "@/components/ui/HealthScore";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { ImageDetailModal } from "./ImageDetailModal";
import type { CapturedImage } from "@/lib/types";
import { formatFileSize } from "@/lib/utils/imageUtils";

const STATUS_ICONS = {
  pending: <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />,
  processing: <div className="w-2 h-2 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />,
  completed: <span className="w-2 h-2 rounded-full bg-green-500" />,
  failed: <span className="w-2 h-2 rounded-full bg-red-500" />,
};

const STATUS_LABELS = {
  pending: "Pending",
  processing: "Analyzing",
  completed: "Complete",
  failed: "Failed",
};

const STATUS_BADGE_CLASSES = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  processing: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  failed: "bg-red-100 text-red-700 border-red-200",
};

export function ImageGrid() {
  const { images, removeImage } = useSessionStore();
  const [selected, setSelected] = useState<CapturedImage | null>(null);

  const stats = {
    total: images.length,
    pending: images.filter(i => i.status === "pending").length,
    processing: images.filter(i => i.status === "processing").length,
    completed: images.filter(i => i.status === "completed").length,
    failed: images.filter(i => i.status === "failed").length,
  };

  // Sort images by capture date (newest first)
  const sortedImages = [...images].sort(
    (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
  );

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Stats bar - compact */}
      {images.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-1 py-1.5 border-b border-gray-100">
          <span className="text-xs font-medium text-gray-500">
            {images.length} image{images.length !== 1 ? "s" : ""}
          </span>
          {stats.pending > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {stats.pending} pending
            </span>
          )}
          {stats.processing > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              <div className="w-1.5 h-1.5 border border-blue-500 border-t-transparent rounded-full animate-spin" />
              {stats.processing} processing
            </span>
          )}
          {stats.completed > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {stats.completed} analyzed
            </span>
          )}
          {stats.failed > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {stats.failed} failed
            </span>
          )}
        </div>
      )}

      {/* Empty state */}
      {images.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 border-3 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 min-h-[300px]"
        >
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-gray-300" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-gray-600">No images yet</p>
            <p className="text-sm text-gray-400 mt-1">Capture or upload barrel images to begin</p>
          </div>
          <div className="flex gap-2 text-xs text-gray-400">
            <span className="px-3 py-1 bg-white border border-gray-200 rounded-full">📷 Capture</span>
            <span className="px-3 py-1 bg-white border border-gray-200 rounded-full">📤 Upload</span>
          </div>
        </motion.div>
      )}

      {/* Grid - scrollable, takes full height */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent min-h-0">
        <AnimatePresence>
          {sortedImages.map((img, i) => (
            <motion.div
              key={img.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: i * 0.03 }}
              className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-400 hover:shadow-md transition-all duration-200 cursor-pointer"
              onClick={() => setSelected(img)}
            >
              <div className="flex gap-3 p-3">
                {/* Thumbnail */}
                <div className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.dataUrl}
                    alt={img.fileName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {img.status === "processing" && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-5 h-5 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {/* Status dot on thumbnail */}
                  <div className="absolute top-1 right-1">
                    {STATUS_ICONS[img.status]}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {img.position || img.fileName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(img.capturedAt).toLocaleTimeString()}
                        </span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{formatFileSize(img.fileSize)}</span>
                      </div>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_BADGE_CLASSES[img.status]} flex-shrink-0`}>
                      {STATUS_LABELS[img.status]}
                    </div>
                  </div>

                  {img.analysisResult ? (
                    <div className="mt-2 flex items-center gap-2">
                      <HealthScore score={img.analysisResult.barrelHealthScore} size="sm" />
                      <div className="flex-1 flex flex-wrap gap-1">
                        {img.analysisResult.issues.slice(0, 2).map((issue, j) => (
                          <SeverityBadge key={j} severity={issue.severity} className="text-[10px]" />
                        ))}
                        {img.analysisResult.issues.length > 2 && (
                          <span className="text-xs text-gray-400 font-medium">
                            +{img.analysisResult.issues.length - 2} more
                          </span>
                        )}
                        {img.analysisResult.issues.length === 0 && (
                          <span className="text-xs text-green-600 font-medium">✅ No defects</span>
                        )}
                      </div>
                    </div>
                  ) : img.status === "failed" ? (
                    <div className="mt-2">
                      <p className="text-xs text-red-600 flex items-center gap-1.5">
                        {img.qualityIssues?.[0] || "Analysis failed"}
                      </p>
                    </div>
                  ) : img.status === "pending" ? (
                    <div className="mt-2">
                      <p className="text-xs text-amber-600 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Waiting for analysis...
                      </p>
                    </div>
                  ) : img.status === "processing" ? (
                    <div className="mt-2">
                      <p className="text-xs text-blue-600 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 border border-blue-500 border-t-transparent rounded-full animate-spin" />
                        Analyzing image...
                      </p>
                    </div>
                  ) : null}

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelected(img); }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                      title="View details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Quality progress bar */}
              {img.qualityScore !== undefined && (
                <div className="h-0.5 bg-gray-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${img.qualityScore}%` }}
                    className="h-full transition-all duration-500"
                    style={{
                      background: img.qualityScore >= 70 
                        ? "linear-gradient(90deg, #059669, #10b981)" 
                        : img.qualityScore >= 50 
                        ? "linear-gradient(90deg, #d97706, #f59e0b)" 
                        : "linear-gradient(90deg, #dc2626, #ef4444)",
                    }}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Detail modal */}
      <ImageDetailModal image={selected} onClose={() => setSelected(null)} />
    </div>
  );
}