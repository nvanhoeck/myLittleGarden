/**
 * ComponentPosition value object
 * Represents the position and rotation of a garden component on the canvas
 * Positions are in meters, rotation is in degrees (0-360)
 */

export interface ComponentPositionData {
  readonly positionX: number;
  readonly positionY: number;
  readonly rotation: number;
}

/**
 * Value object for component positioning on the garden canvas
 * Immutable - all operations return new instances
 */
export class ComponentPosition {
  private constructor(
    private readonly _positionX: number,
    private readonly _positionY: number,
    private readonly _rotation: number
  ) {}

  /**
   * Create a new ComponentPosition at the origin with no rotation
   */
  static atOrigin(): ComponentPosition {
    return new ComponentPosition(0, 0, 0);
  }

  /**
   * Create a ComponentPosition from coordinates
   */
  static create(x: number, y: number, rotation: number = 0): ComponentPosition {
    // Normalize rotation to 0-360 range
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    return new ComponentPosition(x, y, normalizedRotation);
  }

  /**
   * Create a ComponentPosition from storage data
   */
  static fromData(data: ComponentPositionData): ComponentPosition {
    return ComponentPosition.create(data.positionX, data.positionY, data.rotation);
  }

  /**
   * X position in meters
   */
  get positionX(): number {
    return this._positionX;
  }

  /**
   * Y position in meters
   */
  get positionY(): number {
    return this._positionY;
  }

  /**
   * Rotation in degrees (0-360)
   */
  get rotation(): number {
    return this._rotation;
  }

  /**
   * Check if this position is at the origin with no rotation
   * (component has not been placed on canvas)
   */
  get isUnplaced(): boolean {
    return this._positionX === 0 && this._positionY === 0 && this._rotation === 0;
  }

  /**
   * Move to a new position
   */
  moveTo(x: number, y: number): ComponentPosition {
    return new ComponentPosition(x, y, this._rotation);
  }

  /**
   * Move by a delta
   */
  moveBy(deltaX: number, deltaY: number): ComponentPosition {
    return new ComponentPosition(
      this._positionX + deltaX,
      this._positionY + deltaY,
      this._rotation
    );
  }

  /**
   * Rotate to an absolute angle (15-degree increments)
   */
  rotateTo(degrees: number): ComponentPosition {
    // Snap to 15-degree increments
    const snapped = Math.round(degrees / 15) * 15;
    const normalized = ((snapped % 360) + 360) % 360;
    return new ComponentPosition(this._positionX, this._positionY, normalized);
  }

  /**
   * Rotate by a delta (15-degree increments)
   */
  rotateBy(deltaDegrees: number): ComponentPosition {
    return this.rotateTo(this._rotation + deltaDegrees);
  }

  /**
   * Convert to plain data object for storage
   */
  toData(): ComponentPositionData {
    return {
      positionX: this._positionX,
      positionY: this._positionY,
      rotation: this._rotation,
    };
  }

  /**
   * Check equality with another position
   */
  equals(other: ComponentPosition): boolean {
    return (
      this._positionX === other._positionX &&
      this._positionY === other._positionY &&
      this._rotation === other._rotation
    );
  }
}
