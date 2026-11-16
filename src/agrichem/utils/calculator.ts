import { ChemicalProduct, DosageInput, DosageResult } from '../types';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const fmtNum = (v: number | string, lang: 'en' | 'bn'): string =>
  lang === 'bn' ? String(v).replace(/[0-9]/g, (w) => BN_DIGITS[+w]) : String(v);

export function convertAreaToHectares(value: number, unit: DosageInput['areaUnit']): number {
  switch (unit) {
    case 'hectare':
      return value;
    case 'acre':
      return value * 0.404686;
    case 'bigha':
      // 1 standard bigha ≈ 0.13378 hectare (≈ 0.3305 acre)
      return value * 0.13378;
    case 'katha':
      // 20 katha = 1 bigha
      return (value / 20) * 0.13378;
    case 'sqm':
      return value / 10000;
    default:
      return value;
  }
}

export function convertHectaresToAcres(ha: number): number {
  return ha * 2.47105;
}

export interface ParsedDosage {
  type: 'ratePerHa' | 'concentrationPerLitre' | 'seedTreatment' | 'tablets' | 'lures';
  value: number; // numeric value
  unit: 'L' | 'ml' | 'Kg' | 'gm' | 'tablets' | 'lures';
  rawString: string;
}

export function parseDosageString(dosageStr: string): ParsedDosage {
  const clean = dosageStr.trim().toLowerCase();

  // Concentration pattern like: "1 ml/Litre", "2 gm/litre", "0.5 ml/l"
  const concMatch = clean.match(/([\d.]+)\s*(ml|gm|g|mg)\s*\/\s*(?:litre|lt|l)/i);
  if (concMatch) {
    const val = parseFloat(concMatch[1]);
    const u = concMatch[2].toLowerCase();
    const unit = u === 'ml' ? 'ml' : 'gm';
    return {
      type: 'concentrationPerLitre',
      value: val,
      unit,
      rawString: dosageStr
    };
  }

  // Tablets pattern: "4 tables/1000 kg"
  if (clean.includes('table') || clean.includes('tablet')) {
    const tabMatch = clean.match(/([\d.]+)/);
    return {
      type: 'tablets',
      value: tabMatch ? parseFloat(tabMatch[1]) : 4,
      unit: 'tablets',
      rawString: dosageStr
    };
  }

  // Lures pattern: "70 lures"
  if (clean.includes('lure')) {
    const lureMatch = clean.match(/([\d.]+)/);
    return {
      type: 'lures',
      value: lureMatch ? parseFloat(lureMatch[1]) : 70,
      unit: 'lures',
      rawString: dosageStr
    };
  }

  // Seed treatment: "2 gm/kg seed"
  if (clean.includes('seed')) {
    const seedMatch = clean.match(/([\d.]+)\s*(gm|g|ml)/i);
    return {
      type: 'seedTreatment',
      value: seedMatch ? parseFloat(seedMatch[1]) : 2,
      unit: seedMatch && seedMatch[2].toLowerCase() === 'ml' ? 'ml' : 'gm',
      rawString: dosageStr
    };
  }

  // Rate per hectare (e.g. "1.00 Litre", "500 ml", "2.20 Kg", "25.00 Kg", "60 gm")
  const rateMatch = clean.match(/([\d.]+)\s*(litre|lt|l|ml|kg|gm|g)/i);
  if (rateMatch) {
    const val = parseFloat(rateMatch[1]);
    const u = rateMatch[2].toLowerCase();
    let unit: 'L' | 'ml' | 'Kg' | 'gm' = 'L';
    if (u === 'ml') unit = 'ml';
    else if (u === 'kg') unit = 'Kg';
    else if (u === 'gm' || u === 'g') unit = 'gm';
    else unit = 'L';

    return {
      type: 'ratePerHa',
      value: val,
      unit,
      rawString: dosageStr
    };
  }

  // Default fallback
  return {
    type: 'ratePerHa',
    value: 1,
    unit: 'L',
    rawString: dosageStr
  };
}

