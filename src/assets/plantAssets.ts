/**
 * Plant image assets
 * Maps plant IDs to their icon and image assets
 *
 * Icons/images follow a hierarchy:
 * 1. Direct plant match (e.g., tomaat.png for tomaat)
 * 2. Category/type fallback (e.g., kool.png for broccoli)
 */
import {ImageSourcePropType} from 'react-native';

// =============================================================================
// ICON ASSETS - Available in assets/plants/icons/
// =============================================================================
// -------------------------------------------------------------------------
// NEW: Direct plant icons (generated)
// -------------------------------------------------------------------------

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
    tomaat: require('../../assets/plants/icons/cherry-tomaat.png'),
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
    kers: require('../../assets/plants/icons/kers.png'),
    'blauwe-bes': require('../../assets/plants/icons/blauwe-bes.png'),
    braam: require('../../assets/plants/icons/braam.png'),
    framboos: require('../../assets/plants/icons/framboos.png'),
    kruisbes: require('../../assets/plants/icons/kruisbes.png'),
    aalbes: require('../../assets/plants/icons/aalbes.png'),
    druif: require('../../assets/plants/icons/druif.png'),
    walnoot: require('../../assets/plants/icons/walnoot.png'),
    hazelnoot: require('../../assets/plants/icons/hazelnoot.png'),
    prei: require('../../assets/plants/icons/prei.png'),
    aardappel: require('../../assets/plants/icons/aardappel.png'),
    artisjok: require('../../assets/plants/icons/artisjok.png'),
    'maïs': require('../../assets/plants/icons/maïs.png'),
    citroenmelisse: require('../../assets/plants/icons/citroenmelisse.png'),
    bonenkruid: require('../../assets/plants/icons/bonenkruid.png'),
    karwij: require('../../assets/plants/icons/karwij.png'),
    komijn: require('../../assets/plants/icons/komijn.png'),
    laurier: require('../../assets/plants/icons/laurier.png'),
    pepermunt: require('../../assets/plants/icons/pepermunt.png'),
    graan: require('../../assets/plants/icons/graan.png'),
    tarwe: require('../../assets/plants/icons/graan.png'),
    gerst: require('../../assets/plants/icons/graan.png'),
    rogge: require('../../assets/plants/icons/graan.png'),
    haver: require('../../assets/plants/icons/graan.png'),
    spelt: require('../../assets/plants/icons/graan.png'),
    salie: require('../../assets/plants/icons/salie.png'),
    perzik: require('../../assets/plants/icons/perzik.png'),
    boerenkool: require('../../assets/plants/icons/boerenkool.png'),
    witlof: require('../../assets/plants/icons/witloof.png'),
    meloen: require('../../assets/plants/icons/meloen.png'),
    radijs: require('../../assets/plants/icons/radijs.png'),
    rammenas: require('../../assets/plants/icons/ramenas.png'),
    broccoli: require('../../assets/plants/icons/broccoli.png'),
    bloemkool: require('../../assets/plants/icons/bloemkool.png'),
    spruitjes: require('../../assets/plants/icons/spruitjes.png'),
    tijm: require('../../assets/plants/icons/tijm.png'),
    oregano: require('../../assets/plants/icons/oregano.png'),
    limoen:require('../../assets/plants/icons/limoen.png'),
    citroen:require('../../assets/plants/icons/citroen.png'),
    saffraan:require('../../assets/plants/icons/saffraan.png'),
    struikboon:require('../../assets/plants/icons/struikboon.png'),
    pruimen:require('../../assets/plants/icons/pruimen.png'),
    krieken:require('../../assets/plants/icons/krieken.png'),
    koriander:require('../../assets/plants/icons/koriander.png'),
    zonnebloem:require('../../assets/plants/icons/zonnebloem.png'),
    augurk:require('../../assets/plants/icons/augurk.png'),
    rijst:require('../../assets/plants/icons/rijst.png'),
    chilipeper:require('../../assets/plants/icons/chili-peper.png'),
    kastanje:require('../../assets/plants/icons/kastanje.png'),
    rozemarijn:require('../../assets/plants/icons/rozemarijn.png'),
    'cherry-tomaat': require('../../assets/plants/icons/tomaat.png'),
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
    tomaat: require('../../assets/plants/images/cherry-tomaat.png'),
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

    // -------------------------------------------------------------------------
    // NEW: Direct plant images (generated)
    // -------------------------------------------------------------------------
    kers: require('../../assets/plants/images/kers.png'),
    'blauwe-bes': require('../../assets/plants/images/blauwe-bes.png'),
    braam: require('../../assets/plants/images/braam.png'),
    framboos: require('../../assets/plants/images/framboos.png'),
    kruisbes: require('../../assets/plants/images/kruisbes.png'),
    aalbes: require('../../assets/plants/images/aalbes.png'),
    druif: require('../../assets/plants/images/druif.png'),
    walnoot: require('../../assets/plants/images/walnoot.png'),
    hazelnoot: require('../../assets/plants/images/hazelnoot.png'),
    prei: require('../../assets/plants/images/prei.png'),
    aardappel: require('../../assets/plants/images/aardappel.png'),
    artisjok: require('../../assets/plants/images/artisjok.png'),
    'maïs': require('../../assets/plants/images/maïs.png'),
    citroenmelisse: require('../../assets/plants/images/citroenmelisse.png'),
    bonenkruid: require('../../assets/plants/images/bonenkruid.png'),
    karwij: require('../../assets/plants/images/karwij.png'),
    komijn: require('../../assets/plants/images/komijn.png'),
    laurier: require('../../assets/plants/images/laurier.png'),
    pepermunt: require('../../assets/plants/images/pepermunt.png'),
    graan: require('../../assets/plants/images/graan.png'),
    tarwe: require('../../assets/plants/images/graan.png'),
    gerst: require('../../assets/plants/images/graan.png'),
    rogge: require('../../assets/plants/images/graan.png'),
    haver: require('../../assets/plants/images/graan.png'),
    spelt: require('../../assets/plants/images/graan.png'),
    salie: require('../../assets/plants/images/salie.png'),
    perzik: require('../../assets/plants/images/perzik.png'),
    boerenkool: require('../../assets/plants/images/boerenkool.png'),
    witlof: require('../../assets/plants/images/witloof.png'),
    meloen: require('../../assets/plants/images/meloen.png'),
    radijs: require('../../assets/plants/images/radijs.png'),
    rammenas: require('../../assets/plants/images/ramenas.png'),
    broccoli: require('../../assets/plants/images/broccoli.png'),
    bloemkool: require('../../assets/plants/images/bloemkool.png'),
    spruitjes: require('../../assets/plants/images/spruitjes.png'),
    tijm: require('../../assets/plants/images/tijm.png'),
    oregano: require('../../assets/plants/images/oregano.png'),
    rozemarijn: require('../../assets/plants/images/rozemarijn.png'),
    limoen:require('../../assets/plants/images/limoen.png'),
    citroen:require('../../assets/plants/images/citroen.png'),
    saffraan:require('../../assets/plants/images/saffraan.png'),
    struikboon:require('../../assets/plants/images/struikboon.png'),
    pruimen:require('../../assets/plants/images/pruimen.png'),
    krieken:require('../../assets/plants/images/krieken.png'),
    koriander:require('../../assets/plants/images/koriander.png'),
    zonnebloem:require('../../assets/plants/images/zonnebloem.png'),
    augurk:require('../../assets/plants/images/augurk.png'),
    rijst:require('../../assets/plants/images/rijst.png'),
    chilipeper:require('../../assets/plants/images/chili-peper.png'),
    kastanje:require('../../assets/plants/images/kastanje.png'),
    'cherry-tomaat': require('../../assets/plants/images/tomaat.png'),

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
    meloen: ICONS.meloen, // Similar to cucumber family
    watermeloen: ICONS.meloen,
    asperge: ICONS.asperge,
    rodovichy: ICONS.tomaat,
    'spaanse-peper': ICONS.chilipeper,
    cherimoya: ICONS.citrusbomen,
    vlierbes: ICONS.kruisbes,
    perzik: ICONS.perzik,

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
    witlof: ICONS.witlof,
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
    radijs: ICONS.radijs, // No specific radijs icon, use wortel
    knolselderij: ICONS.schermbloemigen,
    pastinaak: ICONS.schermbloemigen,
    schorseneer: ICONS.schorseneer,
    koolraap: ICONS.koolraap,
    raap: ICONS.koolraap,
    rammenas: ICONS.rammenas,
    retichie: ICONS.wortel,
    'schorseneel-wit': ICONS.schorseneer,
    oca: ICONS.oca,
    'kleine-radijs': ICONS.radijs,

    // -------------------------------------------------------------------------
    // Koolgewassen (Cole crops / Cabbage family)
    // -------------------------------------------------------------------------
    broccoli: ICONS.broccoli,
    boerenkool: ICONS.boerenkool,
    bloemkool: ICONS.bloemkool,
    spruitjes: ICONS.spruitjes,
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
    tijm: ICONS.tijm,
    oregano: ICONS.oregano,
    rozemarijn: ICONS.rozemarijn,
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
    steentijm: ICONS.tijm,
    'goudsbloem-peterselie': ICONS.goudsbloem,
    akkerwinde: ICONS.kruidplant,

    // -------------------------------------------------------------------------
    // Eetbare bloemen (Edible flowers)
    // -------------------------------------------------------------------------
    'eetbare-bloem': ICONS.eetbare_bloem,

    // -------------------------------------------------------------------------
