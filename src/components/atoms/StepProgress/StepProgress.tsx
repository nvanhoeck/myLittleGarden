import React from 'react';
import { View, Text } from 'react-native';

interface StepProgressProps {
  /** Current step number (1-indexed) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Optional test ID for testing */
  testID?: string;
}

/**
 * StepProgress displays a horizontal progress indicator showing
 * the current step in a multi-step wizard flow.
 *
 * Visual states:
 * - Completed: Green filled circle with checkmark
 * - Active: Green filled circle with step number
 * - Future: Outlined circle with step number
 */
export function StepProgress({
  currentStep,
  totalSteps,
  testID = 'step-progress',
}: StepProgressProps): React.JSX.Element {
  const steps = Array.from({ length: totalSteps }, (_, index) => index + 1);

  return (
    <View
      className="flex-row items-center justify-center py-4"
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={`Stap ${currentStep} van ${totalSteps}`}
      accessibilityValue={{
        min: 1,
        max: totalSteps,
        now: currentStep,
      }}
    >
      {steps.map((step, index) => {
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;
        const isFuture = step > currentStep;
        const isLastStep = index === steps.length - 1;

        return (
          <React.Fragment key={step}>
            {/* Step Circle */}
            <View
              className={`
                h-10 w-10 items-center justify-center rounded-full
                ${isCompleted ? 'bg-green-600' : ''}
                ${isActive ? 'bg-green-600' : ''}
                ${isFuture ? 'border-2 border-green-600/50 bg-transparent' : ''}
              `}
              testID={`${testID}-step-${step}`}
            >
              {isCompleted ? (
                // Checkmark for completed steps
                <Text
                  className="text-lg font-bold text-white"
                  accessibilityLabel={`Stap ${step} voltooid`}
                >
                  ✓
                </Text>
              ) : (
                // Step number for active and future steps
                <Text
                  className={`
                    text-lg font-semibold
                    ${isActive ? 'text-white' : 'text-green-600/50'}
                  `}
                  accessibilityLabel={
                    isActive ? `Huidige stap ${step}` : `Stap ${step}`
                  }
                >
                  {step}
                </Text>
              )}
            </View>

            {/* Connecting Line */}
            {!isLastStep && (
              <View
                className={`
                  mx-2 h-0.5 w-8
                  ${step < currentStep ? 'bg-green-600' : 'bg-green-600/30'}
                `}
                testID={`${testID}-line-${step}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}
