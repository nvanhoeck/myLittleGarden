/**
 * Plant image assets
 * Maps plant IDs to their icon and image assets
 *
 * Icons/images follow a hierarchy:
 * 1. Direct plant match (e.g., tomaat.png for tomaat)
 * 2. Category/type fallback (e.g., kool.png for broccoli)
 */
import { ImageSourcePropType } from 'react-native';

// =============================================================================
// ICON ASSETS - Available in assets/plants/icons/
// =============================================================================

const ICONS = {
  // Direct plant icons
  aardbei: require('../../assets/plants/icons/aardbei.png'),
  asperge: require('../../assets/plants/icons/asperge.png'),
  aubergine: require('../../assets/plants/icons/aubergine.png'),
  biet: require('../../assets/plants/icons/biet.png'),
  courgette: require('../../assets/plants/icons/courgette.png'),
  goudsbloem: require('../../assets/plants/icons/goudsbloem.png'),
  kamille: require('../../assets/plants/icons/kamille.png'),
  komkommer: require('../../assets/plants/icons/komkommer.png'),
  koolraap: require('../../assets/plants/icons/koolraap.png'),
  lavendel: require('../../assets/plants/icons/lavendel.png'),
  munt: require('../../assets/plants/icons/munt.png'),
  oca: require('../../assets/plants/icons/oca.png'),
  paardenbloem: require('../../assets/plants/icons/paardenbloem.png'),
  paprika: require('../../assets/plants/icons/paprika.png'),
  peterselie: require('../../assets/plants/icons/peterselie.png'),
  rucola: require('../../assets/plants/icons/rucola.png'),
  schorseneer: require('../../assets/plants/icons/schorseneer.png'),
  sla: require('../../assets/plants/icons/sla.png'),
  spinazie: require('../../assets/plants/icons/spinazie.png'),
  tomaat: require('../../assets/plants/icons/tomaat.png'),
  ui: require('../../assets/plants/icons/ui.png'),
  waterkers: require('../../assets/plants/icons/waterkers.png'),
  wortel: require('../../assets/plants/icons/wortel.png'),
  zuring: require('../../assets/plants/icons/zuring.png'),

  // Category icons (used as fallbacks)
  citrusbomen: require('../../assets/plants/icons/citrusbomen.png'),
  droge_peulvruchten: require('../../assets/plants/icons/droge_peulvruchten.png'),
  eetbare_bloem: require('../../assets/plants/icons/eetbare_bloem.png'),
  erwten: require('../../assets/plants/icons/erwten.png'),
  houtige_kruiden: require('../../assets/plants/icons/houtige_kruiden.png'),
  kool: require('../../assets/plants/icons/kool.png'),
  kruidplant: require('../../assets/plants/icons/kruidplant.png'),
  mediteraanse_kruiden: require('../../assets/plants/icons/mediteraanse_kruiden.png'),
  oost_indische_kers: require('../../assets/plants/icons/oost_indische_kers.png'),
  peulvruchten: require('../../assets/plants/icons/peulvruchten.png'),
  schermbloemigen: require('../../assets/plants/icons/schermbloemigen.png'),
  theekruiden: require('../../assets/plants/icons/theekruiden.png'),
};

// =============================================================================
// IMAGE ASSETS - Available in assets/plants/images/
// =============================================================================

