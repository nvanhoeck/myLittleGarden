# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

My Little Garden is a React Native mobile app for Android that helps users plan vegetable and herb gardens. It optimizes plant placement based on spacing requirements, companion planting relationships, and microclimate considerations. The app runs offline (except for AI suggestions) and takes inspiration from the Planter app with additional customization and AI features.

## Tech Stack

- **Framework**: React Native with TypeScript
- **Styling**: NativeWind with BEM notation (classes in separate CSS files using @apply)
- **State Management**: Zustand (persisted to device storage for offline use)
- **Validation**: Zod
- **UI Testing**: Maestro
- **Language**: Dutch (with i18n setup)
- **Units**: Meters and centimeters

## Architecture

### Layer Separation
The codebase follows Clean Architecture with strict separation:
- **UI Models**: DTOs and ViewModels for presentation (no business logic)
- **Domain Models**: Rich entities with encapsulated behavior (non-anemic)
- **Storage Models**: Persistence-specific representations

### Design Principles
- KISS (Keep It Simple, Stupid)
- DDD (Domain-Driven Design) with ubiquitous language
- BDD (Behavior-Driven Development)
- SOLID principles
- Clean naming focused on domain terms, not technical jargon

### Component Structure
UI components follow Atomic Design and are purely presentational (dumb components). Place NativeWind utility classes in separate CSS files using BEM notation:

```css
/* button.css */
.button--primary {
  @apply bg-green-600 px-4 py-2 rounded-lg;
}
```

## Domain Concepts

### Core Entities
- **Garden**: Contains size (meters), sun direction (16 cardinal directions), frost dates (spring/fall)
- **Component**: Garden boxes, pots, rectangular towers, circular towers - each with name, creation timestamp, size, coordinates, border width
- **Tower Layers**: Towers have multiple layers with decreasing sizes from bottom to top
- **Plant**: Placed within components, has spacing radius, companion/hostile relationships

### Plant Relationships
- **Companion**: Beneficial relationships (green indicator) - give/receive/mutual benefits
- **Combative/Hostile**: Harmful relationships (red indicator)
- **Neutral**: No significant interaction

### Growing Calendar
Based on user's frost dates, calculates: indoor start dates, transplant dates, outdoor sowing dates

## Key Screens

1. **Splash Screen**: Logo display (assets/splash.png)
2. **Environment Screen**: First-time setup for sun direction and frost dates
3. **Home Screen**: Garden view with draggable/rotatable components, pannable canvas
4. **Component Detail Screen**: Zoomed view for placing plants with companion indicators
5. **Add Plant Screen**: Grid selection with quantity controls
6. **Plant Details Screen**: Full plant information including growing calendar, companions, care instructions
7. **Settings Screen**: Garden size, export to JSON

## UX Patterns

- Long press on components: Edit/delete options (only when empty)
- Drag-and-drop: For placing components (15-degree rotation) and plants
- Accordion lists: For component and plant inventories
- Confirmation dialogs: Required for all destructive actions
- Back button: Always available on every screen

## Reference Screenshots

Design reference screenshots from the Planter app are in `screenshots/`. Use these as UI/UX inspiration:

| Screenshot | Shows |
|------------|-------|
| `plant_info.png` | Plant header with image carousel, scientific name, category, description |
| `quick_info.png` | Quick Info grid: Spacing, Depth, Sun, Water, Season, Frost, Height, Germination, Germination Temp, Sprout to Harvest, Soil pH, Seedling ID |
| `plant_calendar.png` | Growing Calendar timeline with Start Inside, Transplant, Sow Outside date ranges + Varieties list |
| `companion_and_combative_plants.png` | Companion Plants (with benefit tags like "Deters Pests"), Combative Plants (with harm tags like "Attracts Pests", "Depletes Nutrients"), Nutrition, Pests, Diseases |
| `diseases_beneficial_critters.png` | Diseases grid, Beneficial Critters grid, Growing from Seed instructions |
| `more_info.png` | Planting Considerations, Feeding, Harvest text sections |
| `plant_list.png` | Plant selection grid organized by category (Cole Crops, Flowers, etc.) with icons and variety dropdowns |

### Key UI Elements from Screenshots

- **Dark theme** with nature-inspired color palette
- **Card-based Quick Info grid** (3 columns) with icons and values
- **Timeline calendar** showing growing periods with color-coded phases
- **Relationship indicators**: Icons showing what companions give/receive (e.g., "Deters Pests" icon)
- **Image grids** for pests, diseases, beneficial critters
- **Plant tiles**: Icon + name + category + variety dropdown

## Agent Workflow

### Agents

- `feature-slicing-pm`: Project Manager - orchestrates the workflow, maintains todo list, slices features
- `react-native-specialist`: Developer - implements features with NativeWind, Zustand, Zod
- `android-ux-designer`: UX Designer - Material Design, Android UX patterns, accessibility
- `system-architect-guardian`: Architect - reviews for KISS, DDD, SOLID compliance
- `code-reviewer`: Reviews code quality and maintainability
- `maestro-android-test-engineer`: Tester - writes Maestro UI test flows
- `plant-product-specialist`: Domain expert - verified plant information (3-source validation)

### Phase 1: Feature Slicing

1. **PM slices requirements** into deliverable features using vertical slicing
2. **PM instructs each agent** on what will need to be built for each feature
3. **Agents ask clarifying questions** to the PM based on their specialty
4. **PM answers questions** or escalates to the user when there's conflict, confusion, or missing information
5. **PM creates todo list** of all features to be delivered

### Phase 2: Feature Delivery (repeat for each feature)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. RESEARCH (if needed)                                        │
│     Plant Product Specialist looks up domain information        │
├─────────────────────────────────────────────────────────────────┤
│  2. DESIGN & INSTRUCT                                           │
│     System Architect + PM instruct the Developer                │
│     UX Designer provides UI/interaction guidance                │
├─────────────────────────────────────────────────────────────────┤
│  3. IMPLEMENTATION                                              │
│     Developer writes the code                                   │
├─────────────────────────────────────────────────────────────────┤
│  4. CODE REVIEW                                                 │
│     Code Reviewer + System Architect analyze the code           │
│     Issues are fixed before proceeding                          │
├─────────────────────────────────────────────────────────────────┤
│  5. TESTING                                                     │
│     Tester writes Maestro UI tests                              │
│     Code Reviewer reviews the tests                             │
├─────────────────────────────────────────────────────────────────┤
│  6. USER VALIDATION                                             │
│     PM reports to user for confirmation                         │
│     User requests changes → return to step 3                    │
│     User approves → mark todo complete, proceed to next feature │
└─────────────────────────────────────────────────────────────────┘
```

### Escalation Rules

- **PM handles**: Agent questions, coordination, prioritization
- **User handles**: Conflicts between agents, missing requirements, final approval
- **No feature proceeds** without user validation of the previous one

## Folder Structure (Recommended)

```
src/
  components/      # Atomic design UI components (atoms, molecules, organisms)
  screens/         # Screen components
  domain/          # Domain models and business logic
  stores/          # Zustand stores
  schemas/         # Zod validation schemas
  services/        # External integrations
  i18n/            # Dutch translations
  styles/          # BEM CSS files
  types/           # Shared TypeScript types
  utils/           # Utility functions
```
