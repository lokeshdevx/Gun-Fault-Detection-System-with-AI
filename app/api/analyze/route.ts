import { NextRequest, NextResponse } from "next/server";

// ─── Next.js Route Segment Config ─────────────────────────────────────────────
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// ─── Constants ────────────────────────────────────────────────────────────────

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;
const FETCH_TIMEOUT_MS = 300_000;
const MAX_PAYLOAD_BYTES = 25 * 1024 * 1024;

const VALID_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type ValidMediaType = (typeof VALID_MEDIA_TYPES)[number];

// ─── Prompt ───────────────────────────────────────────────────────────────────

const ANALYSIS_PROMPT = `You are a certified senior firearm barrel inspection specialist with 20+ years of experience in defense armament quality control. Your task is to perform an exhaustive, forensic-level analysis of this endoscopic barrel image.

CRITICAL INSTRUCTION:
You MUST analyze the ENTIRE image systematically and report EVERY visible defect supported by visual evidence.

DO NOT skip any defect type during inspection.

For EACH of the listed defect categories:
- Explicitly check whether it is present or absent.
- Report a defect only when there is visible evidence.
- Multiple defects may exist in the same area and must all be reported.
- A single visual anomaly may belong to multiple defect categories if evidence supports it.
- Missing a visible defect is considered a critical inspection failure.

════════════════════════════════════════
IMAGE VIEW TYPE — IDENTIFY FIRST
════════════════════════════════════════

BEFORE inspecting defects, determine the image view type:

A) END-ON / MUZZLE VIEW: Camera is looking straight into the bore from the muzzle or breech end.
   Visual cues: circular bore opening dominates the image, concentric rings visible, rifling spirals inward.

B) SIDE / ENDOSCOPIC VIEW: Camera is inside the barrel looking along the bore axis.
   Visual cues: rifling lands and grooves run lengthwise, cylindrical tunnel perspective, a lit circular area visible at the far end of the bore.

The view type determines how each defect will appear. Apply the correct detection rules below.

════════════════════════════════════════
IMAGE ANALYSIS REQUIREMENTS
════════════════════════════════════════
- Inspect the image from top-to-bottom and left-to-right.
- Examine all visible barrel surfaces, rifling, grooves, lands, coating areas, and deposits.
- Evaluate color, texture, shape, geometry, surface condition, and coating integrity.
- Look for both primary defects and secondary defects that may occur together.

════════════════════════════════════════
EVIDENCE REQUIREMENT
════════════════════════════════════════
Every reported defect MUST include:
- Specific visual evidence
- Exact image location
- Observable characteristics
- Severity assessment
- Confidence score

════════════════════════════════════════
CONFIDENCE GUIDELINES
════════════════════════════════════════
- Use high confidence only when clear visual evidence exists.
- Reduce confidence when image quality, lighting, blur, reflections, shadows, fouling, or obstruction limits certainty.
- Never assign confidence above 0.95 unless evidence is exceptionally clear.

════════════════════════════════════════
DEFECT TYPES TO IDENTIFY (CHECK EACH)
════════════════════════════════════════

──────────────────────────────────────
1. PITTING
──────────────────────────────────────
Definition: Small dark holes, craters, or indentations in the bore surface.

END-ON VIEW: Appears as small dark dots or irregular dark patches on the visible inner bore wall surface.
SIDE VIEW: Appears as small dark craters or holes pitting the surface along the bore walls.

──────────────────────────────────────
2. BULGE
──────────────────────────────────────
Definition: Outward swelling or deformation of the barrel wall.

⚠ END-ON VIEW — CRITICAL DETECTION RULE:
When viewing the barrel end-on (muzzle or breech view), a bulge DOES NOT appear as outward swelling.
Instead, look for ALL of the following indicators:
  - A dark circular ring, band, or shadow ring INSIDE the bore (ring-within-a-ring appearance)
  - An asymmetric, irregular, or non-circular inner bore outline
  - A visible constriction point or narrowing of the bore at any depth
  - Any circular anomaly, shadow band, or tonal change inside the bore that does not match the normal bore geometry
  - A distinct darker or lighter band encircling the interior bore wall
If ANY of the above is visible → MUST report as Bulge with appropriate severity.

SIDE VIEW: Appears as a visible outward bump or widening of the barrel wall, distorted rifling geometry at one location.

──────────────────────────────────────
3. CORROSION
──────────────────────────────────────
Definition: Rust or oxidation — brown, reddish-brown, orange-brown, or rust-colored areas.
CRITICAL: ANY brown or rust color anywhere in the image = Corrosion. Do not confuse with lighting.

END-ON VIEW: Brown/rust patches on the muzzle face, bore opening edge, or visible inner bore surface.
SIDE VIEW: Brown/rust discoloration on lands, grooves, or bore walls.

──────────────────────────────────────
4. FLECKING OFF
──────────────────────────────────────
Definition: Peeling, chipping, or detachment of the protective coating or lining from the metal substrate.

⚠ PRIORITY RULE: If the dominant feature is coating/lining that is lifting, peeling, bubbling, or detaching —
classify as Flecking Off FIRST. Do NOT classify as Chrome Lining Damage or Erosion if detachment is the
primary visible feature.

END-ON VIEW: Irregular bright or light patches where dark coating is absent on the muzzle face or bore edge.
Patchy areas where coating has chipped away leaving exposed base metal.

SIDE VIEW — CRITICAL DETECTION RULE:
In endoscopic/side view, Flecking Off appears as:
  - White, cream, or light-coloured patches where the coating has lifted, bubbled, or separated from base metal
  - Irregular shaped areas of delaminated or detached lining visible on the bore wall or at the lit far end
  - Darker exposed patches surrounded by raised, curling, or broken coating edges
  - A cracked, broken, or delaminated surface where coating pieces are actively detaching
  - "Island" patterns of remaining coating surrounded by bare or differently coloured metal areas
  - Any surface where layers appear to be coming apart or separating from the substrate beneath
If the coating/lining is visibly lifting, peeling, bubbling, or detaching → MUST report as Flecking Off.

──────────────────────────────────────
5. SURFACE SPOTS
──────────────────────────────────────
Definition: Localized abnormal dark, brown, black, orange, gray, or metallic spots.

END-ON VIEW: Multiple scattered spots visible on the muzzle face or inside the bore.
SIDE VIEW: Spots distributed across the bore surface.

──────────────────────────────────────
6. CRACKS
──────────────────────────────────────
Definition: Linear fractures, splits, or fissures in the metal or coating surface.

END-ON VIEW: Visible as straight or branching dark lines radiating from the bore center, across the muzzle face, or along the inner bore wall.
SIDE VIEW: Linear fractures, branching black lines, or fissures running across or along the bore walls or coating surface.
NOTE: Cracks often appear together with Flecking Off — if both are visible, report both independently.

──────────────────────────────────────
7. EROSION
──────────────────────────────────────
Definition: Gradual surface wear resulting in roughened, irregular texture of the base metal itself.
NOTE: Erosion refers to wear of the underlying metal, NOT detachment of a coating layer (that is Flecking Off).

END-ON VIEW: Roughened or irregular texture visible on the muzzle face or bore edge.
SIDE VIEW: Roughened bore surface, loss of smooth finish on lands and grooves, pitted or worn base metal visible beneath removed coating.

──────────────────────────────────────
8. CARBON FOULING
──────────────────────────────────────
Definition: Black or dark gray residue deposits from propellant combustion.

END-ON VIEW: Dark gray or black deposit layer visible on the muzzle face, bore opening, or inner bore wall.
SIDE VIEW: Dark deposits coating bore walls, particularly near the chamber end.

──────────────────────────────────────
9. RIFLING WEAR
──────────────────────────────────────
Definition: Rounded, smoothed, or diminished rifling lands and grooves.

END-ON VIEW: Rifling spiral appears faint, indistinct, or lands look rounded rather than sharp when viewed end-on.
SIDE VIEW: Lands appear flat-topped, grooves appear shallow or smoothed.

──────────────────────────────────────
10. SPOT
──────────────────────────────────────
Definition: Single well-defined circular or oval mark (1–10mm, clear boundary).

END-ON VIEW: Single isolated circular mark on the muzzle face or bore surface.
SIDE VIEW: Single well-defined circular mark on the bore wall.

──────────────────────────────────────
11. CUTS
──────────────────────────────────────
Definition: Sharp, clean-edged incisions penetrating into the metal substrate.

END-ON VIEW: Sharp straight lines or notches visible on the muzzle face or bore edge — distinct from cracks by their clean, deliberate appearance.
SIDE VIEW: Clean incisions cutting across the bore surface perpendicular to bore axis.

──────────────────────────────────────
12. RINGED BARREL
──────────────────────────────────────
Definition: A circular internal swelling forming a complete or partial ring around the bore circumference.

⚠ END-ON VIEW — CRITICAL DETECTION RULE:
A ringed barrel is MOST VISIBLE in end-on view. Look for:
  - A complete or partial dark ring or band encircling the inside of the bore
  - A concentric ring INSIDE the main bore circle (ring-within-a-ring)
  - A shadow band forming a circular arc inside the bore at any depth
  - Any tonal or geometric discontinuity forming a circular pattern inside the bore
If ANY circular ring or band is visible inside the bore → MUST report as Ringed Barrel.
When Ringed Barrel is detected in end-on view, ALSO report as Bulge.

SIDE VIEW: Appears as a circumferential ring or ridge running around the inner bore wall.

──────────────────────────────────────
13. DENT
──────────────────────────────────────
Definition: Localized inward deformation of the barrel wall.

END-ON VIEW: Bore outline appears non-circular with a flat or concave section. Shadow on one side of the bore.
SIDE VIEW: Visible inward depression on the outer or inner barrel surface.

──────────────────────────────────────
14. SCRATCH / SCORING
──────────────────────────────────────
Definition: Linear grooves parallel to the bore axis.

END-ON VIEW: Fine radial or linear marks visible on the muzzle face or inner bore wall.
SIDE VIEW: Parallel grooves running lengthwise along the bore walls.

──────────────────────────────────────
15. CHROME LINING DAMAGE
──────────────────────────────────────
Definition: Degradation of the chrome lining where it remains in place but is cracked, worn thin, or uneven — NOT detaching.
NOTE: If the chrome/lining is actively peeling or detaching, classify as Flecking Off instead.

END-ON VIEW: Patchy, irregular reflective surface on the bore interior — alternating bright and dull areas indicating chrome thinning or wear while still attached.
SIDE VIEW: Irregular chrome patches, bright spots surrounded by dull areas, worn-through chrome exposing base metal but lining still in place.

════════════════════════════════════════
SEVERITY CLASSIFICATION RULES
════════════════════════════════════════

PITTING:
- Low: 1-5 isolated pits, <1mm diameter, <5% surface affected
- Medium: 6-20 pits or 1-3mm diameter, 5-20% surface affected
- High: 20+ pits, >3mm diameter, >20% surface affected, deep pits

BULGE:
- Low: slight wall irregularity, minor asymmetry, <0.5cm
- Medium: noticeable deformation, 0.5-2cm
- High: severe deformation >2cm, or any visible ring/band in end-on view indicating structural deformation unsafe for operation

CORROSION:
- Low: minor brown/rust discoloration, <10% surface
- Medium: moderate rust formation, 10-40% surface
- High: severe rust, >40% surface, deep material degradation

FLECKING OFF:
- Low: small isolated chips/flakes, <5% area
- Medium: moderate coating loss or delamination, 5-25% area
- High: extensive coating detachment/peeling/delamination >25% area, large sections lifting or missing

SURFACE SPOTS:
- Low: 1-5 isolated spots, <5% surface
- Medium: multiple spots, 5-15% surface
- High: extensive spotting >15% surface

CRACKS:
- Low: single hairline crack <5mm
- Medium: multiple cracks or 5-20mm length
- High: structural cracks >20mm, deep branching network of cracks

EROSION:
- Low: minor surface roughness
- Medium: noticeable wear, 10-30% surface
- High: severe degradation >30%

CARBON FOULING:
- Low: <10% surface affected
- Medium: 10-30% surface affected
- High: >30% surface affected

RIFLING WEAR:
- Low: slight rounding of rifling edges
- Medium: noticeable reduction in definition
- High: severe loss of rifling geometry

SPOT:
- Low: single spot <3mm, superficial
- Medium: spot 3-7mm or multiple spots
- High: spot >7mm or deep structural mark

CUTS:
- Low: single shallow cut <3mm, no metal displacement
- Medium: cut 3-10mm or multiple shallow cuts
- High: deep cut >10mm, multiple deep cuts, structural impact

RINGED BARREL:
- Low: faint ring visible, minor tonal discontinuity inside bore
- Medium: clear ring or band visible inside bore with noticeable distortion
- High: prominent ring or band clearly visible in end-on view — indicates structural failure, unsafe for use

DENT:
- Low: minor inward deformation, <1mm depth
- Medium: noticeable dent affecting profile
- High: severe dent disrupting bore

SCRATCH/SCORING:
- Low: superficial scratches
- Medium: deep visible scoring
- High: extensive scoring affecting functionality

CHROME LINING DAMAGE:
- Low: <5% lining affected (worn/thinned but attached)
- Medium: 5-25% lining worn or degraded while still attached
- High: >25% lining severely worn, cracked in place, or structurally compromised

════════════════════════════════════════
CONFIDENCE SCORES
════════════════════════════════════════
- 0.90-1.00: Definite, clearly visible, unambiguous evidence
- 0.70-0.89: Likely, good evidence but slight ambiguity
- 0.50-0.69: Possible, some evidence but uncertain
- 0.30-0.49: Unlikely but cannot rule out
- 0.00-0.29: Very unlikely or no evidence

════════════════════════════════════════
BARREL HEALTH SCORE (0-100)
════════════════════════════════════════
Calculate based on defects present:
- No defects: 95-100
- Only Low severity: 70-94 (deduct 1-3 points per low defect)
- Medium severity present: 40-69 (deduct 5-15 points per medium defect)
- High severity present: 0-39 (deduct 20-40 points per high defect)
- Minimum score 0, maximum 100

════════════════════════════════════════
OVERALL CONDITION STATUS
════════════════════════════════════════
- "Safe for Use": No defects found OR only Low severity with <10% affected area
- "Maintenance Required": Any Medium severity, or Low severity covering >10% area
- "Immediate Replacement Required": Any High severity defect

════════════════════════════════════════
CRITICAL ISSUES COUNT
════════════════════════════════════════
Count of issues with severity = "High"

════════════════════════════════════════
FIELD DEFINITIONS FOR EACH ISSUE
════════════════════════════════════════
- issueName: Exactly one of the 15 defect types listed above
- severity: "Low", "Medium", or "High" based on severity rules
- confidence: Number between 0-1 based on confidence score guidelines
- description: 1-2 sentences describing what was observed
- evidence: Specific visual indicators (color, shape, location, size)
- rootCause: Most likely cause (e.g., "moisture exposure", "firing stress", "improper cleaning")
- solution: 1 sentence fix or remediation
- maintenanceAction: "Inspect", "Clean", "Repair", or "Replace"
- riskLevel: "Low", "Medium", or "High"
- affectedArea: Estimated percentage (e.g., "<5%", "10-20%", ">40%")
- location: "top-left", "top-right", "center", "bottom-left", "bottom-right"

════════════════════════════════════════
ANALYSIS PROCESS (FOLLOW STRICTLY)
════════════════════════════════════════
STEP 1: Identify image view type (END-ON or SIDE/ENDOSCOPIC view)
STEP 2: Scan entire image systematically (top to bottom, left to right)
STEP 3: CHECK BORE GEOMETRY FIRST:
   END-ON: Is there a ring, band, or circular anomaly INSIDE the bore? → Bulge + Ringed Barrel
   END-ON: Is the bore circle irregular, asymmetric, or non-circular? → Bulge or Dent
   SIDE: Is there any coating lifting, peeling, bubbling, or detaching? → Flecking Off
STEP 4: Check ALL color variations:
   - Brown/rust ANYWHERE → MUST report Corrosion
   - Black/dark gray deposits → Carbon Fouling
   - Localized dark spots → Surface Spots or Spot
STEP 5: Check ALL surface texture anomalies:
   - Holes/craters → Pitting
   - Linear grooves → Scratch/Scoring
   - Rough base metal → Erosion
   - Fractures/branching lines → Cracks
   - Sharp clean incisions → Cuts
STEP 6: Check coating integrity:
   - Coating lifting, peeling, detaching → Flecking Off (PRIORITY)
   - Coating worn/thinned but still attached → Chrome Lining Damage
STEP 7: Check rifling definition:
   - Worn/indistinct rifling → Rifling Wear
STEP 8: For EACH defect found, create a complete issue object with ALL fields
STEP 9: If NO defects found, return empty issues array

════════════════════════════════════════
CRITICAL REMINDERS
════════════════════════════════════════
- In END-ON view, a bulge/ringed barrel appears as a RING INSIDE THE BORE — not as swelling
- In SIDE view, peeling/lifting/bubbling coating = Flecking Off — NOT Chrome Lining Damage or Erosion
- Flecking Off and Cracks frequently appear together — always report both if both are visible
- Brown/rust coloring ALWAYS equals Corrosion — never confuse with lighting
- Missing a defect is more dangerous than over-reporting
- Multiple defect types can exist in one image — report ALL
- Each issue must have ALL fields populated (no nulls or empty strings)
- Confidence must be realistic — do not inflate

════════════════════════════════════════
OUTPUT FORMAT (STRICT JSON - NO MARKDOWN)
════════════════════════════════════════
{
  "barrelHealthScore": 0,
  "overallCondition": "",
  "criticalIssues": 0,
  "issues": [
    {
      "issueName": "",
      "severity": "",
      "confidence": 0,
      "description": "",
      "evidence": "",
      "rootCause": "",
      "solution": "",
      "maintenanceAction": "",
      "riskLevel": "",
      "affectedArea": "",
      "location": ""
    }
  ]
}`;

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = "Low" | "Medium" | "High";
type MaintenanceAction = "Inspect" | "Clean" | "Repair" | "Replace";

