// TODO for niko, check if spacing radius overlaps

# My Little Garden - Implementation Roadmap

## Completed Phases

### Phase 1: Foundation & Environment Setup ✅
- [x] Splash screen with logo
- [x] Environment setup wizard (fros``t dates, garden dimensions)
- [x] Settings screen
- [x] Navigation infrastructure
- [x] State management with Zustand (persisted)
- [x] i18n setup with Dutch translations
- [x] Theme configuration with NativeWind

### Phase 2: Component Management ✅
- [x] Domain models (GardenBox, Pot, RectangularTower, CircularTower)
- [x] Component store with CRUD operations
- [x] Home screen with infinite canvas
- [x] Component creation modal
- [x] Component inventory accordion

### Phase 3: Component Placement & Interaction ✅
- [x] 3.1: Place components from inventory onto canvas
- [x] 3.2: Move & rotate placed components (15° snap)
- [x] 3.3: Edit/Delete components via long press menu
- [x] 3.4: Return components to inventory

---

## Remaining Phases

### Phase 4: Plant Placement System ✅

#### 4.1: Component Detail View ✅
**User Value**: Users can open a component and see available space for plants

**Scope**:
- Tap placed component to open detail view
- Zoomed view of component interior
- Shows component dimensions and available space
- "Add Plant" button to open plant selection
- Back button returns to home

**Acceptance Criteria**:
- [x] Component detail screen exists in navigation
- [x] Screen shows component name and dimensions
- [x] Scaled view of component interior
- [x] Empty state shows "No plants yet"
- [x] Navigation works bidirectionally

---

#### 4.2: Plant Selection Grid ✅
**User Value**: Users can browse and select plants to add to components

**Scope**:
- Grid view of plants organized by category
- Category accordion/tabs (vruchtgroenten, bladgroenten, kruiden, etc.)
- Plant tile shows icon, Dutch name, spacing radius
- Search/filter by name
- Quantity selector (1-10)

**Acceptance Criteria**:
- [x] Plant selection screen exists
- [x] Plants load from store (plants.json)
- [x] Categories organize plants correctly
- [x] Tapping plant shows selection state
- [x] Quantity can be adjusted
- [x] "Add to Garden" button enabled when plant selected

---

#### 4.3: Plant Placement with Spacing Validation ✅
**User Value**: Users can place plants in components with proper spacing

**Scope**:
- Drag plant onto component interior
- Visual spacing radius indicator (circle around plant)
- Red indicator if overlapping another plant's radius
- Green indicator if placement is valid
- Tap to confirm placement

**Acceptance Criteria**:
- [x] Selected plant can be dragged onto component
- [x] Spacing radius visualized as circle
- [x] Collision detection prevents invalid placement
- [x] Valid placement shows green indicator
- [x] Placed plant stored with position in component
- [x] Cannot place outside component bounds

---

#### 4.4: Companion Plant Indicators ✅
**User Value**: Users see which nearby plants are beneficial or harmful

**Scope**:
- When placing a plant, show companion indicators
- Green indicators for beneficial companions nearby
- Red indicators for combative plants nearby
- Tooltip showing benefit/harm type (e.g., "Weert ongedierte")
- Does not prevent placement (informational only)

**Acceptance Criteria**:
- [x] Companion relationships calculated from plant store
- [x] Green indicators appear for companions within range
- [x] Red indicators appear for combatives within range
- [x] Tapping indicator shows benefit/harm detail
- [x] Indicators update in real-time during placement

---

### Phase 5: Plant Information & Calendar ✅

#### 5.1: Plant Details Screen ✅
**User Value**: Users can view comprehensive plant information

**Scope**:
- Plant image carousel (placeholder images for now)
- Scientific name, category, description
- Quick Info grid (spacing, depth, sun, water, season, frost, height, germination, soil pH)
- Growing calendar timeline
- Companions and combatives lists with benefit/harm indicators
- Navigation from placed plant or plant selection

**Acceptance Criteria**:
- [x] Plant details screen exists in navigation
- [x] All plant data displayed correctly
- [x] Quick Info uses card grid layout (3 columns)
- [x] Calendar shows start/transplant/sow date ranges
- [x] Companion/Combative sections show related plants with icons
- [x] Back navigation works

---

#### 5.2: Growing Calendar Calculations ✅
**User Value**: Users see personalized planting dates based on their frost dates

**Scope**:
- Calculate indoor start date from spring frost + plant's indoorStartWeeks
- Calculate transplant date from spring frost + plant's transplantWeeks
- Calculate direct sow date from spring frost + plant's directSowWeeks
- Display as date ranges (e.g., "15 maart - 30 maart")
- Visual timeline component with color-coded phases

**Acceptance Criteria**:
- [x] Dates calculated correctly from user's frost dates
- [x] All three phases shown (if applicable for plant)
- [x] Dates display in Dutch locale
- [x] Timeline visualizes phases with color coding
- [x] Handles plants with null values (e.g., no indoor start)

---

#### 5.3: Plant Management in Components ✅
**User Value**: Users can view and manage plants within a component

**Scope**:
- List of plants in component detail view
- Tap plant to view plant details
- Long press plant for remove option
- Show plant count and spacing usage

**Acceptance Criteria**:
- [x] Plants listed in component detail view
- [x] Tap opens plant details screen
- [x] Long press shows remove confirmation
- [x] Plant count displayed
- [x] Visual representation of plants in component

---

### Phase 6: Data & Export (Future)

#### 6.1: Garden Export to JSON
- [ ] Export complete garden configuration
- [ ] Include all components and plants
- [ ] Include environment settings
- [ ] Share functionality

#### 6.2: Plant Database Expansion
- [ ] Add more plants to plants.json
- [ ] Verify companion/combative relationships
- [ ] Add plant images

#### 6.3: Garden Import
- [ ] Import garden from JSON file
- [ ] Validate imported data
- [ ] Merge or replace existing garden

---

## Navigation Structure (Target)

```
Splash
  └── EnvironmentSetup (first time)
        └── Home
              ├── Settings
              ├── ComponentDetail (tap component)
              │     ├── PlantSelection (add plant)
              │     └── PlantDetails (tap plant)
              └── PlantDetails (from anywhere)
```

---

## Key Files to Create/Modify

### Phase 4
- `src/screens/ComponentDetailScreen/` - New screen
- `src/screens/PlantSelectionScreen/` - New screen
- `src/navigation/navigationTypes.ts` - Add new routes
- `src/navigation/RootNavigator.tsx` - Add new screens
- `src/stores/componentStore.ts` - Add plant placement to components
- `src/types/component.types.ts` - Add plants array to components

### Phase 5
- `src/screens/PlantDetailsScreen/` - New screen
- `src/components/organisms/GrowingCalendar/` - New component
- `src/components/organisms/QuickInfoGrid/` - New component
- `src/components/organisms/CompanionList/` - New component
- `src/utils/calendarCalculations.ts` - Date calculation utilities
