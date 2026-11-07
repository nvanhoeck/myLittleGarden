import type { AreaPiece, Season, SeasonStatus } from './planning.types.ts';

/**
 * View-model output types of the planning screens: what the components draw
 */

export interface PlantingMenuItemView {
  readonly key: string;
  readonly label: string;
  readonly kind: 'duplicate' | 'move' | 'remove';
  /** Target season of duplicate and move; the planting's own season for remove */
  readonly season: Season;
  readonly testID: string;
}

export interface PlantingMenuView {
  /** Duplicate and move need a placed planting */
  readonly isPlaced: boolean;
  /** Removing the last planting of a plant removes the plant from the planning */
  readonly isLastPlanting: boolean;
  readonly items: readonly PlantingMenuItemView[];
}

export interface RatioRowView {
  readonly plantingId: string;
  readonly plantId: string;
  readonly name: string;
  readonly ratio: number;
  /** "25%": the share the ratio asks for */
  readonly targetLabel: string;
  /** What the last optimization gave ("vergrendeld · …" for a locked area); null when the season is not planned or was not optimized in this session */
  readonly resultLabel: string | null;
  readonly fits: boolean;
  readonly menu: PlantingMenuView;
}

export interface CarriedRowView {
  readonly plantingId: string;
  readonly plantId: string;
  readonly name: string;
  readonly label: string;
}

export interface SeasonSectionView {
  readonly season: Season;
  readonly title: string;
  readonly monthsLabel: string;
  readonly status: SeasonStatus;
  readonly statusLabel: string;
  readonly ratioRows: readonly RatioRowView[];
  readonly carriedRows: readonly CarriedRowView[];
  readonly isEmpty: boolean;
}

export type AreaRelationKind = 'companion' | 'combative';

export interface AreaRelationView {
  readonly otherAreaId: string;
  readonly kind: AreaRelationKind;
}

/** One planting's area on the season canvas */
export interface AreaView {
  readonly id: string;
  readonly plantingId: string;
  readonly plantId: string;
  readonly category: string | null;
  /** The area's pieces, cm in the layer */
  readonly rects: readonly AreaPiece[];
  /** "Ui · 780" or "Spinazie · zaaivlak" */
  readonly label: string;
  /** Plants on the area's grid; null for a sown area */
  readonly count: number | null;
  /** Plant centres (cm), only when the area holds at most 50 plants */
  readonly icons: readonly { readonly xCm: number; readonly yCm: number }[];
  /** The space one plant takes (cm), for the icon size */
  readonly iconSizeCm: number;
  /** Carried over from an earlier season: drawn dimmed, not editable */
  readonly dimmed: boolean;
  /** "uit lente" for a carried area */
  readonly carriedLabel: string | null;
  readonly locked: boolean;
  readonly relationsAtEdges: readonly AreaRelationView[];
  /** A resize snaps to whole multiples of this (cm) */
  readonly resizeStepCm: number;
  /** A piece overlaps a piece of another area of the season (carried ones included) */
  readonly overlaps: boolean;
  /** A piece lies outside the layer, e.g. after the component was made smaller */
  readonly outsideLayer: boolean;
  /** "Overlapt met een ander vak · Valt (deels) buiten de plantruimte" when overlapping or outside; null otherwise */
  readonly warningLabel: string | null;
}

/** A companion or combative marker where two areas touch, at the middle of the shared edge (cm) */
export interface EdgeMarkerView {
  readonly key: string;
  readonly kind: AreaRelationKind;
  readonly xCm: number;
  readonly yCm: number;
}

/** A road (path) of a garden box, drawn under the areas */
export interface RoadView {
  readonly id: string;
  /** cm in the box's inner area */
  readonly rect: AreaPiece;
  readonly locked: boolean;
}

/** Where a road can go: a segment between two areas, or along the box edge (same shape as the roads domain Border) */
export interface RoadBorder {
  /** vertical = the line x = constant */
  readonly orientation: 'vertical' | 'horizontal';
  /** x for vertical, y for horizontal (cm) */
  readonly lineCm: number;
  readonly fromCm: number;
  readonly toCm: number;
  readonly kind: 'between' | 'edge';
  /** edge only: which side of the line the box interior lies */
  readonly inside?: 'before' | 'after';
}

/** A + button on a border without a road, at the border's midpoint (cm) */
export interface RoadSlotView {
  readonly key: string;
  readonly border: RoadBorder;
  readonly xCm: number;
  readonly yCm: number;
}

export interface AreaCanvasView {
  /** Carried areas first, then the season's own */
  readonly areas: readonly AreaView[];
  readonly edgeMarkers: readonly EdgeMarkerView[];
  /** Roads of a garden box; empty for pots and towers */
  readonly roads: readonly RoadView[];
  /** + buttons for new roads: garden box in edit mode only */
  readonly roadSlots: readonly RoadSlotView[];
}
