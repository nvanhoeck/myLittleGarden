import { GrowingPeriod } from './GrowingPeriod.ts';
import type { PlanningContext, PlantingMethod, PlantTiming } from './GrowingPeriod.ts';

/** Methods in tie-breaking order: transplant is preferred over direct sow */
const METHODS: readonly PlantingMethod[] = ['transplant', 'directSow'];

/** The window around the calculated week that auto-placement may choose from */
const WEEK_SHIFTS: readonly number[] = [-1, 0, 1];

/**
 * All periods auto-placement may choose for a plant in a year: for every
 * method the plant supports, the calculated start week -1, 0 and +1.
 * Options whose start falls outside the year are left out.
 *
 * The order (transplant before direct sow, earlier before later) is the
 * tie-breaker during placement. An empty list means the plant cannot be
 * planned this year.
 */
export function periodOptionsFor(plant: PlantTiming, context: PlanningContext): GrowingPeriod[] {
  const options: GrowingPeriod[] = [];
  for (const method of METHODS) {
    for (const shift of WEEK_SHIFTS) {
      const period = GrowingPeriod.fromCatalog(plant, method, context, shift);
      if (period !== null) {
        options.push(period);
      }
    }
  }
  return options;
}
