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
  getCompanionBenefits,
  getCombativeHarms,
  type PlantRelationship,
  type RelationshipType,
} from './companionRelationships';
