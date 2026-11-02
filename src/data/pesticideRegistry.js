/**
 * Bangladesh registered-pesticide registry used by the MoA search view.
 *
 * Single source of truth: the AgriChem Guide & Pest Control Database
 * (https://github.com/moniruzjaman/AgriChem-Guide-Pest-Control-Database),
 * synced into src/agrichem/data/all_pesticides.ts by:
 *
 *     node scripts/sync_agrichem.mjs
 *
 * Do NOT create JS copies of the database — they go stale. Edit upstream
 * and re-run the sync script instead.
 */
import { pesticides } from '../agrichem/data/all_pesticides.ts';

export const BANGLADESH_PESTICIDES_REGISTRY = pesticides.map(p => ({
  category: p.pesticideType,
  activeIngredient: p.commonName,
  tradeName: p.brandName,
  regNo: p.registrationNo,
  company: p.registrationHolder,
  crops: (p.recommendedCrops || []).join(', '),
  pest: (p.recommendedPests || []).join(', '),
  dosage: p.dosageRate,
  moaCode: p.moaCode
}));

/**
 * Filter registered pesticide products by crop, target pest, or active ingredient.
 * @param {object} query
 * @param {string} [query.crop]
 * @param {string} [query.pest]
 * @param {string} [query.activeIngredient]
 * @returns {Array<object>}
 */
export function getRegisteredProducts({ crop, pest, activeIngredient } = {}) {
  return BANGLADESH_PESTICIDES_REGISTRY.filter((item) => {
    let match = true;

    if (crop) {
      const c = crop.toLowerCase();
      match = match && item.crops.toLowerCase().includes(c);
    }

    if (pest) {
      const p = pest.toLowerCase();
      match = match && item.pest.toLowerCase().includes(p);
    }

    if (activeIngredient) {
      const a = activeIngredient.toLowerCase();
      match = match && item.activeIngredient.toLowerCase().includes(a);
    }

    return match;
  });
}