const IMAGES = {
  // Direct plant images
  aardbei: require('../../assets/plants/images/aardbei.png'),
  asperge: require('../../assets/plants/images/asperge.png'),
  aubergine: require('../../assets/plants/images/aubergine.png'),
  biet: require('../../assets/plants/images/biet.png'),
  courgette: require('../../assets/plants/images/courgette.png'),
  goudsbloem: require('../../assets/plants/images/goudsbloem.png'),
  kamille: require('../../assets/plants/images/kamille.png'),
  komkommer: require('../../assets/plants/images/komkommer.png'),
  lavendel: require('../../assets/plants/images/lavendel.png'),
  munt: require('../../assets/plants/images/munt.png'),
  paardenbloem: require('../../assets/plants/images/paardenbloem.png'),
  paprika: require('../../assets/plants/images/paprika.png'),
  peterselie: require('../../assets/plants/images/peterselie.png'),
  rucola: require('../../assets/plants/images/rucola.png'),
  sla: require('../../assets/plants/images/sla.png'),
  spinazie: require('../../assets/plants/images/spinazie.png'),
  tomaat: require('../../assets/plants/images/tomaat.png'),
  waterkers: require('../../assets/plants/images/waterkers.png'),
  wortel: require('../../assets/plants/images/wortel.png'),
  zuring: require('../../assets/plants/images/zuring.png'),

  // Category images (used as fallbacks)
  citrusbomen: require('../../assets/plants/images/citrusbomen.png'),
  droge_peulvruchten: require('../../assets/plants/images/droge_peulvruchten.png'),
  eetbare_bloem: require('../../assets/plants/images/eetbare_bloem.png'),
  erwt: require('../../assets/plants/images/erwt.png'),
  houtige_kruiden: require('../../assets/plants/images/houtige_kruiden.png'),
  knolgewassen: require('../../assets/plants/images/knolgewassen.png'),
  kool: require('../../assets/plants/images/kool.png'),
  kruidplant: require('../../assets/plants/images/kruidplant.png'),
  mediteraanse_kruiden: require('../../assets/plants/images/mediteraanse_kruiden.png'),
  oost_indische_kers: require('../../assets/plants/images/oost_indische_kers.png'),
  peulvruchten: require('../../assets/plants/images/peulvruchten.png'),
  rapen: require('../../assets/plants/images/rapen.png'),
  schermbloemige: require('../../assets/plants/images/schermbloemige.png'),
  schorsenere: require('../../assets/plants/images/schorsenere.png'),
  theekruid: require('../../assets/plants/images/theekruid.png'),
  ajiun: require('../../assets/plants/images/ajiun.png'),
};

// =============================================================================
// PLANT TO ICON MAPPING
// Maps each plant ID to its icon asset
// =============================================================================

