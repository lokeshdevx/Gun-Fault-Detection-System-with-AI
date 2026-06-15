import { NextRequest, NextResponse } from "next/server";

const ANALYSIS_PROMPT = `You are a certified senior firearm barrel inspection specialist with 20+ years of experience in defense armament quality control. Your task is to perform an exhaustive, forensic-level analysis of this endoscopic barrel image.

YOU MUST DETECT AND REPORT ALL OF THESE DEFECT TYPES IF PRESENT — REPORT EVERY ONE YOU SEE:
1. Pitting
2. Bulge
3. Corrosion
4. Flecking Off
5. Surface Spots
6. Cracks
7. Erosion
8. Carbon Fouling
9. Rifling Wear
10. Spot
11. Cuts
12. Ringed Barrel
13. Dent
14. Scratch / Scoring
15. Chrome Lining Damage

════════════════════════════════════════
VISUAL DETECTION RULES — READ CAREFULLY
════════════════════════════════════════

── CORROSION ──
CRITICAL: Any brown, reddish-brown, orange-brown, rust-colored, or dark amber areas on the barrel interior ARE corrosion. This is rust forming on the metal surface.
- Look for: brown patches, rust stains, orange discoloration, reddish spots, dark brown blotches
- Even faint brown tinting counts as Low severity corrosion
- Widespread brown/rust coloration = High severity corrosion
- Do NOT confuse with lighting reflections (which appear as white/bright spots)
- Corrosion often appears as irregular patches rather than uniform coloration

── PITTING ──
- Look for: small dark holes, craters, or indentations in the barrel surface
- Pits appear as dark spots or puncture-like marks on the bore surface
- Can be isolated (Low) or clustered/widespread (High)
- Different from corrosion: pitting is physical surface damage (holes), corrosion is chemical surface discoloration

── BULGE ──
- Look for: outward swelling, deformation, or asymmetric barrel wall profile
- Appears as a visible bump or protrusion in the barrel wall
- The circular bore profile becomes irregular or distorted
- Check the roundness of the bore — any deviation from perfect circle may indicate bulge

── FLECKING OFF ──
- Look for: peeling, chipping, or detachment of the barrel's protective coating or lining
- Appears as flakes, chips, or patches where surface material is missing
- Exposed bare metal beneath the coating layer
- Different from pitting: flecking is surface coating loss, pitting is metal substrate damage

── SURFACE SPOTS ──
- Look for: localized abnormal dark, brown, black, orange, gray, or metallic spots
- May indicate early corrosion, oxidation, contamination, or residue buildup
- Different from pitting: spots are discolorations without obvious surface depressions

── CRACKS ──
- Look for: linear fractures, splits, or fissures in the barrel material
- Hairline cracks require reporting
- Different from scratches: cracks often have irregular edges and depth

── EROSION ──
- Look for: gradual surface wear, roughened texture, loss of original finish
- Most common near throat or chamber areas
- Severe erosion may affect rifling definition

── CARBON FOULING ──
- Look for: black or dark gray residue deposits
- Usually irregular patches following firing residue patterns
- Different from corrosion: carbon deposits sit on the surface without rust coloration

── RIFLING WEAR ──
- Look for: rounded, smoothed, or diminished rifling lands and grooves
- Reduced definition indicates wear

── SPOT ──
- Look for: a single well-defined circular or oval mark on the barrel surface
- Distinct from Surface Spots: a Spot is one isolated, clearly defined mark, not a cluster
- May appear as a dark, light, or discolored circle — caused by impact, contamination, or localized damage
- Check size carefully: a Spot is typically 1–10mm in diameter and has a clear boundary

── CUTS ──
- Look for: sharp, well-defined incisions or gouges into the barrel surface metal
- Cuts appear as distinct, clean-edged linear or curved wounds in the bore material
- Deeper and more defined than scratches — cuts penetrate into the metal substrate, not just the surface coating
- May appear as bright-edged grooves with clear depth and sharp sidewalls
- Can be caused by improper cleaning tools, sharp foreign objects, or mechanical damage
- Different from Scratch/Scoring: cuts are deeper and have sharper, cleaner edges with visible metal displacement

── RINGED BARREL ──
- Look for: circular internal swelling around barrel circumference
- Appears as a ring-like deformation inside the bore

── DENT ──
- Look for: localized inward deformation of the barrel wall
- Causes disruption of otherwise smooth internal contour

── SCRATCH / SCORING ──
- Look for: linear grooves, scratches, or scoring marks
- Usually run parallel with the bore axis

── CHROME LINING DAMAGE ──
- Look for: peeling, cracking, flaking, or uneven chrome coating
- Exposed substrate metal may be visible

════════════════════════════════════════
SEVERITY RULES
════════════════════════════════════════

PITTING:
- Low: 1–5 isolated pits, small (<1mm diameter), less than 5% surface affected
- Medium: 6–20 pits or larger pits (1–3mm), 5–20% surface affected
- High: 20+ pits, deep or large pits (>3mm), more than 20% surface affected

BULGE:
- Low: slight wall irregularity, minor asymmetry, <0.5cm estimated size
- Medium: noticeable deformation, 0.5–2cm estimated size
- High: severe deformation >2cm, unsafe for operation, immediate action required

CORROSION:
- Low: minor brown/rust discoloration, surface oxidation only, small area <10% of visible surface
- Medium: moderate rust formation, 10–40% of visible surface affected, some pitting beginning
- High: severe rust, >40% surface affected, deep material degradation, structural risk

FLECKING OFF:
- Low: small isolated chips or flakes, minor coating loss <5% area
- Medium: moderate coating loss, 5–25% area, multiple patches
- High: extensive coating failure >25%, widespread exposure of bare metal

SURFACE SPOTS:
- Low: 1–5 isolated spots, <5% surface affected
- Medium: multiple spots covering 5–15% surface
- High: extensive spotting >15% surface

CRACKS:
- Low: single hairline crack <5mm
- Medium: multiple cracks or 5–20mm crack length
- High: major structural cracks >20mm

EROSION:
- Low: minor surface roughness
- Medium: noticeable wear affecting 10–30% of visible surface
- High: severe material degradation >30%

CARBON FOULING:
- Low: <10% visible surface affected
- Medium: 10–30% visible surface affected
- High: >30% surface affected

RIFLING WEAR:
- Low: slight rounding of rifling edges
- Medium: noticeable reduction in rifling definition
- High: severe loss of rifling geometry

SPOT:
- Low: single small spot <3mm diameter, superficial
- Medium: spot 3–7mm or multiple spots in same area
- High: large spot >7mm or deep mark affecting surface integrity

CUTS:
- Low: single shallow cut <3mm length, no significant metal displacement
- Medium: cut 3–10mm length or multiple shallow cuts, minor metal displacement visible
- High: deep cut >10mm, multiple deep cuts, or cuts affecting bore geometry and structural integrity

RINGED BARREL:
- Low: minor ring deformation
- Medium: moderate ring with visible bore distortion
- High: severe ring compromising bore integrity

DENT:
- Low: minor inward deformation, <1mm depth
- Medium: noticeable dent affecting bore profile
- High: severe dent significantly disrupting bore

SCRATCH / SCORING:
- Low: superficial scratches
- Medium: deep visible scoring
- High: extensive scoring affecting functionality

CHROME LINING DAMAGE:
- Low: <5% lining loss
- Medium: 5–25% lining loss
- High: >25% lining loss

════════════════════════════════════════
LOCATION IDENTIFICATION
════════════════════════════════════════
Estimate the approximate location of each issue as one of: "top-left", "top-right", "center", "bottom-left", "bottom-right".

════════════════════════════════════════
ANALYSIS METHODOLOGY
════════════════════════════════════════
1. Examine the ENTIRE image systematically — top, bottom, left, right, center
2. Check color variations:
   - Brown/rust tones = Corrosion
   - Black/dark gray deposits = Carbon Fouling
   - Localized dark spots without depression = Surface Spots or Spot (single mark)
3. Check surface texture:
   - Holes/craters = Pitting
   - Linear grooves = Scratch/Scoring
   - Rough degraded surface = Erosion
   - Single or multiple fractures = Cracks
   - Sharp clean-edged incisions into metal = Cuts
4. Check profile and geometry:
   - Outward swelling = Bulge
   - Ring-like internal swelling = Ringed Barrel
   - Inward deformation = Dent
5. Check coating and lining:
   - Missing coating = Flecking Off
   - Chrome layer peeling = Chrome Lining Damage
6. Check specific zones:
   - Rifling lands and grooves = Rifling Wear
7. A single image MAY have multiple defect types simultaneously — report ALL you detect
8. Be thorough — missing a defect is more dangerous than being slightly conservative
9. If you see brown/rust coloring anywhere, you MUST report Corrosion

════════════════════════════════════════
OVERALL STATUS RULES
════════════════════════════════════════
- "Safe for Use": No defects found OR only Low severity with <10% affected area
- "Maintenance Required": Any Medium severity defect, or Low severity covering >10% area
- "Immediate Replacement Required": Any High severity defect

════════════════════════════════════════
OUTPUT FORMAT
════════════════════════════════════════
Return ONLY valid JSON. No markdown. No explanation. No extra text. Exactly this schema:

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

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  try {
    const { base64, mediaType } = await req.json();

    if (!base64) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: ANALYSIS_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType || "image/jpeg",
                  data: base64,
                },
              },
              {
                type: "text",
                text: "Perform a comprehensive barrel fault inspection on this image. Return the complete JSON analysis.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json(
        { error: `Anthropic API error: ${err}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || "{}";

    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse Claude response", raw: rawText },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
