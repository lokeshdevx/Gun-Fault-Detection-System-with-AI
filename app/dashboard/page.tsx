"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/store/sessionStore";
import { DashboardNav } from "@/components/layout/DashboardNav";
import { CameraPanel } from "@/components/camera/CameraPanel";
import { AnalysisControls } from "@/components/analysis/AnalysisControls";
import { ImageGrid } from "@/components/analysis/ImageGrid";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, 
  Camera, 
  SlidersHorizontal, 
  Images, 
  Activity,
  CircleDot,
  AlertCircle,
  Loader2
} from "lucide-react";

export default function DashboardPage() {
  const { registration, sessionId, images, isAnalyzing } = useSessionStore();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!registration || !sessionId) {
      router.replace("/");
    } else {
      setChecking(false);
    }
  }, [registration, sessionId, router]);

  if (!isClient || checking || !registration) return null;

  const caliberDisplay =
    registration.caliber === "Other"
      ? registration.customCaliber
      : registration.caliber;

  const sessionFields = [
    { label: "Gun", value: registration.gunName, icon: null },
    { label: "Batch", value: registration.batchNumber, icon: null },
    { label: "Serial", value: registration.barrelSerialNumber, icon: null },
    { label: "Caliber", value: caliberDisplay, icon: null },
    { label: "Inspector", value: registration.inspectorName, icon: null },
  ];

  const stats = {
    total: images.length,
    pending: images.filter(i => i.status === "pending").length,
    analyzed: images.filter(i => i.status === "completed").length,
    hasImages: images.length > 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col">
      <DashboardNav />

      {/* Session info bar - improved */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-sm border-b border-gray-200/80 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
          {sessionFields.map(({ label, value }, index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-2"
            >
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {label}:
              </span>
              <span className="text-xs font-medium text-gray-700 truncate max-w-[80px] sm:max-w-[120px] lg:max-w-none">
                {value}
              </span>
              {index < sessionFields.length - 1 && (
                <span className="hidden sm:inline text-gray-300">|</span>
              )}
            </motion.div>
          ))}
        </div>
        
        {/* Session stats - new */}
        {stats.hasImages && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 text-xs"
          >
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200">
              <CircleDot className="w-3 h-3 text-gray-500" />
              <span className="font-medium text-gray-600">{stats.total}</span>
              <span className="text-gray-400">total</span>
            </div>
            {stats.pending > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
                <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
                <span className="font-medium text-amber-600">{stats.pending}</span>
                <span className="text-amber-500">pending</span>
              </div>
            )}
            {stats.analyzed > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-200">
                <Activity className="w-3 h-3 text-green-500" />
                <span className="font-medium text-green-600">{stats.analyzed}</span>
                <span className="text-green-500">analyzed</span>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Main content */}
      <div className="flex-1 p-3 sm:p-4 lg:p-6 min-h-0">
        <div className="flex flex-col gap-4 md:grid md:grid-cols-2 lg:flex lg:flex-row lg:gap-5 min-h-0 h-full">

          {/* Camera panel - improved */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white border border-gray-200/80 rounded-2xl shadow-lg shadow-gray-200/30 overflow-hidden
                       md:col-span-1 lg:w-[50%] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </div>
                <h2 className="text-xs font-bold text-gray-700 uppercase tracking-widest">
                  Camera
                </h2>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] text-green-600 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live
              </span>
            </div>
            <div className="flex-1 p-4">
              <CameraPanel />
            </div>
          </motion.div>

          {/* Controls panel - improved */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="bg-white border border-gray-200/80 rounded-2xl shadow-lg shadow-gray-200/30 overflow-hidden
                       md:col-start-1 lg:w-[22%] flex flex-col"
          >
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
                <SlidersHorizontal className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-widest">
                Controls
              </h2>
              {isAnalyzing && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto"
                >
                  <span className="flex items-center gap-1.5 text-[10px] text-blue-600 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing
                  </span>
                </motion.div>
              )}
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <AnalysisControls />
            </div>
          </motion.div>

          {/* ImageGrid panel - improved */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="bg-white border border-gray-200/80 rounded-2xl shadow-lg shadow-gray-200/30 overflow-hidden
                       flex flex-col min-h-[400px] md:min-h-[500px]
                       md:col-start-2 md:row-start-1 md:row-span-2
                       lg:w-[28%]"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-600 to-orange-700">
                  <Images className="w-3.5 h-3.5 text-white" />
                </div>
                <h2 className="text-xs font-bold text-gray-700 uppercase tracking-widest">
                  Images & Results
                </h2>
              </div>
              {stats.hasImages && (
                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {stats.total}
                </span>
              )}
            </div>
            <div className="flex-1 p-4 overflow-hidden">
              <ImageGrid />
            </div>
          </motion.div>

        </div>
      </div>

      {/* Mobile bottom bar - visible only on small screens */}
      <div className="lg:hidden bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-gray-400" />
          <span>{stats.total} images</span>
        </div>
        <div className="flex items-center gap-3">
          {stats.pending > 0 && (
            <span className="text-amber-600 font-medium">{stats.pending} pending</span>
          )}
          {stats.analyzed > 0 && (
            <span className="text-green-600 font-medium">{stats.analyzed} analyzed</span>
          )}
          <span className="w-px h-4 bg-gray-300" />
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            Online
          </span>
        </div>
      </div>
    </div>
  );
}