export const PLANT_ICONS: Record<string, ImageSourcePropType> = {
  // -------------------------------------------------------------------------
  // Vruchtgroenten (Fruit vegetables)
  // -------------------------------------------------------------------------
  tomaat: ICONS.tomaat,
  paprika: ICONS.paprika,
  komkommer: ICONS.komkommer,
  courgette: ICONS.courgette,
  aubergine: ICONS.aubergine,
  aardbei: ICONS.aardbei,
  pommer: ICONS.tomaat, // Pumpkin - use tomaat as vruchtgroenten fallback
  meloen: ICONS.komkommer, // Similar to cucumber family
  watermeloen: ICONS.komkommer,
  asperge: ICONS.asperge,
  rodovichy: ICONS.tomaat,
  'spaanse-peper': ICONS.paprika,
  cherimoya: ICONS.citrusbomen,
  vlierbes: ICONS.aardbei,

  // -------------------------------------------------------------------------
  // Bladgroenten (Leaf vegetables)
  // -------------------------------------------------------------------------
  sla: ICONS.sla,
  spinazie: ICONS.spinazie,
  rucola: ICONS.rucola,
  andijvie: ICONS.sla,
  snijsla: ICONS.sla,
  'ijsberg-sla': ICONS.sla,
  'romaine-sla': ICONS.sla,
  snijbiet: ICONS.spinazie,
  paksoi: ICONS.kool,
  mizuna: ICONS.sla,
  veldsla: ICONS.sla,
  rauwkost: ICONS.sla,
  mangold: ICONS.spinazie,
  snijkool: ICONS.kool,
  paardebloem: ICONS.paardenbloem,
  bladselderij: ICONS.schermbloemigen,
  sugarloaf: ICONS.sla,
  'rode-chichorei': ICONS.sla,
  witlof: ICONS.sla,
  radicchio: ICONS.sla,
  zuring: ICONS.zuring,
  kruidplant: ICONS.kruidplant,
  amarant: ICONS.spinazie,
  'rucola-sla': ICONS.rucola,
  'kapuzijner-kers': ICONS.oost_indische_kers,
  selderij: ICONS.schermbloemigen,
  kaasstelen: ICONS.spinazie,
  stengelbiet: ICONS.spinazie,
  zuringelambique: ICONS.zuring,
  waterkers: ICONS.waterkers,

  // -------------------------------------------------------------------------
  // Wortelgroenten (Root vegetables)
  // -------------------------------------------------------------------------
  wortel: ICONS.wortel,
  biet: ICONS.biet,
  radijs: ICONS.wortel, // No specific radijs icon, use wortel
  knolselderij: ICONS.schermbloemigen,
  pastinaak: ICONS.schermbloemigen,
  schorseneer: ICONS.schorseneer,
  koolraap: ICONS.koolraap,
  raap: ICONS.koolraap,
  rammenas: ICONS.wortel,
  retichie: ICONS.wortel,
  'schorseneel-wit': ICONS.schorseneer,
  oca: ICONS.oca,
  'kleine-radijs': ICONS.wortel,

  // -------------------------------------------------------------------------
  // Koolgewassen (Cole crops / Cabbage family)
  // -------------------------------------------------------------------------
  broccoli: ICONS.kool,
  boerenkool: ICONS.kool,
  bloemkool: ICONS.kool,
  spruitjes: ICONS.kool,
  savooiekool: ICONS.kool,
  'groene-kool': ICONS.kool,
  'rode-kool': ICONS.kool,
  bladkool: ICONS.kool,
  skraelkool: ICONS.kool,

  // -------------------------------------------------------------------------
  // Peulvruchten (Legumes)
  // -------------------------------------------------------------------------
  tuinboon: ICONS.peulvruchten,
  snijboon: ICONS.peulvruchten,
  doperwt: ICONS.erwten,
  sugarsnap: ICONS.erwten,
  'witte-boon': ICONS.droge_peulvruchten,
  kapucijner: ICONS.droge_peulvruchten,
  linzen: ICONS.droge_peulvruchten,
  quinoa: ICONS.droge_peulvruchten,
  erwtensoep: ICONS.erwten,
  'acker-boon': ICONS.peulvruchten,
  dubbelboon: ICONS.peulvruchten,
  pronkboon: ICONS.peulvruchten,
  limaboon: ICONS.peulvruchten,
  schuimboon: ICONS.peulvruchten,
  pronkerwt: ICONS.erwten,

  // -------------------------------------------------------------------------
  // Kruiden (Herbs)
  // -------------------------------------------------------------------------
  // Mediterranean herbs
  basilicum: ICONS.mediteraanse_kruiden,
  tijm: ICONS.houtige_kruiden,
  oregano: ICONS.mediteraanse_kruiden,
  rozemarijn: ICONS.houtige_kruiden,
  salie: ICONS.houtige_kruiden,
  majoraan: ICONS.mediteraanse_kruiden,
  lavendel: ICONS.lavendel,
  'salie-rood': ICONS.houtige_kruiden,
  citroensalie: ICONS.houtige_kruiden,

  // Parsley family (Schermbloemigen / Umbellifers)
  peterselie: ICONS.peterselie,
  dille: ICONS.schermbloemigen,
  cilantro: ICONS.schermbloemigen,
  'koriander-zaad': ICONS.schermbloemigen,
  fennel: ICONS.schermbloemigen,
  kervel: ICONS.schermbloemigen,

  // Alliums (Ui family)
  knoflook: ICONS.ui,
  ui: ICONS.ui,
  bieslook: ICONS.ui,

  // Mint family
  munt: ICONS.munt,
  bergmunt: ICONS.munt,
  appelmunt: ICONS.munt,
  tuinmint: ICONS.munt,

  // Tea herbs
  kamille: ICONS.kamille,
  sleutelbloem: ICONS.theekruiden,
  'sleutelbloem-thee': ICONS.theekruiden,

  // Other herbs
  dragon: ICONS.kruidplant,
  bezemkruid: ICONS.kruidplant,
  goudsbloemkruid: ICONS.goudsbloem,
  chia: ICONS.kruidplant,
  maggiekruid: ICONS.kruidplant,
  bonekruid: ICONS.kruidplant,
  anijs: ICONS.schermbloemigen,
  mandarijnkruid: ICONS.kruidplant,
  'champignon-kruid': ICONS.kruidplant,
  reigersbek: ICONS.kruidplant,
  borage: ICONS.eetbare_bloem,
  roodlover: ICONS.kruidplant,
  vogelvoet: ICONS.kruidplant,
  studentenkruid: ICONS.kruidplant,
  steentijm: ICONS.houtige_kruiden,
  'goudsbloem-peterselie': ICONS.goudsbloem,
  akkerwinde: ICONS.kruidplant,

  // -------------------------------------------------------------------------
  // Eetbare bloemen (Edible flowers)
  // -------------------------------------------------------------------------
  'eetbare-bloem': ICONS.eetbare_bloem,
};

// =============================================================================
// PLANT TO IMAGE MAPPING
// Maps each plant ID to its image asset
// =============================================================================

