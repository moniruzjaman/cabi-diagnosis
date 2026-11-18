#!/usr/bin/env python3
"""
Phase 5 — Enrich diseaseEngine.js DISEASES array with:
  greenList, yellowList, similarDiseases, causalType, districts, seasonality

Target: src/intelligence/diseaseEngine.js (the id-keyed 14-disease DB).
NOT src/data/cropDiseases.js — see deviation note in PR body.

The enrichment is additive: each disease object keeps ALL its existing fields.
The 6 new fields are inserted right after `nameBn:` (unique id+name+nameBn
anchor per disease). A modelLimitations comment block is appended to the
DISEASES array header.

Bangla agronomic content is authored from general Bangladesh crop-disease
knowledge (BRRI/BARI extension context). Unknown values use [] — never faked.
"""
import re
import sys

PATH = "/home/z/my-project/p5-workspace/cabi-diagnosis/src/intelligence/diseaseEngine.js"

# Per-disease enrichment. Keys must match the `id` in the file.
# causalType normalizes the pathogen class ('insect'/'pest' both map to 'pest').
ENRICH = {
    "rice_blast": {
        "greenList": ["ট্রাইসাইক্লাজোল", "আইসোপ্রোথিয়োলেন"],
        "yellowList": ["কার্বেন্ডাজিম"],
        "similarDiseases": ["sheath_blight", "rice_brown_spot"],
        "causalType": "fungal",
        "districts": ["নাটোর", "বগুড়া", "রাজশাহী", "নওগাঁ"],
        "seasonality": ["মাঘ", "ফাল্গুন", "চৈত্র"],
    },
    "bacterial_leaf_blight": {
        "greenList": ["কপার অক্সিক্লোরাইড", "স্ট্রেপটোসাইক্লিন"],
        "yellowList": ["কপার হাইড্রক্সাইড"],
        "similarDiseases": ["rice_brown_spot", "rice_blast"],
        "causalType": "bacterial",
        "districts": ["কুড়িগ্রাম", "রংপুর", "নীলফামারী", "টাঙ্গাইল"],
        "seasonality": ["আষাঢ়", "ভাদ্র", "আশ্বিন"],
    },
    "sheath_blight": {
        "greenList": ["হেক্সাকোনাজোল", "ভ্যালিডামাইসিন"],
        "yellowList": ["কার্বেন্ডাজিম"],
        "similarDiseases": ["rice_blast", "rice_brown_spot"],
        "causalType": "fungal",
        "districts": ["দিনাজপুর", "বগুড়া", "যশোর", "কুমিল্লা"],
        "seasonality": ["ভাদ্র", "আশ্বিন", "কার্তিক"],
    },
    "rice_brown_spot": {
        "greenList": ["ম্যানকোজেব", "প্রোপিকোনাজোল"],
        "yellowList": ["কার্বেন্ডাজিম"],
        "similarDiseases": ["rice_blast", "sheath_blight"],
        "causalType": "fungal",
        "districts": ["রাজশাহী", "নাটোর", "নওগাঁ", "চাঁপাইনবাবগঞ্জ"],
        "seasonality": ["ভাদ্র", "আশ্বিন", "অগ্রহায়ণ"],
    },
    "wheat_rust": {
        "greenList": ["প্রোপিকোনাজোল", "টেবুকোনাজোল"],
        "yellowList": ["ট্রায়াডিমেফন"],
        "similarDiseases": ["powdery_mildew"],
        "causalType": "fungal",
        "districts": ["দিনাজপুর", "রংপুর", "বগুড়া", "রাজশাহী"],
        "seasonality": ["মাঘ", "ফাল্গুন", "চৈত্র"],
    },
    "powdery_mildew": {
        "greenList": ["সালফার (গন্ধক)", "ডাইনোক্যাপ"],
        "yellowList": ["ট্রায়াডিমেফন", "মাইক্লোবিউটানিল"],
        "similarDiseases": ["wheat_rust", "chili_anthracnose"],
        "causalType": "fungal",
        "districts": ["দিনাজপুর", "বগুড়া", "যশোর", "নওগাঁ"],
        "seasonality": ["মাঘ", "ফাল্গুন", "চৈত্র"],
    },
    "jute_stem_rot": {
        "greenList": ["কার্বেন্ডাজিম", "ম্যানকোজেব"],
        "yellowList": ["কপার অক্সিক্লোরাইড"],
        "similarDiseases": ["brinjal_phomopsis"],
        "causalType": "fungal",
        "districts": ["ফরিদপুর", "টাঙ্গাইল", "যশোর", "মানিকগঞ্জ"],
        "seasonality": ["জ্যৈষ্ঠ", "আষাঢ়", "ভাদ্র"],
    },
    "potato_late_blight": {
        "greenList": ["মেটাল্যাক্সিল+ম্যানকোজেব", "কপার হাইড্রক্সাইড"],
        "yellowList": ["ডাইমেথোমর্ফ"],
        "similarDiseases": ["tomato_early_blight"],
        "causalType": "fungal",
        "districts": ["মুন্সিগঞ্জ", "রংপুর", "বগুড়া", "নীলফামারী"],
        "seasonality": ["অগ্রহায়ণ", "পৌষ", "মাঘ"],
    },
    "tomato_early_blight": {
        "greenList": ["ম্যানকোজেব", "ক্লোরোথালোনিল", "আইপ্রোডিয়ন"],
        "yellowList": ["কার্বেন্ডাজিম"],
        "similarDiseases": ["potato_late_blight", "mustard_alternaria"],
        "causalType": "fungal",
        "districts": ["বগুড়া", "রংপুর", "যশোর", "কুমিল্লা"],
        "seasonality": ["অগ্রহায়ণ", "পৌষ", "মাঘ", "ফাল্গুন"],
    },
    "chili_anthracnose": {
        "greenList": ["ম্যানকোজেব", "অ্যাজক্সিস্ট্রোবিন", "কার্বেন্ডাজিম"],
        "yellowList": ["কপার অক্সিক্লোরাইড"],
        "similarDiseases": ["powdery_mildew", "tomato_early_blight"],
        "causalType": "fungal",
        "districts": ["বগুড়া", "রংপুর", "নওগাঁ", "রাজশাহী"],
        "seasonality": ["চৈত্র", "বৈশাখ", "জ্যৈষ্ঠ"],
    },
    "mustard_alternaria": {
        "greenList": ["ম্যানকোজেব", "ক্লোরোথালোনিল"],
        "yellowList": ["কার্বেন্ডাজিম"],
        "similarDiseases": ["tomato_early_blight", "onion_purple_blotch"],
        "causalType": "fungal",
        "districts": ["দিনাজপুর", "বগুড়া", "যশোর", "রাজশাহী"],
        "seasonality": ["মাঘ", "ফাল্গুন", "চৈত্র"],
    },
    "onion_purple_blotch": {
        "greenList": ["ম্যানকোজেব", "ক্লোরোথালোনিল", "আইপ্রোডিয়ন"],
        "yellowList": ["কার্বেন্ডাজিম"],
        "similarDiseases": ["mustard_alternaria", "tomato_early_blight"],
        "causalType": "fungal",
        "districts": ["পাবনা", "যশোর", "রাজশাহী", "ফরিদপুর"],
        "seasonality": ["অগ্রহায়ণ", "পৌষ", "মাঘ"],
    },
    "maize_downy_mildew": {
        "greenList": ["মেটাল্যাক্সিল", "ম্যানকোজেব"],
        "yellowList": ["কার্বেন্ডাজিম"],
        "similarDiseases": ["powdery_mildew"],
        "causalType": "fungal",
        "districts": ["দিনাজপুর", "রংপুর", "বগুড়া", "কুড়িগ্রাম"],
        "seasonality": ["বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়"],
    },
    "brinjal_phomopsis": {
        "greenList": ["কার্বেন্ডাজিম", "ম্যানকোজেব", "কপার অক্সিক্লোরাইড"],
        "yellowList": ["ক্লোরোথালোনিল"],
        "similarDiseases": ["jute_stem_rot", "chili_anthracnose"],
        "causalType": "fungal",
        "districts": ["বগুড়া", "রংপুর", "যশোর", "নওগাঁ"],
        "seasonality": ["বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়", "ভাদ্র"],
    },
}