// NEW: Vruchtgewassen (Fruit fruits / berries / trees)
// -------------------------------------------------------------------------
    kers: ICONS.kers,
    'blauwe-bes': ICONS['blauwe-bes'],
    braam: ICONS.braam,
    framboos: ICONS.framboos,
    kruisbes: ICONS.kruisbes,
    aalbes: ICONS.aalbes,
    druif: ICONS.druif,
    walnoot: ICONS.walnoot,
    hazelnoot: ICONS.hazelnoot,

// -------------------------------------------------------------------------
// NEW: Bladgroenten (Leaf vegetables)
// -------------------------------------------------------------------------
    prei: ICONS.prei,

// -------------------------------------------------------------------------
// NEW: Wortelgroenten (Root vegetables)
// -------------------------------------------------------------------------
    aardappel: ICONS.aardappel,

// -------------------------------------------------------------------------
// NEW: Groenten / overig
// -------------------------------------------------------------------------
    artisjok: ICONS.artisjok,
    'maïs': ICONS['maïs'],

// -------------------------------------------------------------------------
// NEW: Kruiden (Herbs)
// -------------------------------------------------------------------------
    citroenmelisse: ICONS.citroenmelisse,
    bonenkruid: ICONS.bonenkruid,
    karwij: ICONS.karwij,
    komijn: ICONS.komijn,
    laurier: ICONS.laurier,
    pepermunt: ICONS.pepermunt,
    limoen: ICONS.limoen,
    citroen: ICONS.citroen,
    saffraan: ICONS.saffraan,
    struikboon: ICONS.struikboon,
    pruimen: ICONS.pruimen,
    krieken: ICONS.krieken,
    koriander: ICONS.koriander,
    zonnebloem: ICONS.zonnebloem,
    augurk: ICONS.augurk,
    rijst: ICONS.rijst,
    chilipeper: ICONS.chilipeper,
    kastanje: ICONS.kastanje,
    'cherry-tomaat': ICONS['cherry-tomaat']

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
    meloen: IMAGES.meloen,
    watermeloen: IMAGES.meloen,
    asperge: IMAGES.asperge,
    rodovichy: IMAGES.tomaat,
    'spaanse-peper': IMAGES.chilipeper,
    cherimoya: IMAGES.citrusbomen,
    vlierbes: IMAGES.kruisbes,

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
    witlof: IMAGES.witlof,
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
    radijs: IMAGES.radijs,
    knolselderij: IMAGES.knolgewassen,
    pastinaak: IMAGES.schermbloemige,
    schorseneer: IMAGES.schorsenere,
    koolraap: IMAGES.rapen,
    raap: IMAGES.rapen,
    rammenas: IMAGES.rammenas,
    retichie: IMAGES.wortel,
    'schorseneel-wit': IMAGES.schorsenere,
    oca: IMAGES.knolgewassen,
    'kleine-radijs': IMAGES.radijs,

    // -------------------------------------------------------------------------
    // Koolgewassen (Cole crops / Cabbage family)
    // -------------------------------------------------------------------------
    broccoli: IMAGES.broccoli,
    boerenkool: IMAGES.boerenkool,
    bloemkool: IMAGES.bloemkool,
    spruitjes: IMAGES.spruitjes,
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
    tijm: IMAGES.tijm,
    oregano: IMAGES.oregano,
    rozemarijn: IMAGES.rozemarijn,
    salie: IMAGES.salie,
    majoraan: IMAGES.mediteraanse_kruiden,
    lavendel: IMAGES.lavendel,
    'salie-rood': IMAGES.salie,
    citroensalie: IMAGES.salie,

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
    steentijm: IMAGES.tijm,
    'goudsbloem-peterselie': IMAGES.goudsbloem,
    akkerwinde: IMAGES.kruidplant,

    // -------------------------------------------------------------------------
    // Eetbare bloemen (Edible flowers)
    // -------------------------------------------------------------------------
    'eetbare-bloem': IMAGES.eetbare_bloem,
    // -------------------------------------------------------------------------
