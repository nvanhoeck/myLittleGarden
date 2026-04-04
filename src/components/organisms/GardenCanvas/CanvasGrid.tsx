/**
 * CanvasGrid component
 * Renders a 1-meter grid on the garden canvas using SVG
 */

import React, { useMemo } from 'react';
import Svg, { Line, G, Text as SvgText } from 'react-native-svg';

interface CanvasGridProps {
  /** Canvas width in pixels */
  canvasWidth: number;
  /** Canvas height in pixels */
  canvasHeight: number;
  /** Pixels per meter scale */
  pixelsPerMeter: number;
  /** Grid line color */
  gridColor?: string;
  /** Grid line width */
  strokeWidth?: number;
  /** Whether to show meter labels */
  showLabels?: boolean;
  /** Label color */
  labelColor?: string;
}

/**
 * Renders a 1-meter grid with optional labels
 */
export function CanvasGrid({
  canvasWidth,
  canvasHeight,
  pixelsPerMeter,
  gridColor = 'rgba(76, 175, 80, 0.3)',
  strokeWidth = 1,
  showLabels = true,
  labelColor = 'rgba(76, 175, 80, 0.6)',
}: CanvasGridProps): React.JSX.Element {
  const gridLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];

    // Vertical lines (every meter)
    const numVerticalLines = Math.ceil(canvasWidth / pixelsPerMeter);
    for (let i = 0; i <= numVerticalLines; i++) {
      const x = i * pixelsPerMeter;
      lines.push({
        x1: x,
        y1: 0,
        x2: x,
        y2: canvasHeight,
        key: `v-${i}`,
      });
    }

    // Horizontal lines (every meter)
    const numHorizontalLines = Math.ceil(canvasHeight / pixelsPerMeter);
    for (let i = 0; i <= numHorizontalLines; i++) {
      const y = i * pixelsPerMeter;
      lines.push({
        x1: 0,
        y1: y,
        x2: canvasWidth,
        y2: y,
        key: `h-${i}`,
      });
    }

    return lines;
  }, [canvasWidth, canvasHeight, pixelsPerMeter]);

  const labels = useMemo(() => {
    if (!showLabels) return [];

    const labelItems: { x: number; y: number; text: string; key: string }[] = [];

    // X-axis labels (bottom)
    const numXLabels = Math.ceil(canvasWidth / pixelsPerMeter);
    for (let i = 0; i <= numXLabels; i++) {
      labelItems.push({
        x: i * pixelsPerMeter + 4,
        y: canvasHeight - 4,
        text: `${i}m`,
        key: `lx-${i}`,
      });
    }

    // Y-axis labels (left side)
    const numYLabels = Math.ceil(canvasHeight / pixelsPerMeter);
    for (let i = 1; i <= numYLabels; i++) {
      labelItems.push({
        x: 4,
        y: i * pixelsPerMeter - 4,
        text: `${i}m`,
        key: `ly-${i}`,
      });
    }

    return labelItems;
  }, [canvasWidth, canvasHeight, pixelsPerMeter, showLabels]);

  return (
    <Svg
      width={canvasWidth}
      height={canvasHeight}
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      <G>
        {/* Grid lines */}
        {gridLines.map((line) => (
          <Line
            key={line.key}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={gridColor}
            strokeWidth={strokeWidth}
          />
        ))}

        {/* Labels */}
        {labels.map((label) => (
          <SvgText
            key={label.key}
            x={label.x}
            y={label.y}
            fill={labelColor}
            fontSize={10}
            fontWeight="500"
          >
            {label.text}
          </SvgText>
        ))}
      </G>
    </Svg>
  );
}
