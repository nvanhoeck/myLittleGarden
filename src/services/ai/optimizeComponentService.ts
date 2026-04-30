import type { OptimizeComponentRequest } from '@/schemas/ai/optimizeComponentRequestSchema';
import type {
  OptimizeComponentResponse,
  OptimizeComponentAlternative,
} from '@/schemas/ai/optimizeComponentResponseSchema';

const MOCK_DELAY_MS = 800;

function buildMockAlternatives(
  request: OptimizeComponentRequest,
): OptimizeComponentAlternative[] {
  const componentSnapshot = request.snapshot.components[0];
  const placedPlants = componentSnapshot?.plants ?? [];

  const layoutA = placedPlants.map((plant, index) => ({
    plantInstanceId: plant.id,
    positionXInCm: 20 + (index % 4) * 30,
    positionYInCm: 20 + Math.floor(index / 4) * 30,
  }));

  const layoutB = placedPlants.map((plant, index) => ({
    plantInstanceId: plant.id,
    positionXInCm: 30 + (index % 3) * 35,
    positionYInCm: 25 + Math.floor(index / 3) * 35,
  }));

  const layoutC = placedPlants.map((plant, index) => ({
    plantInstanceId: plant.id,
    positionXInCm: 15 + (index % 5) * 25,
    positionYInCm: 30 + Math.floor(index / 5) * 40,
  }));

  return [
    {
      id: 'optie-1',
      label: 'Optie 1',
      summary:
        'Maximale companion-voordelen: planten met onderlinge synergie staan dicht bij elkaar zonder spacing-conflicten.',
      score: { companion: 85, spacing: 90, sun: 70, combative: 80, total: 78 },
      positions: layoutA,
    },
    {
      id: 'optie-2',
      label: 'Optie 2',
      summary:
        'Gebalanceerde opstelling met goede zon-verdeling en redelijke afstanden tussen planten.',
      score: { companion: 65, spacing: 75, sun: 80, combative: 60, total: 62 },
      positions: layoutB,
    },
    {
      id: 'optie-3',
      label: 'Optie 3',
      summary:
        'Minimaliseert conflicten door agressieve buren te scheiden, ten koste van compactheid.',
      score: { companion: 40, spacing: 60, sun: 55, combative: 90, total: 45 },
      positions: layoutC,
    },
  ];
}

export const optimizeComponentService = {
  async requestOptimization(
    request: OptimizeComponentRequest,
  ): Promise<OptimizeComponentResponse> {
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

    return {
      componentId: request.componentId,
      alternatives: buildMockAlternatives(request),
      diagnostics: { warnings: [] },
    };
  },
};