// NEW: Vruchten (Fruits / berries / trees)
// -------------------------------------------------------------------------
    kers: IMAGES.kers,
    'blauwe-bes': IMAGES['blauwe-bes'],
    braam: IMAGES.braam,
    framboos: IMAGES.framboos,
    kruisbes: IMAGES.kruisbes,
    aalbes: IMAGES.aalbes,
    druif: IMAGES.druif,
    walnoot: IMAGES.walnoot,
    hazelnoot: IMAGES.hazelnoot,

// -------------------------------------------------------------------------
// NEW: Bladgroenten
// -------------------------------------------------------------------------
    prei: IMAGES.prei,

// -------------------------------------------------------------------------
// NEW: Wortelgroenten
// -------------------------------------------------------------------------
    aardappel: IMAGES.aardappel,

// -------------------------------------------------------------------------
// NEW: Overige groenten
// -------------------------------------------------------------------------
    artisjok: IMAGES.artisjok,
    'maïs': IMAGES['maïs'],

// -------------------------------------------------------------------------
// NEW: Kruiden
// -------------------------------------------------------------------------
    citroenmelisse: IMAGES.citroenmelisse,
    bonenkruid: IMAGES.bonenkruid,
    karwij: IMAGES.karwij,
    komijn: IMAGES.komijn,
    laurier: IMAGES.laurier,
    pepermunt: IMAGES.pepermunt,
    perzik: IMAGES.perzik,

    limoen: IMAGES.limoen,
    citroen: IMAGES.citroen,
    saffraan: IMAGES.saffraan,
    struikboon: IMAGES.struikboon,
    pruimen: IMAGES.pruimen,
    krieken: IMAGES.krieken,
    koriander: IMAGES.koriander,
    zonnebloem: IMAGES.zonnebloem,
    augurk: IMAGES.augurk,
    rijst: IMAGES.rijst,
    chilipeper: IMAGES.chilipeper,
    kastanje: IMAGES.kastanje,
    'cherry-tomaat': IMAGES['cherry-tomaat']
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
    fruit: ICONS["blauwe-bes"],
    groenten: ICONS.prei,
    graan: ICONS.graan
};

const CATEGORY_IMAGE_FALLBACKS: Record<string, ImageSourcePropType> = {
    vruchtgroenten: IMAGES.tomaat,
    bladgroenten: IMAGES.sla,
    wortelgroenten: IMAGES.wortel,
    koolgewassen: IMAGES.kool,
    peulvruchten: IMAGES.peulvruchten,
    kruiden: IMAGES.kruidplant,
    fruit: IMAGES["blauwe-bes"],
    groenten: IMAGES.prei,
    graan: IMAGES.graan
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
