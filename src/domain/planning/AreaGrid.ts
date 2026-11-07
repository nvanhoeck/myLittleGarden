import type { AreaData, AreaPiece } from '../../types/planning.types.ts';
import type { FootprintTraits } from './PlantFootprint.ts';
import type { PlantingArea } from './PlantingArea.ts';

/** Tolerance for rounding: a footprint touching the wall still fits */
const EPSILON = 1e-9;

/** A regular grid of plant positions: the first column and row centre, and their numbers */
interface Grid {
  readonly x0: number;
  readonly y0: number;
  readonly cols: number;
  readonly rows: number;
}

/** A grid of cols x rows centred in the piece */
function centredGrid(piece: AreaPiece, spacingCm: number, cols: number, rows: number): Grid {
  return {
    x0: piece.xCm + (piece.widthCm - cols * spacingCm) / 2 + spacingCm / 2,
    y0: piece.yCm + (piece.lengthCm - rows * spacingCm) / 2 + spacingCm / 2,
    cols,
    rows,
  };
}

/**
 * The grids worth trying: the fullest centred grid, and in a circle also the
 * grids one column and/or row smaller (shifted half a spacing), which can fit more plants inside the round wall.
 */
function candidateGrids(piece: AreaPiece, spacingCm: number, layer: PlantingArea): Grid[] {
  const cols = Math.floor(piece.widthCm / spacingCm + EPSILON);
  const rows = Math.floor(piece.lengthCm / spacingCm + EPSILON);
  if (cols < 1 || rows < 1) return [];
  if (layer.shape === 'rectangle') return [centredGrid(piece, spacingCm, cols, rows)];
  const colOptions = cols > 1 ? [cols, cols - 1] : [cols];
  const rowOptions = rows > 1 ? [rows, rows - 1] : [rows];
  return colOptions.flatMap((c) => rowOptions.map((r) => centredGrid(piece, spacingCm, c, r)));
}

/** The first and last column of a grid row whose footprint lies inside the layer; first > last when none */
function columnsInRow(grid: Grid, row: number, spacingCm: number, layer: PlantingArea): [number, number] {
  if (layer.shape === 'rectangle') return [0, grid.cols - 1];
  const radius = layer.diameterCm / 2;
  const half = spacingCm / 2;
  const y = grid.y0 + row * spacingCm;
  const dy = Math.max(Math.abs(y - half - radius), Math.abs(y + half - radius));
  if (dy > radius + 1e-6) return [0, -1];
  const reach = Math.sqrt(Math.max(0, radius * radius - dy * dy)) + 1e-6;
  const first = Math.max(0, Math.ceil((radius - reach + half - grid.x0) / spacingCm - EPSILON));
  const last = Math.min(grid.cols - 1, Math.floor((radius + reach - half - grid.x0) / spacingCm + EPSILON));
  return [first, last];
}

function countOf(grid: Grid, spacingCm: number, layer: PlantingArea): number {
  if (layer.shape === 'rectangle') return grid.cols * grid.rows;
  let count = 0;
  for (let row = 0; row < grid.rows; row++) {
    const [first, last] = columnsInRow(grid, row, spacingCm, layer);
    count += Math.max(0, last - first + 1);
  }
  return count;
}

/** The candidate grid holding the most plants; ties go to the fuller grid */
function bestGrid(piece: AreaPiece, spacingCm: number, layer: PlantingArea): { grid: Grid; count: number } | null {
  let best: { grid: Grid; count: number } | null = null;
  for (const grid of candidateGrids(piece, spacingCm, layer)) {
    const count = countOf(grid, spacingCm, layer);
    if (best === null || count > best.count) best = { grid, count };
  }
  return best;
}

/**
 * The plant positions (centres, cm) of a regular grid with the given spacing
 * in the piece: every footprint (a square of one spacing) lies inside the
 * piece and, in a circular layer, inside the circle. Row by row, at most `limit` positions.
 */
export function gridPositions(
  piece: AreaPiece,
  spacingCm: number,
  layer: PlantingArea,
  limit = Infinity,
): { xCm: number; yCm: number }[] {
  if (!(spacingCm > 0)) return [];
  const best = bestGrid(piece, spacingCm, layer);
  if (best === null) return [];
  const { grid } = best;
  const positions: { xCm: number; yCm: number }[] = [];
  for (let row = 0; row < grid.rows && positions.length < limit; row++) {
    const [first, last] = columnsInRow(grid, row, spacingCm, layer);
    for (let col = first; col <= last && positions.length < limit; col++) {
      positions.push({ xCm: grid.x0 + col * spacingCm, yCm: grid.y0 + row * spacingCm });
    }
  }
  return positions;
}

/**
 * How many plants the area holds: the grid with spacing twice the spacing
 * radius over all its pieces. Patch and thinning plants are sown over the
 * area and have no count (null).
 */
export function plantCountOf(area: Pick<AreaData, 'pieces'>, traits: FootprintTraits, layer: PlantingArea): number | null {
  if (traits.plantingStyle === 'patch' || traits.plantingStyle === 'thinning') return null;
  const spacingCm = 2 * traits.spacingRadiusCm;
  if (!(spacingCm > 0)) return 0;
  return area.pieces.reduce((sum, piece) => sum + (bestGrid(piece, spacingCm, layer)?.count ?? 0), 0);
}
