/**
 * ComponentCreationModal
 * Modal for creating new garden components with two steps:
 * 1. Type selection
 * 2. Component form
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Modal, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type {
  ComponentType,
  SunDirection,
  ComponentData,
  RectangularLayerDimensions,
  CircularLayerDimensions,
} from '@/types';
import { useComponentActions, useComponentStore } from '@/stores';
import { ComponentTypeSelector } from './ComponentTypeSelector';
import { ComponentForm } from './ComponentForm';

type CreationStep = 'type' | 'form';

interface ComponentCreationModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when component is created */
  onCreated?: (componentId: string) => void;
  /** Component to edit (if editing instead of creating) */
  editingComponent?: ComponentData | null;
  /** Test ID prefix */
  testID?: string;
}

/**
 * Two-step modal for creating garden components
 * When editingComponent is provided, skips type selection and allows editing existing component
 */
export function ComponentCreationModal({
  visible,
  onClose,
  onCreated,
  editingComponent,
  testID = 'component-creation-modal',
}: ComponentCreationModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const { addGardenBox, addPot, addRectangularTower, addCircularTower } = useComponentActions();
  const updateComponent = useComponentStore((state) => state.updateComponent);

  const isEditMode = !!editingComponent;
  const [step, setStep] = useState<CreationStep>(isEditMode ? 'form' : 'type');
  const [selectedType, setSelectedType] = useState<ComponentType | null>(
    editingComponent?.type ?? null
  );

  // Update state when editingComponent changes
  useEffect(() => {
    if (editingComponent) {
      setStep('form');
      setSelectedType(editingComponent.type);
    } else {
      setStep('type');
      setSelectedType(null);
    }
  }, [editingComponent]);

  // Reset state when modal is closed
  const handleClose = useCallback(() => {
    setStep('type');
    setSelectedType(null);
    onClose();
  }, [onClose]);

  // Handle type selection
  const handleTypeSelect = useCallback((type: ComponentType) => {
    setSelectedType(type);
  }, []);

  // Move to form step
  const handleNext = useCallback(() => {
    if (selectedType) {
      setStep('form');
    }
  }, [selectedType]);

  // Go back to type selection (or close if editing)
  const handleBack = useCallback(() => {
    if (isEditMode) {
      handleClose();
    } else {
      setStep('type');
    }
  }, [isEditMode, handleClose]);

  // Handle form submission
  const handleFormSubmit = useCallback(
    (data: {
      name: string;
      sunDirection: SunDirection | null;
      widthCm: string;
      lengthCm: string;
      diameterCm: string;
      borderWidthCm: string;
      numberOfLayers: string;
      autoCalculateLayers: boolean;
      rectangularLayers: Array<{ widthCm: string; lengthCm: string }>;
      circularLayers: Array<{ diameterCm: string }>;
    }) => {
      if (!selectedType || !data.sunDirection) return;

      const borderWidth = parseFloat(data.borderWidthCm) || 2;

      // Parse custom layers for rectangular tower
      const parseRectangularCustomLayers = (): RectangularLayerDimensions[] | undefined => {
        if (data.autoCalculateLayers) return undefined;
        return data.rectangularLayers.map((layer) => ({
          widthCm: parseFloat(layer.widthCm) || 0,
          lengthCm: parseFloat(layer.lengthCm) || 0,
        }));
      };

      // Parse custom layers for circular tower
      const parseCircularCustomLayers = (): CircularLayerDimensions[] | undefined => {
        if (data.autoCalculateLayers) return undefined;
        return data.circularLayers.map((layer) => ({
          diameterCm: parseFloat(layer.diameterCm) || 0,
        }));
      };

      // If editing, update the existing component
      if (isEditMode && editingComponent) {
        const updateData: Partial<ComponentData> = {
          name: data.name,
          sunDirection: data.sunDirection,
          borderWidthInCm: borderWidth,
        };

        // Add type-specific fields
        if (selectedType === 'gardenBox' || selectedType === 'rectangularTower') {
          (updateData as any).widthInCm = parseFloat(data.widthCm) || 60;
          (updateData as any).lengthInCm = parseFloat(data.lengthCm) || 120;
        }
        if (selectedType === 'pot' || selectedType === 'circularTower') {
          (updateData as any).diameterInCm = parseFloat(data.diameterCm) || 40;
        }
        if (selectedType === 'rectangularTower') {
          (updateData as any).numberOfLayers = parseInt(data.numberOfLayers, 10) || 3;
          (updateData as any).customLayers = parseRectangularCustomLayers();
        }
        if (selectedType === 'circularTower') {
          (updateData as any).numberOfLayers = parseInt(data.numberOfLayers, 10) || 3;
          (updateData as any).customLayers = parseCircularCustomLayers();
        }

        updateComponent(editingComponent.id, updateData);
        onCreated?.(editingComponent.id);
        handleClose();
        return;
      }

      // Creating new component
      let componentId: string;

      switch (selectedType) {
        case 'gardenBox':
          componentId = addGardenBox({
            name: data.name,
            sunDirection: data.sunDirection,
            widthInCm: parseFloat(data.widthCm) || 60,
            lengthInCm: parseFloat(data.lengthCm) || 120,
            borderWidthInCm: borderWidth,
          });
          break;

        case 'pot':
          componentId = addPot({
            name: data.name,
            sunDirection: data.sunDirection,
            diameterInCm: parseFloat(data.diameterCm) || 40,
            borderWidthInCm: borderWidth,
          });
          break;

        case 'rectangularTower':
          componentId = addRectangularTower({
            name: data.name,
            sunDirection: data.sunDirection,
            widthInCm: parseFloat(data.widthCm) || 60,
            lengthInCm: parseFloat(data.lengthCm) || 60,
            borderWidthInCm: borderWidth,
            numberOfLayers: parseInt(data.numberOfLayers, 10) || 3,
            customLayers: parseRectangularCustomLayers(),
          });
          break;

        case 'circularTower':
          componentId = addCircularTower({
            name: data.name,
            sunDirection: data.sunDirection,
            diameterInCm: parseFloat(data.diameterCm) || 50,
            borderWidthInCm: borderWidth,
            numberOfLayers: parseInt(data.numberOfLayers, 10) || 3,
            customLayers: parseCircularCustomLayers(),
          });
          break;

        default:
          return;
      }

      onCreated?.(componentId);
      handleClose();
    },
    [selectedType, isEditMode, editingComponent, updateComponent, addGardenBox, addPot, addRectangularTower, addCircularTower, onCreated, handleClose]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      testID={testID}
    >
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 h-16 border-b border-green-800">
            {/* Back/Close button */}
            <Pressable
              onPress={step === 'form' && !isEditMode ? handleBack : handleClose}
              className="w-touch-target h-touch-target items-center justify-center"
              testID={`${testID}-back-button`}
              accessibilityLabel={step === 'form' && !isEditMode ? t('common.back') : t('common.cancel')}
              accessibilityRole="button"
            >
              <Text className="text-green-400 text-lg">
                {step === 'form' && !isEditMode ? '←' : '✕'}
              </Text>
            </Pressable>

            {/* Title */}
            <Text className="text-headline-small text-on-background font-medium">
              {isEditMode
                ? t('componentCreation.editComponent')
                : step === 'type'
                  ? t('componentCreation.selectType')
                  : t('componentCreation.details')}
            </Text>

            {/* Next button (only in type step) */}
            {step === 'type' ? (
              <Pressable
                onPress={handleNext}
                disabled={!selectedType}
                className="w-touch-target h-touch-target items-center justify-center"
                testID={`${testID}-next-button`}
                accessibilityLabel={t('common.next')}
                accessibilityRole="button"
              >
                <Text
                  className={`text-lg font-semibold ${
                    selectedType ? 'text-green-400' : 'text-green-700'
                  }`}
                >
                  →
                </Text>
              </Pressable>
            ) : (
              <View className="w-touch-target" />
            )}
          </View>

          {/* Content */}
          <View className="flex-1">
            {step === 'type' ? (
              <View className="flex-1 pt-4">
                <Text className="text-green-300 text-center mb-4 px-4">
                  {t('componentCreation.selectTypeDescription')}
                </Text>
                <ComponentTypeSelector
                  selectedType={selectedType}
                  onSelect={handleTypeSelect}
                  testID={`${testID}-type-selector`}
                />
              </View>
            ) : selectedType ? (
              <ComponentForm
                componentType={selectedType}
                onSubmit={handleFormSubmit}
                onCancel={handleBack}
                editingComponent={editingComponent}
                testID={`${testID}-form`}
              />
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
