/**
 * @module data/varieties
 * @description
 * Comprehensive variety (জাত) registry for major Bangladeshi crops, sourced
 * from public BRRI / BARI / DAE release databases.
 *
 * Each variety entry includes:
 *   - id            Stable slug
 *   - name          Bengali display name
 *   - nameEn        English/transliterated name
 *   - releasedBy    "BRRI" | "BARI" | "DAE" | "BRAC" | etc.
 *   - releaseYear   Year of release (number)
 *   - duration      Days to maturity (typical)
 *   - heightCm      Average plant height in cm (where applicable)
 *   - resistance    Map of pest/disease → "R" (resistant), "MR" (moderately), "S" (susceptible), "HR" (highly resistant), "MS" (moderately susceptible)
 *   - suitableZones Array of agro-zone codes (see bangladeshDistricts.js AGRO_ZONES)
 *   - notes         Free-text growing note
 *
 * Resistance codes follow IRRI/BRRI conventions:
 *   HR = Highly Resistant, R = Resistant, MR = Moderately Resistant,
 *   MS = Moderately Susceptible, S = Susceptible, HS = Highly Susceptible
 *
 * GAP-09 + ENH-06 FIX: Replaces the previous sparse 3-crop susceptibility
 * lookup that always returned "medium" for 95% of real-world queries.
 *
 * @example
 *   import { VARIETIES, getVarietiesByCrop, lookupVariety } from '@/data/varieties';
 *   const riceVarieties = getVarietiesByCrop('rice');
 */

// ─────────────────────────────────────────────────────────────────────────────
// RICE — BRRI varieties (Bangladesh Rice Research Institute)
// Source: BRRI published variety release catalogue (public domain)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All known varieties, grouped by crop key (matches resolveCropKey in cropDiseases.js).
 * @type {Object<string, Array>}
 */
