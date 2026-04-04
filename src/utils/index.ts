// Utility functions
export {
  generateId,
  generateShortId,
  generateTimestampedId,
  isValidUuid,
} from './idGenerator';

export {
  calculatePlantRelationships,
  getRelationshipsForPlant,
  countRelationships,
  areWithinRange,
  getCompanionBenefit,
  getCombativeHarm,
  type PlantRelationship,
  type RelationshipType,
} from './companionRelationships';