export function calculateDosage(product: ChemicalProduct, input: DosageInput, lang: 'en' | 'bn' = 'en'): DosageResult {
  const bn = lang === 'bn';
  const ha = convertAreaToHectares(input.areaValue, input.areaUnit);
  const acres = convertHectaresToAcres(ha);
  const sprayVolPerHa = input.sprayVolumePerHaL || product.waterVolumeLPerHa || 500;
  const totalWater = Math.round(ha * sprayVolPerHa);
  const tankVol = input.tankVolumeL || 16;
  const numberOfTanks = Math.max(1, Math.round((totalWater / tankVol) * 10) / 10);

  const parsed = parseDosageString(product.dosageRate);

  let totalChemicalNeeded = '';
  let chemicalPerTank = '';
  let notes = '';

  if (parsed.type === 'concentrationPerLitre') {
    const totalAmount = parsed.value * totalWater;
    const perTankAmount = parsed.value * tankVol;

    if (parsed.unit === 'ml') {
      if (totalAmount >= 1000) {
        totalChemicalNeeded = bn
          ? `${fmtNum((totalAmount / 1000).toFixed(2), lang)} লিটার (${fmtNum(Math.round(totalAmount), lang)} মিলি)`
          : `${(totalAmount / 1000).toFixed(2)} Litres (${Math.round(totalAmount)} ml)`;
      } else {
        totalChemicalNeeded = `${fmtNum(Math.round(totalAmount), lang)} মিলি`;
      }
      chemicalPerTank = bn
        ? `${fmtNum(perTankAmount.toFixed(1), lang)} মিলি প্রতি ${fmtNum(tankVol, lang)} লিটার ট্যাংকে`
        : `${perTankAmount.toFixed(1)} ml per ${tankVol}L tank`;
    } else {
      if (totalAmount >= 1000) {
        totalChemicalNeeded = bn
          ? `${fmtNum((totalAmount / 1000).toFixed(2), lang)} কেজি (${fmtNum(Math.round(totalAmount), lang)} গ্রাম)`
          : `${(totalAmount / 1000).toFixed(2)} Kg (${Math.round(totalAmount)} gm)`;
      } else {
        totalChemicalNeeded = `${fmtNum(Math.round(totalAmount), lang)} গ্রাম`;
      }
      chemicalPerTank = bn
        ? `${fmtNum(perTankAmount.toFixed(1), lang)} গ্রাম প্রতি ${fmtNum(tankVol, lang)} লিটার ট্যাংকে`
        : `${perTankAmount.toFixed(1)} grams per ${tankVol}L tank`;
    }
    notes = bn
      ? `লেবেল অনুযায়ী ঘনত্ব ${fmtNum(parsed.value, lang)} ${parsed.unit === 'ml' ? 'মিলি' : 'গ্রাম'}/লিটার পানি হিসাব করে মোট ${fmtNum(totalWater, lang)} লিটার স্প্রে ভলিউমের জন্য নির্ধারিত।`
      : `Calculated at label concentration of ${parsed.value} ${parsed.unit}/L of water across ${totalWater} Litres total spray volume.`;
  } else if (parsed.type === 'ratePerHa') {
    const totalAmt = parsed.value * ha;
    const perTankAmt = totalAmt / (totalWater / tankVol);

    if (parsed.unit === 'L' || parsed.unit === 'ml') {
      const inMl = parsed.unit === 'L' ? totalAmt * 1000 : totalAmt;
      const tankMl = parsed.unit === 'L' ? perTankAmt * 1000 : perTankAmt;

      if (inMl >= 1000) {
        totalChemicalNeeded = bn
          ? `${fmtNum((inMl / 1000).toFixed(2), lang)} লিটার (${fmtNum(Math.round(inMl), lang)} মিলি)`
          : `${(inMl / 1000).toFixed(2)} Litres (${Math.round(inMl)} ml)`;
      } else {
        totalChemicalNeeded = `${fmtNum(Math.round(inMl), lang)} মিলি`;
      }
      chemicalPerTank = bn
        ? `${fmtNum(tankMl.toFixed(1), lang)} মিলি প্রতি ${fmtNum(tankVol, lang)} লিটার ট্যাংকে`
        : `${tankMl.toFixed(1)} ml per ${tankVol}L tank`;
    } else {
      const inGm = parsed.unit === 'Kg' ? totalAmt * 1000 : totalAmt;
      const tankGm = parsed.unit === 'Kg' ? perTankAmt * 1000 : perTankAmt;

      if (inGm >= 1000) {
        totalChemicalNeeded = bn
          ? `${fmtNum((inGm / 1000).toFixed(2), lang)} কেজি (${fmtNum(Math.round(inGm), lang)} গ্রাম)`
          : `${(inGm / 1000).toFixed(2)} Kg (${Math.round(inGm)} gm)`;
      } else {
        totalChemicalNeeded = `${fmtNum(Math.round(inGm), lang)} গ্রাম`;
      }
      chemicalPerTank = bn
        ? `${fmtNum(tankGm.toFixed(1), lang)} গ্রাম প্রতি ${fmtNum(tankVol, lang)} লিটার ট্যাংকে`
        : `${tankGm.toFixed(1)} grams per ${tankVol}L tank`;
    }
    notes = bn
      ? `নিবন্ধিত মাত্রা ${fmtNum(parsed.value, lang)} ${parsed.unit}/হেক্টর এবং প্রতি হেক্টরে ${fmtNum(input.sprayVolumePerHaL || 500, lang)} লিটার পানি কভারেজ ধরে হিসাব করা হয়েছে।`
      : `Based on registered rate of ${parsed.value} ${parsed.unit}/ha calibrated for ${input.sprayVolumePerHaL || 500} L/ha water coverage.`;
  } else if (parsed.type === 'tablets') {
    const estimatedKgGrain = ha * 4000; // estimated 4 tons/ha
    const totalTabs = Math.round((estimatedKgGrain / 1000) * parsed.value);
    totalChemicalNeeded = bn
      ? `${fmtNum(totalTabs, lang)} ট্যাবলেট (প্রায় ${fmtNum((estimatedKgGrain / 1000).toFixed(1), lang)} টন ফসলের জন্য)`
      : `${totalTabs} tablets (for approx ${(estimatedKgGrain / 1000).toFixed(1)} tons harvest)`;
    chemicalPerTank = bn
      ? 'প্রযোজ্য নয় (বায়ুরোধী আবরণে ধূমীকরণ ট্যাবলেট)'
      : 'N/A (Fumigation tablet in airtight enclosure)';
    notes = bn
      ? 'শস্য বায়ুরোধী ০.২৫ মিমি গ্যাস-প্রুফ ত্রিপলে ঘেরা রাখুন। কাগজের ট্রেতে ট্যাবলেট সাজিয়ে শস্যের মাঝে রাখুন। ৫-৭ দিন ধূমীকরণ বজায় রাখুন।'
      : 'Enclose grain under airtight 0.25mm gas tarpaulin. Place tablets in paper trays across grain mass. Maintain 5-7 days fumigation.';
  } else if (parsed.type === 'lures') {
    const totalLures = Math.round(parsed.value * ha);
    totalChemicalNeeded = bn
      ? `${fmtNum(totalLures, lang)} ফেরোমন লিউর ফাঁদ`
      : `${totalLures} pheromone lure traps`;
    chemicalPerTank = bn
      ? 'প্রযোজ্য নয় (মাঠে ফেরোমন ফাঁদ স্থাপন)'
      : 'N/A (Field pheromone trap installation)';
    notes = bn
      ? `জমির সীমানা ও গাছের আচ্ছাদনে ${fmtNum(Math.round(10000 / (parsed.value || 70)), lang)} বর্গমিটার ব্যবধানে ফাঁদ সমানভাবে স্থাপন করুন।`
      : `Space traps evenly at ${Math.round(10000 / (parsed.value || 70))} m² intervals across field borders and canopy.`;
  } else {
    totalChemicalNeeded = product.dosageRate;
    chemicalPerTank = bn
      ? 'পণ্যের লেবেলের নির্দেশনা অনুসরণ করুন'
      : 'Follow specific label guidance';
    notes = bn
      ? 'বীজ শোধন বা বিশেষ প্রয়োগের জন্য প্যাকেটের নির্দিষ্ট নির্দেশনা দেখুন।'
      : 'Review specific package directions for seed treatment or specialized application.';
  }

  return {
    convertedHa: Math.round(ha * 1000) / 1000,
    convertedAcres: Math.round(acres * 100) / 100,
    totalWaterNeededL: totalWater,
    numberOfTanks,
    totalChemicalNeeded,
    chemicalPerTank,
    notes
  };
}
