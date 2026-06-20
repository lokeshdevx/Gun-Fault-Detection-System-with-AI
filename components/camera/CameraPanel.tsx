"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, CameraOff, ZoomIn, Upload, RefreshCw, Usb, ChevronDown,
  CheckCircle, AlertCircle, FileImage, Video,
} from "lucide-react";
import { useSessionStore } from "@/lib/store/sessionStore";
import { validateImageQuality, compressImage } from "@/lib/utils/imageUtils";
import { saveImage } from "@/lib/db/database";
import type { CapturedImage } from "@/lib/types";
import { useToast } from "@/components/ui/ToastProvider";

export function CameraPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);

  const { sessionId, addImage } = useSessionStore();
  const { toast } = useToast();

  // ─── Camera helpers ──────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (mountedRef.current) {
      setIsCameraOn(false);
    }
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      stopCamera();
      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? {
                deviceId: { exact: deviceId },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              }
            : { width: { ideal: 1920 }, height: { ideal: 1080 } },
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!mountedRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch((err: unknown) => {
            console.warn("[CameraPanel] video.play() rejected:", err);
          });
        }

        if (mountedRef.current) {
          setIsCameraOn(true);
          toast("Camera started", "success");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        if (mountedRef.current) {
          toast(`Camera error: ${message}`, "error");
        }
      }
    },
    [stopCamera, toast]
  );

  // ─── Device enumeration ──────────────────────────────────────────────────────

  const refreshDevices = useCallback(async () => {
    try {
      try {
        const probe = await navigator.mediaDevices.getUserMedia({ video: true });
        probe.getTracks().forEach((t) => t.stop());
      } catch {
        // Permission denied or no camera — enumeration continues without labels.
      }

      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = all.filter((d) => d.kind === "videoinput");

      if (!mountedRef.current) return;

      setDevices(cams);
      setSelectedDevice((prev) => (prev === "" && cams.length > 0 ? cams[0].deviceId : prev));
    } catch {
      if (mountedRef.current) {
        toast("Could not enumerate cameras", "warning");
      }
    }
  }, [toast]);

  useEffect(() => {
    mountedRef.current = true;
    refreshDevices();
    navigator.mediaDevices.addEventListener("devicechange", refreshDevices);

    return () => {
      mountedRef.current = false;
      navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [refreshDevices]);

  // ─── Device selection ────────────────────────────────────────────────────────

  const switchCamera = async (deviceId: string) => {
    setSelectedDevice(deviceId);
    setShowDevices(false);
    if (isCameraOn) {
      await startCamera(deviceId);
    }
  };

  // ─── Image capture ───────────────────────────────────────────────────────────

  const captureImage = async () => {
    if (!videoRef.current) return;

    if (!sessionId) {
      toast("No active session — please start a session first", "warning");
      return;
    }

    if (
      videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      videoRef.current.videoWidth === 0
    ) {
      toast("Video feed not ready yet", "warning");
      return;
    }

    setCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast("Canvas not supported in this browser", "error");
        return;
      }

      ctx.drawImage(videoRef.current, 0, 0);
      const raw = canvas.toDataURL("image/jpeg", 0.92);
      await processImage(raw, `capture_${Date.now()}.jpg`);
    } catch {
      if (mountedRef.current) {
        toast("Capture failed", "error");
      }
    } finally {
      if (mountedRef.current) {
        setCapturing(false);
      }
    }
  };

  // ─── Image processing ────────────────────────────────────────────────────────

  const processImage = async (dataUrl: string, fileName: string) => {
    if (!sessionId) return;

    const compressed = await compressImage(dataUrl);
    const quality = await validateImageQuality(compressed);

    const fileSize = Math.round((compressed.length * 3) / 4);

    const img: CapturedImage = {
      id: crypto.randomUUID(),
      inspectionId: sessionId,
      dataUrl: compressed,
      fileName,
      fileSize,
      capturedAt: new Date().toISOString(),
      status: quality.passed ? "pending" : "failed",
      qualityScore: quality.score,
      qualityIssues: quality.issues,
      position: "",
    };

    addImage(img);
    await saveImage(img);

    if (!mountedRef.current) return;

    if (!quality.passed) {
      toast(`Quality check failed: ${quality.issues[0] ?? "unknown issue"}`, "warning");
    } else {
      toast("Image captured", "success");
    }
  };

  // ─── File upload ─────────────────────────────────────────────────────────────

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setUploadCount(files.length);

    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        toast(`${file.name} exceeds 20 MB limit`, "error");
        continue;
      }

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
          reader.readAsDataURL(file);
        });

        await processImage(dataUrl, file.name);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : `Could not load ${file.name}`;
        if (mountedRef.current) {
          toast(message, "error");
        }
      }
    }

    if (fileRef.current) {
      fileRef.current.value = "";
    }
    setTimeout(() => setUploadCount(0), 3000);
  };

  // ─── Derived UI values ───────────────────────────────────────────────────────

  const selectedLabel =
    devices.find((d) => d.deviceId === selectedDevice)?.label ?? "Default Camera";

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3.5 h-full">
      {/* Video feed - improved with better styling */}
      <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden border-2 border-gray-200 aspect-video shadow-inner">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {!isCameraOn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm"
          >
            <div className="w-14 h-14 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
              <CameraOff className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">Camera inactive</p>
            <p className="text-xs text-gray-400">Click "Start Camera" to begin</p>
          </motion.div>
        )}

        {isCameraOn && (
          <>
            {/* Corner alignment guides - enhanced */}
            {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map(
              (corner) => (
                <div
                  key={corner}
                  className={[
                    "absolute w-6 h-6 border-gray-700 border-2",
                    corner.includes("top") ? "top-3" : "bottom-3",
                    corner.includes("left") ? "left-3" : "right-3",
                    corner === "top-left"
                      ? "border-r-0 border-b-0 rounded-tl"
                      : corner === "top-right"
                      ? "border-l-0 border-b-0 rounded-tr"
                      : corner === "bottom-left"
                      ? "border-r-0 border-t-0 rounded-bl"
                      : "border-l-0 border-t-0 rounded-br",
                  ].join(" ")}
                />
              )
            )}

            {/* Live indicator - enhanced */}
            <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-xs font-semibold text-white tracking-wider">LIVE</span>
            </div>

            {/* Resolution indicator */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-gray-300 font-mono">
              1920×1080
            </div>
          </>
        )}

        {capturing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-white rounded-full p-4 shadow-2xl"
            >
              <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Camera device selector - improved */}
      <div className="relative">
        <button
          onClick={() => setShowDevices((prev) => !prev)}
          className="w-full flex items-center justify-between gap-2 bg-white border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 hover:border-gray-400 hover:shadow-md transition-all duration-200 group"
        >
          <span className="flex items-center gap-2.5">
            <div className="p-1 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
              <Usb className="w-4 h-4 text-gray-600" />
            </div>
            <span className="font-medium truncate max-w-[180px]">{selectedLabel}</span>
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showDevices ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {showDevices && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className="absolute z-20 w-full mt-1.5 bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-xl"
            >
              {devices.map((d, index) => (
                <button
                  key={d.deviceId}
                  onClick={() => switchCamera(d.deviceId)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                    d.deviceId === selectedDevice 
                      ? "text-gray-900 font-semibold bg-gray-50" 
                      : "text-gray-600"
                  }`}
                >
                  <Video className="w-3.5 h-3.5 text-gray-400" />
                  {d.label !== "" ? d.label : `Camera ${index + 1}`}
                  {d.deviceId === selectedDevice && (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 ml-auto" />
                  )}
                </button>
              ))}

              <button
                onClick={() => {
                  refreshDevices();
                  setShowDevices(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 border-t border-gray-200 flex items-center gap-2 font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh camera list
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls - improved with better buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => (isCameraOn ? stopCamera() : startCamera(selectedDevice || undefined))}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            isCameraOn
              ? "bg-red-50 text-red-700 border-2 border-red-300 hover:bg-red-100 hover:border-red-400"
              : "bg-gradient-to-r from-gray-800 to-gray-900 text-white border-2 border-gray-700 hover:from-gray-700 hover:to-gray-800 hover:shadow-lg"
          }`}
        >
          {isCameraOn ? (
            <CameraOff className="w-4 h-4" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
          {isCameraOn ? "Stop" : "Start Camera"}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={captureImage}
          disabled={!isCameraOn || capturing}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-500 hover:bg-gray-50 hover:shadow-md disabled:opacity-40 disabled:hover:shadow-none transition-all duration-200"
        >
          {capturing ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
          ) : (
            <ZoomIn className="w-4 h-4" />
          )}
          Capture
        </motion.button>
      </div>

      {/* Upload - improved */}
      <motion.label
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold bg-white border-2 border-dashed border-gray-300 text-gray-600 hover:border-gray-500 hover:text-gray-800 hover:bg-gray-50 cursor-pointer transition-all duration-200 shadow-sm"
      >
        <FileImage className="w-4 h-4" />
        Upload Images
        {uploadCount > 0 && (
          <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
            {uploadCount}
          </span>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </motion.label>

      {/* Supported formats - improved */}
      <div className="flex items-center justify-center gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-1 h-1 bg-gray-300 rounded-full" />
          JPG
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1 h-1 bg-gray-300 rounded-full" />
          PNG
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1 h-1 bg-gray-300 rounded-full" />
          WEBP
        </span>
        <span className="text-gray-300">·</span>
        <span>Max 20 MB</span>
      </div>
    </div>
  );
}