export const PLANT_IMAGES: Record<string, ImageSourcePropType> = {
  // -------------------------------------------------------------------------
  // Vruchtgroenten (Fruit vegetables)
  // -------------------------------------------------------------------------
  tomaat: IMAGES.tomaat,
  paprika: IMAGES.paprika,
  komkommer: IMAGES.komkommer,
  courgette: IMAGES.courgette,
  aubergine: IMAGES.aubergine,
  aardbei: IMAGES.aardbei,
  pommer: IMAGES.tomaat,
  meloen: IMAGES.komkommer,
  watermeloen: IMAGES.komkommer,
  asperge: IMAGES.asperge,
  rodovichy: IMAGES.tomaat,
  'spaanse-peper': IMAGES.paprika,
  cherimoya: IMAGES.citrusbomen,
  vlierbes: IMAGES.aardbei,

  // -------------------------------------------------------------------------
  // Bladgroenten (Leaf vegetables)
  // -------------------------------------------------------------------------
  sla: IMAGES.sla,
  spinazie: IMAGES.spinazie,
  rucola: IMAGES.rucola,
  andijvie: IMAGES.sla,
  snijsla: IMAGES.sla,
  'ijsberg-sla': IMAGES.sla,
  'romaine-sla': IMAGES.sla,
  snijbiet: IMAGES.spinazie,
  paksoi: IMAGES.kool,
  mizuna: IMAGES.sla,
  veldsla: IMAGES.sla,
  rauwkost: IMAGES.sla,
  mangold: IMAGES.spinazie,
  snijkool: IMAGES.kool,
  paardebloem: IMAGES.paardenbloem,
  bladselderij: IMAGES.schermbloemige,
  sugarloaf: IMAGES.sla,
  'rode-chichorei': IMAGES.sla,
  witlof: IMAGES.sla,
  radicchio: IMAGES.sla,
  zuring: IMAGES.zuring,
  kruidplant: IMAGES.kruidplant,
  amarant: IMAGES.spinazie,
  'rucola-sla': IMAGES.rucola,
  'kapuzijner-kers': IMAGES.oost_indische_kers,
  selderij: IMAGES.schermbloemige,
  kaasstelen: IMAGES.spinazie,
  stengelbiet: IMAGES.spinazie,
  zuringelambique: IMAGES.zuring,
  waterkers: IMAGES.waterkers,

  // -------------------------------------------------------------------------
  // Wortelgroenten (Root vegetables)
  // -------------------------------------------------------------------------
  wortel: IMAGES.wortel,
  biet: IMAGES.biet,
  radijs: IMAGES.wortel,
  knolselderij: IMAGES.knolgewassen,
  pastinaak: IMAGES.schermbloemige,
  schorseneer: IMAGES.schorsenere,
  koolraap: IMAGES.rapen,
  raap: IMAGES.rapen,
  rammenas: IMAGES.wortel,
  retichie: IMAGES.wortel,
  'schorseneel-wit': IMAGES.schorsenere,
  oca: IMAGES.knolgewassen,
  'kleine-radijs': IMAGES.wortel,

  // -------------------------------------------------------------------------
  // Koolgewassen (Cole crops / Cabbage family)
  // -------------------------------------------------------------------------
  broccoli: IMAGES.kool,
  boerenkool: IMAGES.kool,
  bloemkool: IMAGES.kool,
  spruitjes: IMAGES.kool,
  savooiekool: IMAGES.kool,
  'groene-kool': IMAGES.kool,
  'rode-kool': IMAGES.kool,
  bladkool: IMAGES.kool,
  skraelkool: IMAGES.kool,

  // -------------------------------------------------------------------------
  // Peulvruchten (Legumes)
  // -------------------------------------------------------------------------
  tuinboon: IMAGES.peulvruchten,
  snijboon: IMAGES.peulvruchten,
  doperwt: IMAGES.erwt,
  sugarsnap: IMAGES.erwt,
  'witte-boon': IMAGES.droge_peulvruchten,
  kapucijner: IMAGES.droge_peulvruchten,
  linzen: IMAGES.droge_peulvruchten,
  quinoa: IMAGES.droge_peulvruchten,
  erwtensoep: IMAGES.erwt,
  'acker-boon': IMAGES.peulvruchten,
  dubbelboon: IMAGES.peulvruchten,
  pronkboon: IMAGES.peulvruchten,
  limaboon: IMAGES.peulvruchten,
  schuimboon: IMAGES.peulvruchten,
  pronkerwt: IMAGES.erwt,

  // -------------------------------------------------------------------------
  // Kruiden (Herbs)
  // -------------------------------------------------------------------------
  // Mediterranean herbs
  basilicum: IMAGES.mediteraanse_kruiden,
  tijm: IMAGES.houtige_kruiden,
  oregano: IMAGES.mediteraanse_kruiden,
  rozemarijn: IMAGES.houtige_kruiden,
  salie: IMAGES.houtige_kruiden,
  majoraan: IMAGES.mediteraanse_kruiden,
  lavendel: IMAGES.lavendel,
  'salie-rood': IMAGES.houtige_kruiden,
  citroensalie: IMAGES.houtige_kruiden,

  // Parsley family (Schermbloemigen / Umbellifers)
  peterselie: IMAGES.peterselie,
  dille: IMAGES.schermbloemige,
  cilantro: IMAGES.schermbloemige,
  'koriander-zaad': IMAGES.schermbloemige,
  fennel: IMAGES.schermbloemige,
  kervel: IMAGES.schermbloemige,

  // Alliums (Ui family)
  knoflook: IMAGES.ajiun,
  ui: IMAGES.ajiun,
  bieslook: IMAGES.ajiun,

  // Mint family
  munt: IMAGES.munt,
  bergmunt: IMAGES.munt,
  appelmunt: IMAGES.munt,
  tuinmint: IMAGES.munt,

  // Tea herbs
  kamille: IMAGES.kamille,
  sleutelbloem: IMAGES.theekruid,
  'sleutelbloem-thee': IMAGES.theekruid,

  // Other herbs
  dragon: IMAGES.kruidplant,
  bezemkruid: IMAGES.kruidplant,
  goudsbloemkruid: IMAGES.goudsbloem,
  chia: IMAGES.kruidplant,
  maggiekruid: IMAGES.kruidplant,
  bonekruid: IMAGES.kruidplant,
  anijs: IMAGES.schermbloemige,
  mandarijnkruid: IMAGES.kruidplant,
  'champignon-kruid': IMAGES.kruidplant,
  reigersbek: IMAGES.kruidplant,
  borage: IMAGES.eetbare_bloem,
  roodlover: IMAGES.kruidplant,
  vogelvoet: IMAGES.kruidplant,
  studentenkruid: IMAGES.kruidplant,
  steentijm: IMAGES.houtige_kruiden,
  'goudsbloem-peterselie': IMAGES.goudsbloem,
  akkerwinde: IMAGES.kruidplant,

  // -------------------------------------------------------------------------
  // Eetbare bloemen (Edible flowers)
  // -------------------------------------------------------------------------
  'eetbare-bloem': IMAGES.eetbare_bloem,
};