export const VARIETIES = {
  rice: [
    // ── BRRI Dhan (Modern High-Yielding) ──────────────────────────────────
    { id: 'brridhan28', name: 'বিআরআই ধান-২৮', nameEn: 'BRRI dhan28', releasedBy: 'BRRI', releaseYear: 1994, duration: 140, heightCm: 90, resistance: { blast: 'R', blb: 'MR', bph: 'S', stemBorer: 'S', sheathBlight: 'S' }, suitableZones: ['zone_a','zone_b','zone_c','zone_d'], season: 'Boro', notes: 'Popular Boro variety, fine grain' },
    { id: 'brridhan29', name: 'বিআরআই ধান-২৯', nameEn: 'BRRI dhan29', releasedBy: 'BRRI', releaseYear: 1994, duration: 160, heightCm: 95, resistance: { blast: 'MR', blb: 'S', bph: 'S', stemBorer: 'S', sheathBlight: 'S' }, suitableZones: ['zone_a','zone_b','zone_c','zone_d'], season: 'Boro', notes: 'Long-duration Boro, higher yield' },
    { id: 'brridhan50', name: 'বিআরআই ধান-৫০', nameEn: 'BRRI dhan50', releasedBy: 'BRRI', releaseYear: 2005, duration: 118, heightCm: 88, resistance: { blast: 'R', blb: 'MR', bph: 'S', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Boro', notes: 'Zinc-enriched, blast-tolerant' },
    { id: 'brridhan58', name: 'বিআরআই ধান-৫৮', nameEn: 'BRRI dhan58', releasedBy: 'BRRI', releaseYear: 2012, duration: 150, heightCm: 92, resistance: { blast: 'R', blb: 'MR', bph: 'S', stemBorer: 'S', sheathBlight: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Boro', notes: 'High-yielding Boro with good grain quality' },
    { id: 'brridhan62', name: 'বিআরআই ধান-৬২', nameEn: 'BRRI dhan62', releasedBy: 'BRRI', releaseYear: 2013, duration: 110, heightCm: 85, resistance: { blast: 'R', blb: 'R', bph: 'S', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Boro', notes: 'Zinc-biofortified, short duration' },
    { id: 'brridhan67', name: 'বিআরআই ধান-৬৭', nameEn: 'BRRI dhan67', releasedBy: 'BRRI', releaseYear: 2015, duration: 115, heightCm: 90, resistance: { blast: 'R', blb: 'R', bph: 'MR', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Boro', notes: 'Cold-tolerant, suitable for late Boro' },
    { id: 'brridhan84', name: 'বিআরআই ধান-৮৪', nameEn: 'BRRI dhan84', releasedBy: 'BRRI', releaseYear: 2017, duration: 145, heightCm: 92, resistance: { blast: 'R', blb: 'MR', bph: 'MR', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Boro', notes: 'High-yielding non-shattering Boro' },
    { id: 'brridhan89', name: 'বিআরআই ধান-৮৯', nameEn: 'BRRI dhan89', releasedBy: 'BRRI', releaseYear: 2018, duration: 150, heightCm: 95, resistance: { blast: 'R', blb: 'MR', bph: 'MR', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Boro', notes: 'Premium-quality long-grain Boro' },
    { id: 'brridhan92', name: 'বিআরআই ধান-৯২', nameEn: 'BRRI dhan92', releasedBy: 'BRRI', releaseYear: 2019, duration: 150, heightCm: 96, resistance: { blast: 'R', blb: 'R', bph: 'MR', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Boro', notes: 'Zinc-enriched, blast-resistant Boro' },
    { id: 'brridhan96', name: 'বিআরআই ধান-৯৬', nameEn: 'BRRI dhan96', releasedBy: 'BRRI', releaseYear: 2020, duration: 145, heightCm: 93, resistance: { blast: 'R', blb: 'R', bph: 'MR', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Boro', notes: 'Premium-quality, high-yield Boro' },
    // ── Aman (T. Aman) Varieties ─────────────────────────────────────────
    { id: 'brridhan11', name: 'বিআরআই ধান-১১', nameEn: 'BRRI dhan11', releasedBy: 'BRRI', releaseYear: 1980, duration: 130, heightCm: 110, resistance: { blast: 'S', blb: 'S', bph: 'MR', stemBorer: 'S', sheathBlight: 'S' }, suitableZones: ['zone_c','zone_d','zone_e','zone_f'], season: 'Aman', notes: 'Old T. Aman variety' },
    { id: 'brridhan22', name: 'বিআরআই ধান-২২', nameEn: 'BRRI dhan22', releasedBy: 'BRRI', releaseYear: 1989, duration: 135, heightCm: 105, resistance: { blast: 'MR', blb: 'MR', bph: 'S', stemBorer: 'S', sheathBlight: 'S' }, suitableZones: ['zone_c','zone_d','zone_e'], season: 'Aman', notes: 'T. Aman, mid-duration' },
    { id: 'brridhan30', name: 'বিআরআই ধান-৩০', nameEn: 'BRRI dhan30', releasedBy: 'BRRI', releaseYear: 1994, duration: 145, heightCm: 100, resistance: { blast: 'MR', blb: 'MR', bph: 'S', stemBorer: 'S', sheathBlight: 'S' }, suitableZones: ['zone_b','zone_c','zone_d','zone_e'], season: 'Aman', notes: 'Popular T. Aman' },
    { id: 'brridhan33', name: 'বিআরআই ধান-৩৩', nameEn: 'BRRI dhan33', releasedBy: 'BRRI', releaseYear: 1997, duration: 118, heightCm: 95, resistance: { blast: 'R', blb: 'MR', bph: 'S', stemBorer: 'S', sheathBlight: 'S' }, suitableZones: ['zone_b','zone_c','zone_d','zone_e'], season: 'Aman', notes: 'Short-duration T. Aman' },
    { id: 'brridhan39', name: 'বিআরআই ধান-৩৯', nameEn: 'BRRI dhan39', releasedBy: 'BRRI', releaseYear: 1999, duration: 122, heightCm: 98, resistance: { blast: 'MR', blb: 'MR', bph: 'S', stemBorer: 'S', sheathBlight: 'S' }, suitableZones: ['zone_b','zone_c','zone_d'], season: 'Aman', notes: 'Fine-grain T. Aman' },
    { id: 'brridhan49', name: 'বিআরআই ধান-৪৯', nameEn: 'BRRI dhan49', releasedBy: 'BRRI', releaseYear: 2004, duration: 138, heightCm: 105, resistance: { blast: 'MR', blb: 'R', bph: 'S', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_b','zone_c','zone_d','zone_e'], season: 'Aman', notes: 'BLB-resistant T. Aman' },
    { id: 'brridhan52', name: 'বিআরআই ধান-৫২', nameEn: 'BRRI dhan52', releasedBy: 'BRRI', releaseYear: 2007, duration: 135, heightCm: 100, resistance: { blast: 'MR', blb: 'MR', bph: 'S', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_b','zone_c','zone_d','zone_e'], season: 'Aman', notes: 'Salt-tolerant T. Aman' },
    { id: 'brridhan57', name: 'বিআরআই ধান-৫৭', nameEn: 'BRRI dhan57', releasedBy: 'BRRI', releaseYear: 2012, duration: 105, heightCm: 90, resistance: { blast: 'R', blb: 'MR', bph: 'S', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d','zone_e'], season: 'Aman', notes: 'Extra-short duration; saves water' },
    { id: 'brridhan71', name: 'বিআরআই ধান-৭১', nameEn: 'BRRI dhan71', releasedBy: 'BRRI', releaseYear: 2015, duration: 120, heightCm: 95, resistance: { blast: 'R', blb: 'MR', bph: 'MR', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_b','zone_c','zone_d','zone_e'], season: 'Aman', notes: 'Stress-tolerant T. Aman' },
    { id: 'brridhan75', name: 'বিআরআই ধান-৭৫', nameEn: 'BRRI dhan75', releasedBy: 'BRRI', releaseYear: 2016, duration: 125, heightCm: 98, resistance: { blast: 'R', blb: 'MR', bph: 'MR', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_b','zone_c','zone_d','zone_e'], season: 'Aman', notes: 'High-yield T. Aman' },
    { id: 'brridhan79', name: 'বিআরআই ধান-৭৯', nameEn: 'BRRI dhan79', releasedBy: 'BRRI', releaseYear: 2017, duration: 120, heightCm: 96, resistance: { blast: 'R', blb: 'MR', bph: 'MR', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_b','zone_c','zone_d','zone_e'], season: 'Aman', notes: 'Salt-tolerant T. Aman' },
    { id: 'brridhan87', name: 'বিআরআই ধান-৮৭', nameEn: 'BRRI dhan87', releasedBy: 'BRRI', releaseYear: 2018, duration: 115, heightCm: 92, resistance: { blast: 'R', blb: 'R', bph: 'MR', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_b','zone_c','zone_d','zone_e'], season: 'Aman', notes: 'Premium-quality T. Aman' },
    { id: 'brridhan90', name: 'বিআরআই ধান-৯০', nameEn: 'BRRI dhan90', releasedBy: 'BRRI', releaseYear: 2019, duration: 125, heightCm: 98, resistance: { blast: 'R', blb: 'MR', bph: 'MR', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_b','zone_c','zone_d','zone_e'], season: 'Aman', notes: 'High-yield non-shattering T. Aman' },
    { id: 'brridhan93', name: 'বিআরআই ধান-৯৩', nameEn: 'BRRI dhan93', releasedBy: 'BRRI', releaseYear: 2019, duration: 130, heightCm: 100, resistance: { blast: 'R', blb: 'MR', bph: 'MR', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_b','zone_c','zone_d','zone_e'], season: 'Aman', notes: 'Zinc-enriched T. Aman' },
    { id: 'brridhan100', name: 'বিআরআই ধান-১০০', nameEn: 'BRRI dhan100', releasedBy: 'BRRI', releaseYear: 2020, duration: 130, heightCm: 100, resistance: { blast: 'R', blb: 'R', bph: 'MR', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_b','zone_c','zone_d','zone_e'], season: 'Aman', notes: 'Premium-quality aromatic Aman' },
    // ── Aus Varieties ─────────────────────────────────────────────────────
    { id: 'brridhan27', name: 'বিআরআই ধান-২৭', nameEn: 'BRRI dhan27', releasedBy: 'BRRI', releaseYear: 1993, duration: 100, heightCm: 95, resistance: { blast: 'MR', blb: 'S', bph: 'S', stemBorer: 'S', sheathBlight: 'S' }, suitableZones: ['zone_a','zone_b','zone_c','zone_d'], season: 'Aus', notes: 'Popular Aus variety' },
    { id: 'brridhan42', name: 'বিআরআই ধান-৪২', nameEn: 'BRRI dhan42', releasedBy: 'BRRI', releaseYear: 2001, duration: 95, heightCm: 90, resistance: { blast: 'MR', blb: 'MR', bph: 'S', stemBorer: 'S', sheathBlight: 'S' }, suitableZones: ['zone_a','zone_b','zone_c','zone_d'], season: 'Aus', notes: 'Short-duration Aus' },
    { id: 'brridhan43', name: 'বিআরআই ধান-৪৩', nameEn: 'BRRI dhan43', releasedBy: 'BRRI', releaseYear: 2001, duration: 100, heightCm: 95, resistance: { blast: 'MR', blb: 'MR', bph: 'S', stemBorer: 'S', sheathBlight: 'S' }, suitableZones: ['zone_a','zone_b','zone_c','zone_d'], season: 'Aus', notes: 'Aus variety for upland' },
    { id: 'brridhan65', name: 'বিআরআই ধান-৬৫', nameEn: 'BRRI dhan65', releasedBy: 'BRRI', releaseYear: 2014, duration: 100, heightCm: 95, resistance: { blast: 'R', blb: 'MR', bph: 'S', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_a','zone_b','zone_c','zone_d'], season: 'Aus', notes: 'Drought-tolerant Aus' },
    { id: 'brridhan83', name: 'বিআরআই ধান-৮৩', nameEn: 'BRRI dhan83', releasedBy: 'BRRI', releaseYear: 2017, duration: 95, heightCm: 90, resistance: { blast: 'R', blb: 'MR', bph: 'S', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_a','zone_b','zone_c','zone_d'], season: 'Aus', notes: 'Premium-quality Aus' },
    { id: 'brridhan98', name: 'বিআরআই ধান-৯৮', nameEn: 'BRRI dhan98', releasedBy: 'BRRI', releaseYear: 2019, duration: 100, heightCm: 95, resistance: { blast: 'R', blb: 'R', bph: 'MR', stemBorer: 'MR', sheathBlight: 'MR' }, suitableZones: ['zone_a','zone_b','zone_c','zone_d'], season: 'Aus', notes: 'Zinc-enriched Aus' },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // POTATO — BARI varieties
  // ─────────────────────────────────────────────────────────────────────────
  potato: [
    { id: 'baritps1', name: 'বারি আলু-১ (ডায়মন্ট)', nameEn: 'BARI Alu-1 (Diamant)', releasedBy: 'BARI', releaseYear: 1990, duration: 90, heightCm: 55, resistance: { lateBlight: 'S', earlyBlight: 'MR', scab: 'MR', virus: 'MS' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'Popular processing variety; LB-susceptible' },
    { id: 'barialu7', name: 'বারি আলু-৭ (কার্ডিনাল)', nameEn: 'BARI Alu-7 (Cardinal)', releasedBy: 'BARI', releaseYear: 1993, duration: 95, heightCm: 55, resistance: { lateBlight: 'MR', earlyBlight: 'MR', scab: 'R', virus: 'MS' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'Red skin, fair late-blight tolerance' },
    { id: 'barialu8', name: 'বারি আলু-৮', nameEn: 'BARI Alu-8', releasedBy: 'BARI', releaseYear: 1994, duration: 90, heightCm: 50, resistance: { lateBlight: 'MR', earlyBlight: 'MR', scab: 'R', virus: 'MS' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'White skin, multi-purpose' },
    { id: 'barialu9', name: 'বারি আলু-৯ (আলফা)', nameEn: 'BARI Alu-9 (Alpha)', releasedBy: 'BARI', releaseYear: 1995, duration: 95, heightCm: 55, resistance: { lateBlight: 'MR', earlyBlight: 'R', scab: 'R', virus: 'MS' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'Processing & table use' },
    { id: 'barialu13', name: 'বারি আলু-১৩', nameEn: 'BARI Alu-13', releasedBy: 'BARI', releaseYear: 2000, duration: 100, heightCm: 60, resistance: { lateBlight: 'R', earlyBlight: 'R', scab: 'R', virus: 'MR' }, suitableZones: ['zone_a','zone_b'], season: 'Rabi', notes: 'Late-blight tolerant, suitable for low-input' },
    { id: 'barialu19', name: 'বারি আলু-১৯ (মেঘারিস্টা)', nameEn: 'BARI Alu-19 (Megusta)', releasedBy: 'BARI', releaseYear: 2006, duration: 95, heightCm: 55, resistance: { lateBlight: 'MR', earlyBlight: 'MR', scab: 'R', virus: 'MS' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'Higher-yielding processing variety' },
    { id: 'barialu22', name: 'বারি আলু-২২', nameEn: 'BARI Alu-22', releasedBy: 'BARI', releaseYear: 2010, duration: 90, heightCm: 50, resistance: { lateBlight: 'R', earlyBlight: 'R', scab: 'R', virus: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'Stress-tolerant table variety' },
    { id: 'barialu25', name: 'বারি আলু-২৫', nameEn: 'BARI Alu-25', releasedBy: 'BARI', releaseYear: 2012, duration: 95, heightCm: 55, resistance: { lateBlight: 'R', earlyBlight: 'R', scab: 'R', virus: 'MR' }, suitableZones: ['zone_a','zone_b'], season: 'Rabi', notes: 'Late-blight resistant, high yield' },
    { id: 'barialu28', name: 'বারি আলু-২৮', nameEn: 'BARI Alu-28', releasedBy: 'BARI', releaseYear: 2015, duration: 95, heightCm: 55, resistance: { lateBlight: 'R', earlyBlight: 'MR', scab: 'R', virus: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'Heat-tolerant, off-season suitable' },
    { id: 'barialu41', name: 'বারি আলু-৪১', nameEn: 'BARI Alu-41', releasedBy: 'BARI', releaseYear: 2018, duration: 95, heightCm: 55, resistance: { lateBlight: 'HR', earlyBlight: 'R', scab: 'R', virus: 'R' }, suitableZones: ['zone_a','zone_b'], season: 'Rabi', notes: 'Highly late-blight resistant' },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // TOMATO — BARI varieties
  // ─────────────────────────────────────────────────────────────────────────
  tomato: [
    { id: 'baritomato2', name: 'বারি টমেটো-২', nameEn: 'BARI Tomato-2', releasedBy: 'BARI', releaseYear: 1992, duration: 95, heightCm: 90, resistance: { earlyBlight: 'MR', lateBlight: 'S', leafCurlVirus: 'S', bacterialWilt: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d','zone_e'], season: 'Rabi', notes: 'Popular round tomato; LB-susceptible' },
    { id: 'baritomato3', name: 'বারি টমেটো-৩', nameEn: 'BARI Tomato-3', releasedBy: 'BARI', releaseYear: 1992, duration: 95, heightCm: 95, resistance: { earlyBlight: 'MR', lateBlight: 'S', leafCurlVirus: 'MR', bacterialWilt: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'Oval-shape, good transport tolerance' },
    { id: 'baritomato4', name: 'বারি টমেটো-৪', nameEn: 'BARI Tomato-4', releasedBy: 'BARI', releaseYear: 1993, duration: 100, heightCm: 100, resistance: { earlyBlight: 'R', lateBlight: 'MR', leafCurlVirus: 'MR', bacterialWilt: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d','zone_e'], season: 'Rabi', notes: 'Larger fruit, tolerant to early blight' },
    { id: 'baritomato5', name: 'বারি টমেটো-৫', nameEn: 'BARI Tomato-5', releasedBy: 'BARI', releaseYear: 1995, duration: 95, heightCm: 95, resistance: { earlyBlight: 'MR', lateBlight: 'S', leafCurlVirus: 'R', bacterialWilt: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'ToLCV-resistant summer tomato' },
    { id: 'baritomato8', name: 'বারি টমেটো-৮', nameEn: 'BARI Tomato-8', releasedBy: 'BARI', releaseYear: 2005, duration: 95, heightCm: 95, resistance: { earlyBlight: 'MR', lateBlight: 'MR', leafCurlVirus: 'R', bacterialWilt: 'R' }, suitableZones: ['zone_a','zone_b','zone_d','zone_e'], season: 'Rabi', notes: 'Multiple-disease-resistant summer variety' },
    { id: 'baritomato9', name: 'বারি টমেটো-৯', nameEn: 'BARI Tomato-9', releasedBy: 'BARI', releaseYear: 2008, duration: 95, heightCm: 95, resistance: { earlyBlight: 'MR', lateBlight: 'MR', leafCurlVirus: 'R', bacterialWilt: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d','zone_e'], season: 'Rabi', notes: 'High-yielding summer tomato' },
    { id: 'baritomato10', name: 'বারি টমেটো-১০', nameEn: 'BARI Tomato-10', releasedBy: 'BARI', releaseYear: 2010, duration: 95, heightCm: 95, resistance: { earlyBlight: 'R', lateBlight: 'MR', leafCurlVirus: 'R', bacterialWilt: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d','zone_e'], season: 'Rabi', notes: 'Hybrid heat-tolerant' },
    { id: 'baritomato14', name: 'বারি টমেটো-১৪', nameEn: 'BARI Tomato-14', releasedBy: 'BARI', releaseYear: 2015, duration: 95, heightCm: 95, resistance: { earlyBlight: 'R', lateBlight: 'R', leafCurlVirus: 'R', bacterialWilt: 'R' }, suitableZones: ['zone_a','zone_b','zone_d','zone_e'], season: 'Rabi', notes: 'Multi-disease-resistant, recommended' },
    { id: 'baritomato15', name: 'বারি টমেটো-১৫', nameEn: 'BARI Tomato-15', releasedBy: 'BARI', releaseYear: 2016, duration: 95, heightCm: 95, resistance: { earlyBlight: 'R', lateBlight: 'MR', leafCurlVirus: 'R', bacterialWilt: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'Summer hybrid, heat tolerant' },
    { id: 'baritomato17', name: 'বারি টমেটো-১৭', nameEn: 'BARI Tomato-17', releasedBy: 'BARI', releaseYear: 2018, duration: 90, heightCm: 95, resistance: { earlyBlight: 'R', lateBlight: 'R', leafCurlVirus: 'R', bacterialWilt: 'R' }, suitableZones: ['zone_a','zone_b','zone_d','zone_e'], season: 'Rabi', notes: 'Recommended for low-input growers' },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // WHEAT — BARI varieties
  // ─────────────────────────────────────────────────────────────────────────
  wheat: [
    { id: 'barigom24', name: 'বারি গম-২৪', nameEn: 'BARI Gom-24', releasedBy: 'BARI', releaseYear: 2005, duration: 110, heightCm: 85, resistance: { leafRust: 'MR', stripeRust: 'MR', blast: 'S', leafBlotch: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'High-yielding, popular feed wheat' },
    { id: 'barigom25', name: 'বারি গম-২৫', nameEn: 'BARI Gom-25', releasedBy: 'BARI', releaseYear: 2008, duration: 108, heightCm: 80, resistance: { leafRust: 'R', stripeRust: 'MR', blast: 'S', leafBlotch: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'Leaf-rust resistant' },
    { id: 'barigom26', name: 'বারি গম-২৬', nameEn: 'BARI Gom-26', releasedBy: 'BARI', releaseYear: 2010, duration: 108, heightCm: 80, resistance: { leafRust: 'R', stripeRust: 'R', blast: 'S', leafBlotch: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'Multi-rust resistant' },
    { id: 'barigom30', name: 'বারি গম-৩০', nameEn: 'BARI Gom-30', releasedBy: 'BARI', releaseYear: 2012, duration: 108, heightCm: 80, resistance: { leafRust: 'R', stripeRust: 'R', blast: 'MR', leafBlotch: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'Blast-tolerant, heat-tolerant' },
    { id: 'barigom32', name: 'বারি গম-৩২', nameEn: 'BARI Gom-32', releasedBy: 'BARI', releaseYear: 2014, duration: 108, heightCm: 80, resistance: { leafRust: 'R', stripeRust: 'R', blast: 'R', leafBlotch: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'Blast-resistant, recommended for blast-prone areas' },
    { id: 'barigom33', name: 'বারি গম-৩৩', nameEn: 'BARI Gom-33', releasedBy: 'BARI', releaseYear: 2015, duration: 105, heightCm: 78, resistance: { leafRust: 'R', stripeRust: 'R', blast: 'R', leafBlotch: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'Zinc-biofortified, blast-resistant' },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // MAIZE — BARI varieties
  // ─────────────────────────────────────────────────────────────────────────
  maize: [
    { id: 'baribhutta5', name: 'বারি ভুট্টা-৫', nameEn: 'BARI Bhutta-5', releasedBy: 'BARI', releaseYear: 1996, duration: 110, heightCm: 200, resistance: { downyMildew: 'MR', leafBlight: 'MR', stalkRot: 'S' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'Open-pollinated feed maize' },
    { id: 'baribhutta7', name: 'বারি ভুট্টা-৭', nameEn: 'BARI Bhutta-7', releasedBy: 'BARI', releaseYear: 2002, duration: 110, heightCm: 220, resistance: { downyMildew: 'MR', leafBlight: 'R', stalkRot: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'Higher-yielding hybrid' },
    { id: 'baribhutta9', name: 'বারি ভুট্টা-৯', nameEn: 'BARI Bhutta-9', releasedBy: 'BARI', releaseYear: 2007, duration: 110, heightCm: 220, resistance: { downyMildew: 'R', leafBlight: 'R', stalkRot: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'High-yielding hybrid, multi-disease resistant' },
    { id: 'baribhutta12', name: 'বারি ভুট্টা-১২', nameEn: 'BARI Bhutta-12', releasedBy: 'BARI', releaseYear: 2015, duration: 110, heightCm: 230, resistance: { downyMildew: 'R', leafBlight: 'R', stalkRot: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'QPM (quality protein maize) hybrid' },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // MUSTARD — BARI varieties
  // ─────────────────────────────────────────────────────────────────────────
  mustard: [
    { id: 'barisharisha9', name: 'বারি সরিষা-৯', nameEn: 'BARI Sarisha-9', releasedBy: 'BARI', releaseYear: 1992, duration: 80, heightCm: 90, resistance: { alternaria: 'MR', whiteRust: 'MR', aphid: 'S' }, suitableZones: ['zone_a','zone_b','zone_d','zone_e'], season: 'Rabi', notes: 'Popular high-yielding mustard' },
    { id: 'barisharisha11', name: 'বারি সরিষা-১১', nameEn: 'BARI Sarisha-11', releasedBy: 'BARI', releaseYear: 1996, duration: 80, heightCm: 90, resistance: { alternaria: 'MR', whiteRust: 'MR', aphid: 'S' }, suitableZones: ['zone_a','zone_b','zone_d','zone_e'], season: 'Rabi', notes: 'Higher oil content' },
    { id: 'barisharisha14', name: 'বারি সরিষা-১৪', nameEn: 'BARI Sarisha-14', releasedBy: 'BARI', releaseYear: 2004, duration: 75, heightCm: 85, resistance: { alternaria: 'R', whiteRust: 'MR', aphid: 'S' }, suitableZones: ['zone_a','zone_b','zone_d'], season: 'Rabi', notes: 'Alternaria-tolerant, short duration' },
    { id: 'barisharisha15', name: 'বারি সরিষা-১৫', nameEn: 'BARI Sarisha-15', releasedBy: 'BARI', releaseYear: 2008, duration: 78, heightCm: 88, resistance: { alternaria: 'R', whiteRust: 'R', aphid: 'S' }, suitableZones: ['zone_a','zone_b','zone_d','zone_e'], season: 'Rabi', notes: 'Multi-disease tolerant' },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // BRINJAL (EGGPLANT) — BARI varieties
  // ─────────────────────────────────────────────────────────────────────────
  brinjal: [
    { id: 'baribegun5', name: 'বারি বেগুন-৫', nameEn: 'BARI Begun-5', releasedBy: 'BARI', releaseYear: 1996, duration: 90, heightCm: 80, resistance: { bacterialWilt: 'MR', fruitBorer: 'S', phomopsis: 'S' }, suitableZones: ['zone_a','zone_b','zone_d','zone_e'], season: 'Kharif', notes: 'Long-fruit brinjal' },
    { id: 'baribegun6', name: 'বারি বেগুন-৬', nameEn: 'BARI Begun-6', releasedBy: 'BARI', releaseYear: 1996, duration: 90, heightCm: 80, resistance: { bacterialWilt: 'R', fruitBorer: 'S', phomopsis: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d','zone_e'], season: 'Kharif', notes: 'Bacterial-wilt resistant' },
    { id: 'baribegun8', name: 'বারি বেগুন-৮', nameEn: 'BARI Begun-8', releasedBy: 'BARI', releaseYear: 2002, duration: 95, heightCm: 85, resistance: { bacterialWilt: 'R', fruitBorer: 'S', phomopsis: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d','zone_e'], season: 'Kharif', notes: 'Round-fruit, multi-purpose' },
    { id: 'baribegun11', name: 'বারি বেগুন-১১', nameEn: 'BARI Begun-11', releasedBy: 'BARI', releaseYear: 2011, duration: 95, heightCm: 90, resistance: { bacterialWilt: 'R', fruitBorer: 'MR', phomopsis: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d','zone_e'], season: 'Kharif', notes: 'Bt-brinjal hybrid; resistant to fruit-shoot borer' },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // CHILI (PEPPER) — BARI varieties
  // ─────────────────────────────────────────────────────────────────────────
  chili: [
    { id: 'barimirch1', name: 'বারি মরিচ-১', nameEn: 'BARI Morich-1', releasedBy: 'BARI', releaseYear: 1995, duration: 130, heightCm: 80, resistance: { anthracnose: 'MR', leafCurlVirus: 'S', powderyMildew: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d','zone_e'], season: 'Kharif', notes: 'Hot chili, popular' },
    { id: 'barimirch2', name: 'বারি মরিচ-২', nameEn: 'BARI Morich-2', releasedBy: 'BARI', releaseYear: 2001, duration: 130, heightCm: 80, resistance: { anthracnose: 'MR', leafCurlVirus: 'MR', powderyMildew: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d','zone_e'], season: 'Kharif', notes: 'Higher-yielding chili' },
    { id: 'barimirch3', name: 'বারি মরিচ-৩', nameEn: 'BARI Morich-3', releasedBy: 'BARI', releaseYear: 2010, duration: 130, heightCm: 85, resistance: { anthracnose: 'R', leafCurlVirus: 'MR', powderyMildew: 'MR' }, suitableZones: ['zone_a','zone_b','zone_d','zone_e'], season: 'Kharif', notes: 'Anthracnose-resistant' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all varieties for a given crop.
 * Accepts either an English crop key ("rice", "potato") or a Bengali display
 * name ("ধান", "আলু") — both forms are normalised internally.
 *
 * @param {string} cropInput - Crop key or display name
 * @returns {Array} Variety objects (empty if crop unknown)
 *
 * @example
 *   getVarietiesByCrop('rice');      // → 30 BRRI varieties
 *   getVarietiesByCrop('ধান');         // → same result
 */
export function getVarietiesByCrop(cropInput) {
  if (!cropInput) return [];
  const key = resolveVarietyCropKey(cropInput);
  return VARIETIES[key] || [];
}

/**
 * Look up a single variety by its id.
 * @param {string} id - Variety id (e.g. 'brridhan29')
 * @returns {Object|undefined}
 */
export function lookupVariety(id) {
  if (!id) return undefined;
  for (const crop of Object.keys(VARIETIES)) {
    const found = VARIETIES[crop].find(v => v.id === id);
    if (found) return found;
  }
  return undefined;
}

/**
 * Fuzzy-lookup a variety by free-text name (handles Bengali/English/
 * transliterated forms like "BRRI dhan29", "বিআরআই ধান-২৯", "bri 29").
 * @param {string} name
 * @returns {Object|undefined}
 */
export function findVarietyByName(name) {
  if (!name) return undefined;
  const q = String(name).toLowerCase().replace(/[\s\-_]+/g, '');
  for (const crop of Object.keys(VARIETIES)) {
    for (const v of VARIETIES[crop]) {
      const candidates = [v.name, v.nameEn, v.id].map(s => String(s).toLowerCase().replace(/[\s\-_]+/g, ''));
      if (candidates.includes(q)) return v;
      // partial match: nameEn contains query
      if (candidates.some(c => c.includes(q) && q.length >= 4)) return v;
    }
  }
  return undefined;
}

/**
 * Get a susceptibility rating for a (crop, variety, disease) triple.
 * Returns one of: "high", "medium", "low", or "unknown".
 *
 * Mapping from BRRI resistance codes:
 *   HR / R    → low  (rarely suffers from this disease)
 *   MR        → medium
 *   MS / S / HS → high (susceptible)
 *
 * @param {string} cropInput
 * @param {string} varietyName - Free-text variety name
 * @param {string} diseaseKey  - Disease/pest key (e.g. 'blast', 'lateBlight')
 * @returns {{rating: string, code: string|null, variety: Object|null, matchedKey: string|null}}
 */
export function getVarietySusceptibilityDetailed(cropInput, varietyName, diseaseKey) {
  const variety = findVarietyByName(varietyName) || (cropInput && VARIETIES[resolveVarietyCropKey(cropInput)]?.find(() => true));
  if (!variety || !variety.resistance) {
    return { rating: 'unknown', code: null, variety: null, matchedKey: null };
  }
  // Try exact disease key first, then fuzzy (e.g. 'leafBlast' matches 'blast')
  let code = variety.resistance[diseaseKey];
  let matchedKey = diseaseKey;
  if (!code) {
    const lower = String(diseaseKey).toLowerCase();
    const found = Object.keys(variety.resistance).find(k =>
      k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase())
    );
    if (found) { code = variety.resistance[found]; matchedKey = found; }
  }
  if (!code) return { rating: 'unknown', code: null, variety, matchedKey: null };

  const upper = String(code).toUpperCase();
  let rating;
  if (upper === 'HR' || upper === 'R') rating = 'low';
  else if (upper === 'MR') rating = 'medium';
  else rating = 'high'; // MS, S, HS, or anything else

  return { rating, code: upper, variety, matchedKey };
}

/**
 * Get total count of varieties across all crops.
 */
export function getVarietyCount() {
  return Object.values(VARIETIES).reduce((sum, list) => sum + list.length, 0);
}

/**
 * Get all crops that have variety data.
 */
export function getCropsWithVarieties() {
  return Object.keys(VARIETIES);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

const CROP_KEY_ALIASES = {
  // rice
  rice: 'rice', ধান: 'rice', dhan: 'rice', paddy: 'rice', ধানের: 'rice',
  // potato
  potato: 'potato', আলু: 'potato', alu: 'potato',
  // tomato
  tomato: 'tomato', টমেটো: 'tomato', tomator: 'tomato',
  // wheat
  wheat: 'wheat', গম: 'wheat', gom: 'wheat', ghum: 'wheat',
  // maize
  maize: 'maize', ভুট্টা: 'maize', bhutta: 'maize', corn: 'maize',
  // mustard
  mustard: 'mustard', সরিষা: 'mustard', sarisha: 'mustard', sharisha: 'mustard',
  // brinjal
  brinjal: 'brinjal', বেগুন: 'brinjal', begun: 'brinjal', eggplant: 'brinjal',
  // chili
  chili: 'chili', মরিচ: 'chili', morich: 'chili', mirch: 'chili', pepper: 'chili',
};

function resolveVarietyCropKey(input) {
  if (!input) return null;
  const raw = String(input).trim().toLowerCase();
  // Try direct match
  if (CROP_KEY_ALIASES[raw]) return CROP_KEY_ALIASES[raw];
  // Try matching the Bengali prefix (e.g. "ধান / Rice" → "ধান")
  for (const alias of Object.keys(CROP_KEY_ALIASES)) {
    if (raw.startsWith(alias.toLowerCase())) return CROP_KEY_ALIASES[alias];
  }
  // Try English transliteration
  for (const alias of Object.keys(CROP_KEY_ALIASES)) {
    if (/^[\x00-\x7F]+$/.test(alias) && raw.includes(alias.toLowerCase())) return CROP_KEY_ALIASES[alias];
  }
  return null;
}
