/**
 * AreaShapes
 * Read-only drawing of planting areas (home slide, layer overview): each piece
 * a rounded rectangle tinted by plant category, with the plant icon once.
 * Purely presentational; one element per piece, never one per plant.
 *
 * BEM contract (src/styles/planning/season.css): .season-area
 */
import React from 'react';
import { Image, Text, View } from 'react-native';
import { getPlantIcon, hasPlantIcon } from '@/assets';
import { PLANT_CATEGORIES } from '@/types/plant.types';
import type { AreaPiece } from '@/types';

const CATEGORY_TINTS: Readonly<Record<string, string>> = {
  vruchtgroenten: 'rgba(220, 38, 38, 0.55)',
  bladgroenten: 'rgba(34, 197, 94, 0.55)',
  wortelgroenten: 'rgba(234, 88, 12, 0.55)',
  koolgewassen: 'rgba(20, 184, 166, 0.55)',
  peulvruchten: 'rgba(161, 98, 7, 0.55)',
  kruiden: 'rgba(101, 163, 13, 0.55)',
  groenten: 'rgba(59, 130, 246, 0.55)',
  fruit: 'rgba(219, 39, 119, 0.55)',
  graan: 'rgba(202, 138, 4, 0.55)',
};
const DEFAULT_TINT = 'rgba(107, 114, 128, 0.55)';

/** The fill of an area of a plant category */
export function categoryTint(category: string | null | undefined): string {
  return (category ? CATEGORY_TINTS[category] : undefined) ?? DEFAULT_TINT;
}

interface AreaPlantIconProps {
  plantId: string;
  category: string | null | undefined;
  size: number;
}

/** The plant's own icon, or its category emoji */
export const AreaPlantIcon = React.memo(function AreaPlantIcon({ plantId, category, size }: AreaPlantIconProps): React.JSX.Element {
  const source = hasPlantIcon(plantId) ? getPlantIcon(plantId) : undefined;
  if (source) {
    return <Image source={source} style={{ width: size, height: size }} resizeMode="contain" />;
  }
  const emoji = PLANT_CATEGORIES.find((c) => c.key === category)?.icon ?? '🌱';
  return <Text style={{ fontSize: Math.max(6, size * 0.8), lineHeight: size }}>{emoji}</Text>;
});

export interface AreaShape {
  readonly id: string;
  readonly plantId: string;
  readonly category: string | null | undefined;
  readonly pieces: readonly AreaPiece[];
}

interface AreaShapesProps {
  areas: readonly AreaShape[];
  /** px per cm */
  scale: number;
  /** Largest icon size (px) */
  maxIconPx?: number;
}

export function AreaShapes({ areas, scale, maxIconPx = 16 }: AreaShapesProps): React.JSX.Element {
  return (
    <>
      {areas.map((area) =>
        area.pieces.map((piece, index) => {
          const width = piece.widthCm * scale;
          const height = piece.lengthCm * scale;
          const iconPx = Math.min(maxIconPx, width - 2, height - 2);
          return (
            <View
              key={`${area.id}-${index}`}
              className="absolute rounded-md border border-white/30 overflow-hidden items-center justify-center"
              style={{ left: piece.xCm * scale, top: piece.yCm * scale, width, height, backgroundColor: categoryTint(area.category) }}
            >
              {index === 0 && iconPx >= 6 && <AreaPlantIcon plantId={area.plantId} category={area.category} size={iconPx} />}
            </View>
          );
        }),
      )}
    </>
  );
}