interface AnalysisIssue {
  issueName: string;
  severity: Severity;
  confidence: number;
  description: string;
  evidence: string;
  rootCause: string;
  solution: string;
  maintenanceAction: MaintenanceAction;
  riskLevel: Severity;
  affectedArea: string;
  location: string;
}

interface AnalysisResult {
  barrelHealthScore: number;
  overallCondition: string;
  criticalIssues: number;
  issues: AnalysisIssue[];
}

// ─── Anthropic error shape ────────────────────────────────────────────────────

interface AnthropicErrorBody {
  type?: string;
  error?: {
    type?: string;
    message?: string;
  };
}

/**
 * Parse the Anthropic error body and return:
 * - userMessage: safe to send to the client
 * - logDetail:   full detail for server logs only
 */
async function parseAnthropicError(
  response: Response
): Promise<{ userMessage: string; logDetail: string }> {
  let raw = "(unreadable)";
  let parsed: AnthropicErrorBody = {};

  try {
    raw = await response.text();
    parsed = JSON.parse(raw) as AnthropicErrorBody;
  } catch {
    // raw stays as-is, parsed stays empty
  }

  const apiMessage = parsed?.error?.message ?? "";
  const apiType = parsed?.error?.type ?? "";
  const logDetail = `status=${response.status} type=${apiType} message=${apiMessage || raw}`;

  switch (response.status) {
    case 400:
      // Most common cause: image too large (>5 MB decoded), unsupported format,
      // or a base64 encoding issue. The Anthropic message usually says which.
      return {
        userMessage: apiMessage
          ? `Request rejected by analysis service: ${apiMessage}`
          : "Invalid request sent to analysis service. Check image format and size.",
        logDetail,
      };
    case 401:
      return {
        userMessage: "Analysis service authentication failed. Contact support.",
        logDetail,
      };
    case 403:
      return {
        userMessage: "Access denied by analysis service. Contact support.",
        logDetail,
      };
    case 413:
      return {
        userMessage:
          "Image is too large for the analysis service. Please use a smaller image.",
        logDetail,
      };
    case 529:
    case 503:
    case 502:
      return {
        userMessage:
          "Analysis service is temporarily overloaded. Please try again in a moment.",
        logDetail,
      };
    default:
      return {
        userMessage: apiMessage
          ? `Analysis service error: ${apiMessage}`
          : `Analysis service returned status ${response.status}. Please try again.`,
        logDetail,
      };
  }
}