def fmt_arr(items, indent="    "):
    """Format a Python list of strings as a JS array literal (single-line if short)."""
    if not items:
        return "[]"
    inner = ", ".join('"%s"' % s for s in items)
    line = "[%s]" % inner
    return line


def build_fields_block(e):
    lines = []
    lines.append('    greenList: %s,' % fmt_arr(e["greenList"]))
    lines.append('    yellowList: %s,' % fmt_arr(e["yellowList"]))
    lines.append('    similarDiseases: %s,' % fmt_arr(e["similarDiseases"]))
    lines.append('    causalType: "%s",' % e["causalType"])
    lines.append('    districts: %s,' % fmt_arr(e["districts"]))
    lines.append('    seasonality: %s,' % fmt_arr(e["seasonality"]))
    return "\n".join(lines)


def main():
    with open(PATH, "r", encoding="utf-8") as f:
        src = f.read()

    # 1) Append the Phase 5 modelLimitations note to the DISEASES header comment.
    #    Anchor: the line right before `/** @type {import('./types.js').DiseaseInfo[]} */`
    header_marker = "/** @type {import('./types.js').DiseaseInfo[]} */"
    header_note = (
        "// ────────────────────────────────────────────────────────────\n"
        "// Phase 5 enrichment (optional fields, additive — original fields kept):\n"
        "//   greenList    — Bangla names of curative treatments safe for this disease\n"
        "//   yellowList   — treatments requiring caution (resistance/PHI/toxicity)\n"
        "//   similarDiseases — disease ids with overlapping symptoms (differential dx)\n"
        "//   causalType   — 'fungal'|'bacterial'|'viral'|'pest'|'abiotic'\n"
        "//   districts    — Bangla district names where the disease is prevalent\n"
        "//   seasonality  — Bangla months (বৈশাখ..চৈত্র) of peak risk\n"
        "// modelLimitations: greenList/yellowList are general Bangladesh agronomic\n"
        "//   guidance and do NOT replace the registered-product pesticide registry\n"
        "//   (src/data/pesticideRegistry.js) or MoA stewardship (moaStewardship.js).\n"
        "//   districts are broad prevalence zones (not exhaustive); seasonality\n"
        "//   reflects typical peak-risk months, not a forecast. Unknown values are []\n"
        "//   (never fabricated). Content authored from general BRRI/BARI knowledge.\n"
    )
    if "Phase 5 enrichment (optional fields" not in src:
        src = src.replace(header_marker, header_note + header_marker, 1)

    # 2) For each disease, insert the 6 fields right after its nameBn line.
    #    Anchor: the unique 3-line block id/name/nameBn.
    inserted = 0
    for did, e in ENRICH.items():
        # Build a regex matching: `    id: "DID",\n    name: "...",\n    nameBn: "...",`
        # We capture the nameBn value to keep the anchor unique and re-emit it.
        pattern = re.compile(
            r'(    id: "%s",\n    name: "[^"]*",\n    nameBn: "[^"]*",)' % re.escape(did)
        )
        block = build_fields_block(e)
        new_src, n = pattern.subn(lambda m: m.group(1) + "\n" + block, src, count=1)
        if n != 1:
            print("ERROR: could not anchor disease id=%s (matched %d)" % (did, n), file=sys.stderr)
            return 1
        src = new_src
        inserted += 1

    with open(PATH, "w", encoding="utf-8") as f:
        f.write(src)
    print("Enriched %d diseases in %s" % (inserted, PATH))
    return 0


if __name__ == "__main__":
    sys.exit(main())
