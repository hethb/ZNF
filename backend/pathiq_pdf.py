"""Server-side PDF report generation for IHC workflow summaries."""
from __future__ import annotations

import io
from typing import Any, Dict, List

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def build_ihc_report_pdf(case: Dict[str, Any], lab_name: str = "PathIQ Lab", template: str = "Default") -> bytes:
    """Render a simple clinical-style PDF from case dict (matches frontend shape)."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, title="PathIQ IHC Report")
    styles = getSampleStyleSheet()
    story: List[Any] = []

    story.append(Paragraph("<b>PathIQ IHC Scoring Report</b>", styles["Title"]))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"Lab: {lab_name} &nbsp;|&nbsp; Template: {template}", styles["Normal"]))
    story.append(Spacer(1, 16))

    def row(label: str, value: str) -> None:
        story.append(Paragraph(f"<b>{label}</b> {value}", styles["Normal"]))
        story.append(Spacer(1, 6))

    row("Case ID:", str(case.get("caseId", "")))
    row("Sample ID:", str(case.get("sampleId", "")))
    row("Tissue:", str(case.get("tissueType", "")))
    row("Stain:", str(case.get("stainType", "")))

    ai = case.get("aiAnalysis") or {}
    row("AI suggested score:", str(ai.get("suggestedScore", "—")))
    row("Confidence:", f"{ai.get('confidence', '—')}%" if ai.get("confidence") is not None else "—")

    fr = case.get("finalReview") or {}
    row("Final pathologist score:", str(fr.get("finalScore", "—")))
    row("Reviewer:", str(fr.get("reviewer", "")))
    row("Override reason:", str(fr.get("overrideReason", "")))

    dist = ai.get("intensityDistribution") or {}
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Intensity distribution</b>", styles["Heading2"]))
    for k, lab in [("zero", "0"), ("onePlus", "1+"), ("twoPlus", "2+"), ("threePlus", "3+")]:
        story.append(Paragraph(f"{lab}: {dist.get(k, 0)}%", styles["Normal"]))

    flags = ai.get("flags") or []
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Flags</b>", styles["Heading2"]))
    if not flags:
        story.append(Paragraph("None recorded.", styles["Normal"]))
    else:
        for f in flags:
            story.append(Paragraph(f"• {f.get('type', '')}: {f.get('description', '')}", styles["Normal"]))

    story.append(Spacer(1, 14))
    story.append(
        Paragraph(
            "<i>Research and workflow-support tool. Not for independent diagnosis.</i>",
            styles["Italic"],
        )
    )

    doc.build(story)
    return buf.getvalue()