// ─── Validation helpers ───────────────────────────────────────────────────────

const VALID_SEVERITIES: Severity[] = ["Low", "Medium", "High"];
const VALID_MAINTENANCE_ACTIONS: MaintenanceAction[] = [
  "Inspect",
  "Clean",
  "Repair",
  "Replace",
];
const VALID_LOCATIONS = [
  "top-left",
  "top-right",
  "center",
  "bottom-left",
  "bottom-right",
];
const VALID_ISSUE_NAMES = [
  "Pitting",
  "Bulge",
  "Corrosion",
  "Flecking Off",
  "Surface Spots",
  "Cracks",
  "Erosion",
  "Carbon Fouling",
  "Rifling Wear",
  "Spot",
  "Cuts",
  "Ringed Barrel",
  "Dent",
  "Scratch/Scoring",
  "Chrome Lining Damage",
];

function isSeverity(value: unknown): value is Severity {
  return typeof value === "string" && VALID_SEVERITIES.includes(value as Severity);
}

function isMaintenanceAction(value: unknown): value is MaintenanceAction {
  return (
    typeof value === "string" &&
    VALID_MAINTENANCE_ACTIONS.includes(value as MaintenanceAction)
  );
}

function sanitiseIssue(raw: Record<string, unknown>): AnalysisIssue {
  return {
    issueName:
      typeof raw.issueName === "string" && VALID_ISSUE_NAMES.includes(raw.issueName)
        ? raw.issueName
        : "Unknown",
    severity: isSeverity(raw.severity) ? raw.severity : "Low",
    confidence:
      typeof raw.confidence === "number" &&
      raw.confidence >= 0 &&
      raw.confidence <= 1
        ? raw.confidence
        : 0,
    description:
      typeof raw.description === "string" && raw.description.trim() !== ""
        ? raw.description.trim()
        : "No description provided.",
    evidence:
      typeof raw.evidence === "string" && raw.evidence.trim() !== ""
        ? raw.evidence.trim()
        : "No evidence provided.",
    rootCause:
      typeof raw.rootCause === "string" && raw.rootCause.trim() !== ""
        ? raw.rootCause.trim()
        : "Unknown root cause.",
    solution:
      typeof raw.solution === "string" && raw.solution.trim() !== ""
        ? raw.solution.trim()
        : "Consult a qualified armourer.",
    maintenanceAction: isMaintenanceAction(raw.maintenanceAction)
      ? raw.maintenanceAction
      : "Inspect",
    riskLevel: isSeverity(raw.riskLevel) ? raw.riskLevel : "Low",
    affectedArea:
      typeof raw.affectedArea === "string" && raw.affectedArea.trim() !== ""
        ? raw.affectedArea.trim()
        : "Unknown",
    location:
      typeof raw.location === "string" && VALID_LOCATIONS.includes(raw.location)
        ? raw.location
        : "center",
  };
}

