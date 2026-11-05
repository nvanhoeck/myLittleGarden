# Time Planning UI Brief (slice 3)

Source: android-ux-designer, 2026-11-04. Accepted by PM: slot shows only the
start date (full range in caption + a11y); the Info bar moves into the header subtitle.

## Observations
- Tailwind tokens: primary #5DB075, primary-container #00532A, on-primary-container #78D892,
  surface-variant #3F4945, outline #899389, error #FFB4AB, warning #FFA726, `touch-target` 48px.
  Use tokens for all new parts.
- New BEM CSS in `src/styles/planning/*.css` (pattern: `src/styles/ai/chat.css`).
- i18n: add a `planning` block to `src/i18n/nl.json`.
- The canvas already has red collision fill (#dc2626), a lock badge and a patch rect.
- Existing bug: ComponentDetailScreen calls useMemo after the early `return`. Put new hooks above it (and fix that one).

## 1. Layout (360dp, top to bottom)
Fixed:
- Header 56: keep 🤖, ✨ (AI optimize), +. The subtitle shows outer/inner size; the Info bar is removed.
- Year bar 40: `‹ 2026 ›` left (48dp targets via hitSlop); the Canvas/Lijst toggle as a small segmented control on the right (replaces the 52dp toggle row).
- Week strip 52 + zone band 28 in ONE horizontal ScrollView, so they scroll together.
- Towers only: TowerLayerTabs 48, with the "Laag 2: 80 x 60 cm" caption inside the tab row.
- "Te plannen (n)" accordion header 48, collapsed, directly above the bottom bar.
- Bottom bar 56: [Herschikken] [Opnieuw beginnen], always visible.
Flexible:
- Canvas flex-1 with 8dp padding. The hint text moves into a canvas overlay.
- Expanded accordion = overlay panel anchored above the bottom bar, max 40% height, scrolls inside. The canvas does not resize.
- Lock/edit controls stay in the canvas toolbar.

## 2. Week slots and zones
- Slot 72w x 52h. Line 1 "W18" (label-large); line 2 "27 apr" (label-small, Monday of the week).
  The full range "W18 · 27 apr – 3 mei" is in a caption chip above the canvas and in the contentDescription.
- 6dp dot at the bottom = week has active plants. Empty week: text on-surface-variant at 60%.
- States:
  - default: transparent bg, on-surface-variant text
  - current week: 1dp outline ring + tiny "nu" tag
  - inside the selected zone: primary-container tint + 2dp primary underline
  - selected single week: solid primary bg, on-primary text
- Zone band: segments weeks*72 wide, 28 high, alternating surface-variant and primary-container/60.
  Label "3 planten" (label-small), or "3" when the segment is under 2 weeks wide; an empty zone shows "leeg" in outline colour. Segments under 48dp get hitSlop.
- Tap a segment: 2dp primary border, its slots get the zone tint, the displayed week is its first week, caption "W18 - W24 · 3 planten".
- Tap a slot: only that slot is solid; the containing segment gets a subtle top marker.
- Auto-scroll (animated, centred) on mount, on year change and on zone select. No scroll when the tapped slot is fully visible. Default selection: the current week (week 1 in other years).

## 3. Canvas footprints
- Rect: fill primary-container at 85%, 1.5dp primary border, radius 4, icon centred.
- Name only when the shorter side is ≥44dp; icon only from 20dp; below 20dp a plain filled square; below 12dp no badges (name goes in the caption chip when selected).
- hitSlop to a 48dp minimum.
- Conflict: fill #dc2626, 2dp error border, "!" badge (existing).
- Locked: existing lock badge + solid on-surface-variant border.
- Selected: 2dp white border.
- Patch/thinning keep their amber/orange styling.
- Conflict = footprints overlap with positive area AND the periods share weeks (domain `footprintsConflict`).

## 4. "Te plannen"
- Header "Te plannen (6)" + chevron.
- Rows grouped per plant: icon, name, "×3", reason (body-small, warning colour), ✕ (48dp).
  Removing always asks for confirmation (Alert, "Verwijderen" destructive) and removes one item per tap.
- Reason from planningStore after a run; before any run "Nog niet ingepland" in outline colour.
  noSpace → "Geen plaats in week 18-24"; noPlantingWindow → "Geen plantperiode bekend".
- Empty state: 🌱 "Alles is ingepland" + "Tik op + om planten toe te voegen".

## 5. Actions
- Herschikken: tonal (primary-container). Opnieuw beginnen: outlined, error text.
- Disabled (40% opacity, accessibilityState.disabled) when `hasAnythingToPlan` is false, and while running (spinner).
- Start over dialog: title "Opnieuw beginnen?", message "Alle niet-vergrendelde planten worden opnieuw ingedeeld voor {{year}}. Vergrendelde planten blijven staan.", buttons "Annuleren" / "Opnieuw beginnen" (destructive).
- Snackbar above the bar, 4s, shown by the screen:
  "8 geplaatst, 2 passen niet" + "Bekijk" (opens the accordion) | "Alles geplaatst (8)" | "Niets kon worden geplaatst".

## 6. Atomic breakdown (all dumb; ViewModels built in the screen/hook)
Atoms:
- PlanningButton {label, variant: 'tonal'|'outlined-danger', disabled, loading, onPress, testID} — .planning-button, --tonal, --danger, --disabled
- WeekSlot {weekLabel, dateLabel, hasPlants, isSelected, isCurrent, isInZone, onPress} — .week-slot, --selected, --current, --in-zone, --empty; __week, __date, __dot
- Snackbar {message, actionLabel?, onAction?, visible} — .snackbar, __message, __action
Molecules:
- YearBar {year, onPrev, onNext, canPrev, canNext} — .year-bar, __arrow, __year
- TimeZoneSegment {widthPx, label, isSelected, isEmpty, tone: 0|1, onPress} — .zone-segment, --selected, --empty, --tone-a, --tone-b
- ToPlanRow {iconKey, name, count, reasonText?, onRemove} — .to-plan-row, __reason, __remove
- FootprintLabel {name, icon, size} (optional, inside the canvas)
Organisms:
- WeekTimeline {weeks: {id, weekLabel, dateLabel, hasPlants, isCurrent}[], zones: {startIndex, endIndex, label, isEmpty}[], selection: {kind: 'week'|'zone', index}, onSelectWeek, onSelectZone} — .week-timeline, __scroll, __band
- ToPlanAccordion {groups, expanded, onToggle, onRemove} — .to-plan-accordion, __header, __body, __empty
- PlanningActionBar {canRearrange, canStartOver, isRunning, onRearrange, onStartOver} — .planning-action-bar
- PlantPlacementCanvas: new props `footprints` (cm rects) and `conflictIds`; draws rects instead of circles.

## 7. Accessibility and testIDs
- All targets ≥48dp (hitSlop where the visual is smaller). accessibilityRole=button and accessibilityState {selected, disabled} on slots, segments and buttons.
- testIDs: planning-year-prev, planning-year-next, planning-year-label, planning-week-{year}-{n},
  planning-zone-{startWeek}, planning-to-plan-header, planning-to-plan-row-{plantId},
  planning-to-plan-remove-{plantId}, planning-rearrange, planning-start-over, planning-snackbar,
  planning-footprint-{instanceId}
- contentDescriptions: "Week 18, 27 april tot 3 mei, 3 planten, geselecteerd"; "Zone week 18 tot 24, 3 planten"; "Vorig jaar"; "Volgend jaar"; "{{name}} verwijderen uit te plannen lijst".
- Colour is never the only signal (conflicts have a "!" badge; selection has an underline).

## 8. i18n (`planning` block in src/i18n/nl.json)
- year.previous "Vorig jaar"; year.next "Volgend jaar"
- week.label "W{{week}}"; week.current "nu"; week.a11y "Week {{week}}, {{range}}, {{count}} planten"; week.selected "geselecteerd"
- zone.plants "{{count}} planten"; zone.empty "leeg"; zone.caption "W{{start}} - W{{end}} · {{count}} planten"; zone.a11y "Zone week {{start}} tot {{end}}, {{count}} planten"
- toPlan.title "Te plannen ({{count}})"; toPlan.notYetPlanned "Nog niet ingepland"; toPlan.empty "Alles is ingepland"; toPlan.emptyHint "Tik op + om planten toe te voegen"; toPlan.remove "{{name}} verwijderen uit te plannen lijst"; toPlan.removeConfirm "{{name}} verwijderen?"
- reason.noSpace "Geen plaats in week {{start}}-{{end}}"; reason.noPlantingWindow "Geen plantperiode bekend"
- actions.rearrange "Herschikken"; actions.startOver "Opnieuw beginnen"
- startOver.title "Opnieuw beginnen?"; startOver.message "Alle niet-vergrendelde planten worden opnieuw ingedeeld voor {{year}}. Vergrendelde planten blijven staan."
- result.placed "{{placed}} geplaatst, {{unplaced}} passen niet"; result.allPlaced "Alles geplaatst ({{count}})"; result.nonePlaced "Niets kon worden geplaatst"; result.view "Bekijk"
- conflict.warning "Overlap met een andere plant in deze week"
- Dialog buttons reuse common.cancel / common.delete.
