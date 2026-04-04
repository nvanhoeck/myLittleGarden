/**
 * ComponentForm
 * Form fields for creating or editing a component
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ComponentType, SunDirection, ComponentData } from '@/types';
import { CompassSelector } from '@/components/atoms/CompassSelector';
import {
  isGardenBox,
  isPot,
  isRectangularTower,
  isCircularTower,
} from '@/stores/componentStore';

interface ComponentFormData {
  name: string;
  sunDirection: SunDirection | null;
  widthCm: string;
  lengthCm: string;
  diameterCm: string;
  borderWidthCm: string;
  numberOfLayers: string;
}

interface ComponentFormProps {
  /** Component type being created */
  componentType: ComponentType;
  /** Callback when form is submitted */
  onSubmit: (data: ComponentFormData) => void;
  /** Callback when cancelled */
  onCancel: () => void;
  /** Component being edited (optional) */
  editingComponent?: ComponentData | null;
  /** Test ID prefix */
  testID?: string;
}

/**
 * Get initial form values from an existing component
 */
function getInitialValues(component?: ComponentData | null) {
  if (!component) {
    return {
      name: '',
      sunDirection: null as SunDirection | null,
      widthCm: '60',
      lengthCm: '120',
      diameterCm: '40',
      borderWidthCm: '2',
      numberOfLayers: '3',
    };
  }

  const base = {
    name: component.name,
    sunDirection: component.sunDirection,
    borderWidthCm: String(component.borderWidthInCm),
    widthCm: '60',
    lengthCm: '120',
    diameterCm: '40',
    numberOfLayers: '3',
  };

  if (isGardenBox(component) || isRectangularTower(component)) {
    base.widthCm = String(component.widthInCm);
    base.lengthCm = String(component.lengthInCm);
  }

  if (isPot(component) || isCircularTower(component)) {
    base.diameterCm = String(component.diameterInCm);
  }

  if (isRectangularTower(component) || isCircularTower(component)) {
    base.numberOfLayers = String(component.numberOfLayers);
  }

  return base;
}

/**
 * Form for entering component details
 */