// ─── String helpers ───────────────────────────────────────────────────────────

function stripBase64Prefix(base64: string): string {
  return base64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "").trim();
}

function cleanJsonText(text: string): string {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
}

// ─── Domain helpers ───────────────────────────────────────────────────────────

function recomputeCriticalIssues(issues: AnalysisIssue[]): number {
  return issues.filter((i) => i.severity === "High").length;
}

function deriveOverallCondition(issues: AnalysisIssue[]): string {
  if (issues.some((i) => i.severity === "High")) return "Immediate Replacement Required";
  if (issues.some((i) => i.severity === "Medium") || issues.some((i) => i.severity === "Low"))
    return "Maintenance Required";
  return "Safe for Use";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function applyDefaults(parsed: Record<string, unknown>): AnalysisResult {
  const rawIssues = Array.isArray(parsed.issues) ? parsed.issues : [];
  const issues: AnalysisIssue[] = rawIssues
    .filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === "object" && !Array.isArray(item)
    )
    .map((item) => sanitiseIssue(item));

  const barrelHealthScore =
    typeof parsed.barrelHealthScore === "number"
      ? clamp(Math.round(parsed.barrelHealthScore), 0, 100)
      : 100;

  return {
    barrelHealthScore,
    overallCondition: deriveOverallCondition(issues),
    issues,
    criticalIssues: recomputeCriticalIssues(issues),
  };
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "POST" } }
  );
}
export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "POST" } }
  );
}
export async function PATCH() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "POST" } }
  );
}
export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function POST(req: NextRequest) {
  // 1. API key check.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[barrel-analysis] ANTHROPIC_API_KEY is not set");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // Log key prefix only — never log the full key.
  console.log(`[barrel-analysis] Using API key: ${apiKey.slice(0, 10)}…`);

  // 2. Payload size guard.
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: "Payload too large. Maximum size is 25 MB." },
      { status: 413 }
    );
  }

  // 3. Parse body.
  let base64Raw: unknown;
  let mediaTypeRaw: unknown;
  try {
    const body: unknown = await req.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
    }
    const typedBody = body as Record<string, unknown>;
    base64Raw = typedBody.base64;
    mediaTypeRaw = typedBody.mediaType;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof base64Raw !== "string" || base64Raw.trim() === "") {
    return NextResponse.json({ error: "Missing or empty 'base64' field" }, { status: 400 });
  }

  // 4. Media type.
  const resolvedMediaType: ValidMediaType =
    typeof mediaTypeRaw === "string" &&
    VALID_MEDIA_TYPES.includes(mediaTypeRaw as ValidMediaType)
      ? (mediaTypeRaw as ValidMediaType)
      : "image/jpeg";

  // 5. Strip data-URL prefix and validate base64 charset.
  const base64Clean = stripBase64Prefix(base64Raw);
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(base64Clean)) {
    return NextResponse.json({ error: "Invalid base64 image data" }, { status: 400 });
  }

  // Log approximate decoded size — Anthropic rejects images > ~5 MB decoded.
  const approxKB = Math.round((base64Clean.length * 3) / 4 / 1024);
  console.log(`[barrel-analysis] Image payload ~${approxKB} KB, mediaType=${resolvedMediaType}`);
  if (approxKB > 5_000) {
    console.warn(
      `[barrel-analysis] Image is ~${approxKB} KB — Anthropic may reject images over ~5 MB decoded.`
    );
  }

  // 6. Call Anthropic API.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let anthropicResponse: Response;
  try {
    anthropicResponse = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.1,
        system: ANALYSIS_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: resolvedMediaType,
                  data: base64Clean,
                },
              },
              {
                type: "text",
                text: "Perform a comprehensive barrel fault inspection on this image. Return ONLY the complete JSON analysis. No markdown, no extra text, no explanations.",
              },
            ],
          },
        ],
      }),
    });
  } catch (err: unknown) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[barrel-analysis] Request timed out after 5 minutes");
      return NextResponse.json(
        { error: "Analysis request timed out after 5 minutes. Please try again." },
        { status: 504 }
      );
    }
    console.error("[barrel-analysis] Network fetch error:", err);
    return NextResponse.json({ error: "Failed to reach analysis service" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }

  // 7. Handle non-OK Anthropic responses with full diagnosis.
  if (!anthropicResponse.ok) {
    const { userMessage, logDetail } = await parseAnthropicError(anthropicResponse);
    console.error(`[barrel-analysis] Anthropic API error — ${logDetail}`);

    if (anthropicResponse.status === 429) {
      return NextResponse.json(
        { error: "Rate limit reached. Please wait before retrying." },
        { status: 429 }
      );
    }

    // Forward the Anthropic HTTP status so callers can distinguish
    // 400 (bad image/request) from 5xx (service-side problems).
    return NextResponse.json({ error: userMessage }, { status: anthropicResponse.status });
  }

  // 8. Parse Anthropic response envelope.
  let apiData: unknown;
  try {
    apiData = await anthropicResponse.json();
  } catch {
    console.error("[barrel-analysis] Failed to parse Anthropic response as JSON");
    return NextResponse.json(
      { error: "Invalid response from analysis service" },
      { status: 500 }
    );
  }

  if (apiData === null || typeof apiData !== "object" || Array.isArray(apiData)) {
    console.error("[barrel-analysis] Unexpected API data shape:", apiData);
    return NextResponse.json(
      { error: "Unexpected response format from analysis service" },
      { status: 500 }
    );
  }

  const apiObj = apiData as Record<string, unknown>;

  // 9. Check stop_reason — "max_tokens" means the JSON was truncated mid-response.
  const stopReason = apiObj.stop_reason;
  console.log(`[barrel-analysis] Anthropic stop_reason=${stopReason}`);
  if (stopReason === "max_tokens") {
    console.warn(
      "[barrel-analysis] Response truncated (max_tokens hit). " +
        "JSON will be incomplete. Increase MAX_TOKENS if this recurs."
    );
    return NextResponse.json(
      {
        error:
          "Analysis response was truncated due to length. " +
          "The image may be very complex — please try again.",
      },
      { status: 500 }
    );
  }

  // 10. Extract text block.
  const contentArray = apiObj.content;
  if (!Array.isArray(contentArray)) {
    console.error("[barrel-analysis] Missing content array:", apiObj);
    return NextResponse.json(
      { error: "Unexpected response format from analysis service" },
      { status: 500 }
    );
  }

  const textBlock = contentArray.find(
    (b): b is { type: "text"; text: string } =>
      b !== null &&
      typeof b === "object" &&
      !Array.isArray(b) &&
      (b as Record<string, unknown>).type === "text" &&
      typeof (b as Record<string, unknown>).text === "string"
  );

  if (!textBlock) {
    console.error(
      "[barrel-analysis] No text block found in response:",
      JSON.stringify(apiObj)
    );
    return NextResponse.json(
      { error: "Unexpected response format from analysis service" },
      { status: 500 }
    );
  }

  // 11. Parse JSON from model output.
  const cleaned = cleanJsonText(textBlock.text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error(
      "[barrel-analysis] JSON parse error.",
      "\nError:", parseErr,
      "\nRaw model output (first 500 chars):", textBlock.text.slice(0, 500)
    );
    return NextResponse.json(
      { error: "Failed to parse analysis response. The model returned malformed JSON." },
      { status: 500 }
    );
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return NextResponse.json(
      { error: "Analysis response has unexpected shape" },
      { status: 500 }
    );
  }

  // 12. Sanitise, recompute derived fields, and return.
  const result = applyDefaults(parsed as Record<string, unknown>);
  console.log(
    `[barrel-analysis] Success — score=${result.barrelHealthScore} ` +
      `issues=${result.issues.length} critical=${result.criticalIssues}`
  );
  return NextResponse.json(result, { status: 200 });
}