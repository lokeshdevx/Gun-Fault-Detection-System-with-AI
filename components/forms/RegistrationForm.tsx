"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Target, AlertCircle, ArrowRight, User, FileText,
  Crosshair, CalendarClock, Sliders, CheckCircle2,
  Shield, BadgeCheck, Sparkles,
} from "lucide-react";
import { useSessionStore } from "@/lib/store/sessionStore";
import { saveRegistration } from "@/lib/db/database";
import type { InspectionRegistration } from "@/lib/types";
import { useToast } from "@/components/ui/ToastProvider";

const schema = z.object({
  gunName: z.string().min(1, "Gun name is required"),
  batchNumber: z.string().min(1, "Batch number is required"),
  barrelSerialNumber: z.string().min(1, "Barrel serial number is required"),
  caliber: z.enum(["5.56mm", "7.62mm", "9mm", "12 Gauge", "Other"]),
  customCaliber: z.string().optional(),
  inspectorName: z.string().min(1, "Inspector name is required"),
  unitDepartment: z.string().optional(),
  inspectionNotes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const CALIBERS = ["5.56mm", "7.62mm", "9mm", "12 Gauge", "Other"] as const;
const CALIBER_LABELS: Record<string, string> = {
  "5.56mm": "5.56 mm",
  "7.62mm": "7.62 mm",
  "9mm": "9 mm",
  "12 Gauge": "12 GA",
  Other: "Other",
};

const QUALITY_HINTS = [
  { icon: Shield, label: "Blur detection" },
  { icon: BadgeCheck, label: "Brightness check" },
  { icon: Sparkles, label: "Sharpness validation" },
  { icon: Shield, label: "Exposure analysis" },
];

function SectionHeader({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="p-1 rounded-md bg-gradient-to-br from-gray-100 to-gray-200">
        <Icon className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
      </div>
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
        {label}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return (
    <div className="min-h-[18px] mt-1">
      <AnimatePresence>
        {message && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-1.5 text-[11px] text-red-600 font-medium"
          >
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function RegistrationForm() {
  const router = useRouter();
  const { setRegistration } = useSessionStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, touchedFields },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { caliber: "5.56mm" },
    mode: "onChange",
  });

  const caliber = watch("caliber");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const reg: InspectionRegistration = {
        ...data,
        inspectionDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      const id = await saveRegistration(reg);
      setRegistration(reg, id);
      toast("Inspection session started", "success");
      router.push("/dashboard");
    } catch {
      toast("Failed to start inspection. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const getInputClass = (fieldName: keyof FormData) => {
    const hasError = errors[fieldName];
    const isTouched = touchedFields[fieldName];
    return `w-full bg-white border rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:outline-none ${
      hasError && isTouched
        ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
        : "border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 hover:border-gray-400"
    }`;
  };

  const labelClass =
    "block text-[11px] font-semibold text-gray-600 uppercase tracking-[0.07em] mb-1.5";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-9xl mx-auto"
    >
      {/* ── Header ───────────────────────────────────── */}
      <motion.div 
        className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-200 p-2 sm:px-3 lg:px-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg flex items-center justify-center flex-shrink-0">
          <Target className="w-5 h-5 text-white" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-snug flex items-center gap-2">
            Inspection Manifest
            <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">v2.0</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <span className="inline-block w-1 h-1 bg-gray-300 rounded-full" />
            Complete all required fields to begin barrel fault detection
          </p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
        {/* ── Weapon Identification ─────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <SectionHeader icon={Crosshair} label="Weapon identification" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Gun name <span className="text-red-500">*</span>
              </label>
              <input
                {...register("gunName")}
                className={getInputClass("gunName")}
                placeholder="e.g. M4A1 Carbine"
              />
              <FieldError message={errors.gunName?.message} />
            </div>
            <div>
              <label className={labelClass}>
                Batch number <span className="text-red-500">*</span>
              </label>
              <input
                {...register("batchNumber")}
                className={getInputClass("batchNumber")}
                placeholder="e.g. BTH-2024-001"
              />
              <FieldError message={errors.batchNumber?.message} />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelClass}>
              Barrel serial number <span className="text-red-500">*</span>
            </label>
            <input
              {...register("barrelSerialNumber")}
              className={getInputClass("barrelSerialNumber")}
              placeholder="e.g. BSN-789456"
            />
            <FieldError message={errors.barrelSerialNumber?.message} />
          </div>
        </motion.section>

        {/* ── Caliber Toggle ────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SectionHeader icon={Sliders} label="Caliber" />
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {CALIBERS.map((cal) => (
              <button
                key={cal}
                type="button"
                onClick={() => setValue("caliber", cal, { shouldValidate: true })}
                className={`relative py-2.5 px-1 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                  caliber === cal
                    ? "bg-gray-800 border-gray-700 text-white shadow-md scale-[0.98]"
                    : "bg-white border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800 hover:shadow-sm hover:scale-[0.98]"
                }`}
              >
                {CALIBER_LABELS[cal]}
                {caliber === cal && (
                  <motion.div
                    layoutId="caliber-indicator"
                    className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
          <AnimatePresence>
            {caliber === "Other" && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                style={{ overflow: "hidden" }}
              >
                <label className={labelClass}>
                  Specify caliber <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("customCaliber")}
                  className={getInputClass("customCaliber")}
                  placeholder="e.g. .308 Winchester"
                />
                <FieldError message={errors.customCaliber?.message} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* ── Inspector Details ─────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <SectionHeader icon={User} label="Inspector details" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Inspector name <span className="text-red-500">*</span>
              </label>
              <input
                {...register("inspectorName")}
                className={getInputClass("inspectorName")}
                placeholder="Full name"
              />
              <FieldError message={errors.inspectorName?.message} />
            </div>
            <div>
              <label className={labelClass}>Unit / Department</label>
              <input
                {...register("unitDepartment")}
                className={getInputClass("unitDepartment")}
                placeholder="e.g. Armory Division"
              />
              <div className="min-h-[18px]" />
            </div>
          </div>
        </motion.section>

        {/* ── Notes ────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <SectionHeader icon={FileText} label="Pre-inspection notes" />
          <textarea
            {...register("inspectionNotes")}
            rows={3}
            className={`${getInputClass("inspectionNotes")} resize-none`}
            placeholder="Any pre-inspection observations, known issues, or context…"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {QUALITY_HINTS.map(({ icon: Icon, label }) => (
              <motion.span
                key={label}
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 text-[10px] font-medium text-gray-600 shadow-sm"
              >
                <Icon className="w-3 h-3 text-gray-500" />
                {label}
              </motion.span>
            ))}
          </div>
        </motion.section>

        {/* ── Date bar ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl px-4 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm"
        >
          <span className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.08em]">
            <div className="p-1 rounded-md bg-white border border-gray-200">
              <CalendarClock className="w-3.5 h-3.5 text-gray-600" />
            </div>
            Inspection date
          </span>
          <span className="text-xs font-mono font-semibold text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200 w-full sm:w-auto text-center">
            {new Date().toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </motion.div>

        {/* ── Submit ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 text-white text-sm font-semibold hover:from-gray-700 hover:to-gray-800 hover:shadow-lg hover:shadow-gray-200/50 disabled:opacity-50 disabled:hover:shadow-none transition-all duration-300 overflow-hidden"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Starting session…</span>
              </>
            ) : (
              <>
                <span>Continue to inspection</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-3">
            By continuing, you agree to our inspection terms and conditions
          </p>
        </motion.div>
      </form>
    </motion.div>
  );
}