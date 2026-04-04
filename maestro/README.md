# Maestro UI Tests - My Little Garden

This directory contains Maestro UI test flows for the My Little Garden Android app.

## Test Files

### Environment Setup Flow Tests

1. **environment_setup_happy_path.yaml**
   - Tests the complete first-time user setup flow
   - Validates both wizard steps: Frost Dates and Garden Dimensions
   - Verifies successful navigation to Home screen
   - Uses `clearState: true` for fresh app state

2. **environment_setup_navigation.yaml**
   - Tests wizard navigation with Back/Next buttons
   - Validates step progress indicator updates
   - Verifies navigation constraints (no back from step 1)
   - Tests state preservation when navigating back and forth between 2 steps

3. **environment_setup_validation.yaml**
   - Tests input validation for each setup step
   - Step 1: Validates frost date selection
   - Step 2: Validates dimension inputs (empty, zero, oversized values)
   - Verifies error states and user feedback

4. **environment_setup_persistence.yaml**
   - Tests that setup configuration persists across app restarts
   - First launch: Completes full setup flow
   - Second launch: Verifies app skips setup and goes directly to Home
   - Uses `clearState: false` on relaunch to test persistence

## Running Tests

### Prerequisites

1. Install Maestro CLI:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. Ensure Android device/emulator is connected:
   ```bash
   adb devices
   ```

3. Build and install the app:
   ```bash
   # From project root
   npm run android
   # or
   npx react-native run-android
   ```

### Run Individual Tests

```bash
# From project root
maestro test maestro/environment_setup_happy_path.yaml
maestro test maestro/environment_setup_navigation.yaml
maestro test maestro/environment_setup_validation.yaml
maestro test maestro/environment_setup_persistence.yaml
```

### Run All Tests

```bash
maestro test maestro/
```

### Run with Output

```bash
maestro test --format junit --output results.xml maestro/
```

## Test Organization

Tests follow the naming convention: `{feature}_{scenario}.yaml`

- **Feature**: The app feature being tested (e.g., environment_setup)
- **Scenario**: The specific test case (e.g., happy_path, navigation, validation, persistence)

## Android-Specific Considerations

1. **Date Picker Interactions**: Tests interact with native Android date picker by looking for "OK" button text
2. **Keyboard Management**: `hideKeyboard` is used between input fields to ensure buttons are visible
3. **Animation Waits**: `waitForAnimationToEnd` is used after navigation to ensure UI stability
4. **State Management**: Tests use `clearState: true/false` to control app state persistence

## Test Maintenance Notes

### If Test IDs Change

Update the test IDs in the YAML files to match the component test IDs:
- Search for `id: "old-test-id"`
- Replace with `id: "new-test-id"`

### If UI Flow Changes

1. **New Steps Added**: Add corresponding assertions and interactions in sequential order
2. **Steps Removed**: Remove obsolete assertions and navigation commands
3. **Validation Changed**: Update validation test cases to match new business rules

### If App Package Changes

Update `appId` at the top of each YAML file from `com.mylittlegarden.app` to the new package name.

## CI/CD Integration

To integrate with Maestro Cloud for CI/CD:

```bash
# Upload tests to Maestro Cloud
maestro cloud --apiKey <API_KEY> maestro/

# Or in CI pipeline
maestro cloud \
  --apiKey $MAESTRO_API_KEY \
  --app-file app-release.apk \
  --flows maestro/
```

## Troubleshooting

### Test Fails on Date Picker
- Issue: Date picker interaction timing
- Solution: Increase `timeout` in `extendedWaitUntil` for date picker "OK" button

### Test Fails on Navigation
- Issue: Animation not complete before next assertion
- Solution: Add `waitForAnimationToEnd` or increase timeout values

### Persistence Test Fails
- Issue: App state not persisting between launches
- Solution: Verify Zustand persistence is configured correctly in the app

### Element Not Found
- Issue: Test ID doesn't match component
- Solution: Use `maestro studio` to inspect the UI hierarchy and verify test IDs

## Interactive Testing

Use Maestro Studio for interactive test development:

```bash
maestro studio
```

This opens an interactive UI where you can:
- Inspect element hierarchy
- Try selectors in real-time
- Record interactions
- Debug test failures