export function ComponentForm({
  componentType,
  onSubmit,
  onCancel,
  editingComponent,
  testID = 'component-form',
}: ComponentFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const isEditMode = !!editingComponent;
  const initialValues = getInitialValues(editingComponent);

  const [name, setName] = useState(initialValues.name);
  const [sunDirection, setSunDirection] = useState<SunDirection | null>(initialValues.sunDirection);
  const [widthCm, setWidthCm] = useState(initialValues.widthCm);
  const [lengthCm, setLengthCm] = useState(initialValues.lengthCm);
  const [diameterCm, setDiameterCm] = useState(initialValues.diameterCm);
  const [borderWidthCm, setBorderWidthCm] = useState(initialValues.borderWidthCm);
  const [numberOfLayers, setNumberOfLayers] = useState(initialValues.numberOfLayers);

  // Determine which fields to show based on component type
  const isRectangular = componentType === 'gardenBox' || componentType === 'rectangularTower';
  const isCircular = componentType === 'pot' || componentType === 'circularTower';
  const isTower = componentType === 'rectangularTower' || componentType === 'circularTower';

  // Validate form
  const isValid = useCallback(() => {
    if (!name.trim()) return false;
    if (!sunDirection) return false;

    if (isRectangular) {
      const w = parseFloat(widthCm);
      const l = parseFloat(lengthCm);
      if (isNaN(w) || w <= 0 || isNaN(l) || l <= 0) return false;
    }

    if (isCircular) {
      const d = parseFloat(diameterCm);
      if (isNaN(d) || d <= 0) return false;
    }

    if (isTower) {
      const layers = parseInt(numberOfLayers, 10);
      if (isNaN(layers) || layers < 1 || layers > 10) return false;
    }

    const bw = parseFloat(borderWidthCm);
    if (isNaN(bw) || bw < 0) return false;

    return true;
  }, [name, sunDirection, widthCm, lengthCm, diameterCm, borderWidthCm, numberOfLayers, isRectangular, isCircular, isTower]);

  const handleSubmit = useCallback(() => {
    if (!isValid()) return;

    onSubmit({
      name: name.trim(),
      sunDirection,
      widthCm,
      lengthCm,
      diameterCm,
      borderWidthCm,
      numberOfLayers,
    });
  }, [name, sunDirection, widthCm, lengthCm, diameterCm, borderWidthCm, numberOfLayers, isValid, onSubmit]);

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-4 pb-8"
      testID={testID}
    >
      {/* Name input */}
      <View className="mb-4">
        <Text className="text-green-200 text-sm font-medium mb-2">
          {t('componentCreation.name')}
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('componentCreation.namePlaceholder')}
          placeholderTextColor="#4a7c59"
          className="bg-green-900/40 border border-green-700/50 rounded-lg px-4 py-3 text-white"
          testID={`${testID}-name-input`}
          autoCapitalize="sentences"
        />
      </View>

      {/* Sun direction selector */}
      <View className="mb-4">
        <Text className="text-green-200 text-sm font-medium mb-2 text-center">
          {t('componentCreation.sunDirection')}
        </Text>
        <CompassSelector
          selectedDirection={sunDirection}
          onSelect={setSunDirection}
          testID={`${testID}-compass`}
        />
      </View>

      {/* Dimensions - Rectangular */}
      {isRectangular && (
        <View className="flex-row mb-4">
          <View className="flex-1 mr-2">
            <Text className="text-green-200 text-sm font-medium mb-2">
              {t('componentCreation.width')} (cm)
            </Text>
            <TextInput
              value={widthCm}
              onChangeText={setWidthCm}
              keyboardType="decimal-pad"
              className="bg-green-900/40 border border-green-700/50 rounded-lg px-4 py-3 text-white"
              testID={`${testID}-width-input`}
            />
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-green-200 text-sm font-medium mb-2">
              {t('componentCreation.length')} (cm)
            </Text>
            <TextInput
              value={lengthCm}
              onChangeText={setLengthCm}
              keyboardType="decimal-pad"
              className="bg-green-900/40 border border-green-700/50 rounded-lg px-4 py-3 text-white"
              testID={`${testID}-length-input`}
            />
          </View>
        </View>
      )}

      {/* Dimensions - Circular */}
      {isCircular && (
        <View className="mb-4">
          <Text className="text-green-200 text-sm font-medium mb-2">
            {t('componentCreation.diameter')} (cm)
          </Text>
          <TextInput
            value={diameterCm}
            onChangeText={setDiameterCm}
            keyboardType="decimal-pad"
            className="bg-green-900/40 border border-green-700/50 rounded-lg px-4 py-3 text-white"
            testID={`${testID}-diameter-input`}
          />
        </View>
      )}

      {/* Border width */}
      <View className="mb-4">
        <Text className="text-green-200 text-sm font-medium mb-2">
          {t('componentCreation.borderWidth')} (cm)
        </Text>
        <TextInput
          value={borderWidthCm}
          onChangeText={setBorderWidthCm}
          keyboardType="decimal-pad"
          className="bg-green-900/40 border border-green-700/50 rounded-lg px-4 py-3 text-white"
          testID={`${testID}-border-input`}
        />
      </View>

      {/* Number of layers (for towers) */}
      {isTower && (
        <View className="mb-4">
          <Text className="text-green-200 text-sm font-medium mb-2">
            {t('componentCreation.numberOfLayers')} (1-10)
          </Text>
          <TextInput
            value={numberOfLayers}
            onChangeText={setNumberOfLayers}
            keyboardType="number-pad"
            className="bg-green-900/40 border border-green-700/50 rounded-lg px-4 py-3 text-white"
            testID={`${testID}-layers-input`}
          />
        </View>
      )}

      {/* Action buttons */}
      <View className="flex-row mt-6">
        <Pressable
          onPress={onCancel}
          className="flex-1 mr-2 py-3 rounded-lg bg-green-900/40 border border-green-700/50"
          testID={`${testID}-cancel-button`}
        >
          <Text className="text-green-200 text-center font-semibold">
            {t('common.cancel')}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!isValid()}
          className={`
            flex-1 ml-2 py-3 rounded-lg
            ${isValid() ? 'bg-green-600' : 'bg-green-900/20'}
          `}
          testID={`${testID}-submit-button`}
        >
          <Text
            className={`
              text-center font-semibold
              ${isValid() ? 'text-white' : 'text-green-700'}
            `}
          >
            {isEditMode ? t('common.save') : t('common.add')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
