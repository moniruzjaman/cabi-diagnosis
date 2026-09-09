#!/usr/bin/env python3
"""Build unified crop treatment database from source CSVs."""
import csv, json, re
from pathlib import Path

OUT = Path(__file__).parent

# IRAC data - custom format
irac_data = []
with open(OUT / "irac_moa.csv", 'r', encoding='utf-8-sig') as f:
    for line in f.readlines()[1:]:
        line = line.strip()
        if not line: continue
        parts = line.split(',""')
        cleaned = []
        for i, p in enumerate(parts):
            p = p.strip()
            if i == 0: p = p.lstrip('"')
            if i == len(parts)-1: p = p.rstrip('""')
            cleaned.append(p.strip('"').strip())
        if len(cleaned) >= 6:
            irac_data.append({
                'moa_number_group': cleaned[0],
                'sub_group': cleaned[1],
                'active_ingredients': cleaned[2],
                'target_pests_lifecycle': cleaned[3],
                'rotation_window_sequence': cleaned[4],
                'systematic_contacticide_spray_time': cleaned[5]
            })

# FRAC data
frac_data = []
with open(OUT / "frac_moa.csv", 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader)
    for row in reader:
        if len(row) >= 5:
            frac_data.append({
                'frac_group': row[0].strip(),
                'active_ingredients': row[1].strip(),
                'target_diseases': row[2].strip(),
                'rotation_notes': row[3].strip(),
                'mix_compatibility': row[4].strip()
            })

# Products data
products = []
with open(OUT / "products.csv", 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader)
    for row in reader:
        if len(row) >= 7:
            products.append({
                'type': row[0].strip(),
                'common_name': row[1].strip(),
                'trade_name': row[2].strip(),
                'registration_no': row[3].strip(),
                'registration_holder': row[4].strip(),
                'recommended_crops': row[5].strip(),
                'recommended_pests': row[6].strip(),
                'dosage_rate_per_ha': row[7].strip() if len(row) > 7 else ''
            })

database = {
    'metadata': {
        'name': 'Crop Treatment Chemical Database',
        'version': '1.0.0',
        'description': 'Unified offline database for crop protection chemicals',
        'total_products': len(products),
        'total_irac_entries': len(irac_data),
        'total_frac_entries': len(frac_data)
    },
    'moa_insecticide': irac_data,
    'moa_fungicide': frac_data,
    'products': products
}

# Full JSON
with open(OUT / 'unified_database.json', 'w', encoding='utf-8') as f:
    json.dump(database, f, ensure_ascii=False, indent=2)

# Minified JSON
with open(OUT / 'unified_database.min.json', 'w', encoding='utf-8') as f:
    json.dump(database, f, ensure_ascii=False, separators=(',', ':'))

print(f"Products: {len(products)}, IRAC: {len(irac_data)}, FRAC: {len(frac_data)}")
print(f"Full: {OUT/'unified_database.json'}, Min: {OUT/'unified_database.min.json'}")