// =============================================================================
// DEFAULT FALLBACKS BY CATEGORY
// =============================================================================

const CATEGORY_ICON_FALLBACKS: Record<string, ImageSourcePropType> = {
  vruchtgroenten: ICONS.tomaat,
  bladgroenten: ICONS.sla,
  wortelgroenten: ICONS.wortel,
  koolgewassen: ICONS.kool,
  peulvruchten: ICONS.peulvruchten,
  kruiden: ICONS.kruidplant,
};

const CATEGORY_IMAGE_FALLBACKS: Record<string, ImageSourcePropType> = {
  vruchtgroenten: IMAGES.tomaat,
  bladgroenten: IMAGES.sla,
  wortelgroenten: IMAGES.wortel,
  koolgewassen: IMAGES.kool,
  peulvruchten: IMAGES.peulvruchten,
  kruiden: IMAGES.kruidplant,
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get plant icon by ID
 * Returns the specific icon if available, otherwise returns undefined
 */
export function getPlantIcon(plantId: string): ImageSourcePropType | undefined {
  return PLANT_ICONS[plantId];
}

/**
 * Get plant image by ID
 * Returns the specific image if available, otherwise returns undefined
 */
export function getPlantImage(plantId: string): ImageSourcePropType | undefined {
  return PLANT_IMAGES[plantId];
}

/**
 * Get plant icon with category fallback
 * Returns the specific icon if available, otherwise returns category fallback
 */
export function getPlantIconWithFallback(
  plantId: string,
  category?: string
): ImageSourcePropType {
  const icon = PLANT_ICONS[plantId];
  if (icon) return icon;

  if (category && CATEGORY_ICON_FALLBACKS[category]) {
    return CATEGORY_ICON_FALLBACKS[category];
  }

  return ICONS.kruidplant; // Ultimate fallback
}

/**
 * Get plant image with category fallback
 * Returns the specific image if available, otherwise returns category fallback
 */
export function getPlantImageWithFallback(
  plantId: string,
  category?: string
): ImageSourcePropType {
  const image = PLANT_IMAGES[plantId];
  if (image) return image;

  if (category && CATEGORY_IMAGE_FALLBACKS[category]) {
    return CATEGORY_IMAGE_FALLBACKS[category];
  }

  return IMAGES.kruidplant; // Ultimate fallback
}

/**
 * Check if a plant has a custom icon
 */
export function hasPlantIcon(plantId: string): boolean {
  return plantId in PLANT_ICONS;
}

/**
 * Check if a plant has a custom image
 */
export function hasPlantImage(plantId: string): boolean {
  return plantId in PLANT_IMAGES;
}
