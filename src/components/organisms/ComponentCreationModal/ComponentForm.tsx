/**
 * ComponentForm
 * Form fields for creating or editing a component
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import type {
  ComponentType,
  SunDirection,
  ComponentData,
  RectangularLayerDimensions,
  CircularLayerDimensions,
} from '@/types';
import { CompassSelector } from '@/components/atoms/CompassSelector';
import {
  isGardenBox,
  isPot,
  isRectangularTower,
  isCircularTower,
} from '@/stores/componentStore';
import {
  calculateRectangularAutoFillLayers,
  calculateCircularAutoFillLayers,
} from '@/domain/component/TowerLayer';

/**
 * Layer dimension inputs for rectangular tower
 */
interface RectangularLayerInput {
  widthCm: string;
  lengthCm: string;
}

/**
 * Layer dimension inputs for circular tower
 */
interface CircularLayerInput {
  diameterCm: string;
}

interface ComponentFormData {
  name: string;
  sunDirection: SunDirection | null;
  widthCm: string;
  lengthCm: string;
  diameterCm: string;
  borderWidthCm: string;
  numberOfLayers: string;
  autoCalculateLayers: boolean;
  rectangularLayers: RectangularLayerInput[];
  circularLayers: CircularLayerInput[];
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
 * Create default rectangular layer inputs
 */
function createDefaultRectangularLayers(
  count: number,
  baseWidthCm: number,
  baseLengthCm: number
): RectangularLayerInput[] {
  const autoLayers = calculateRectangularAutoFillLayers(count, baseWidthCm, baseLengthCm);
  return autoLayers.map((layer) => ({
    widthCm: String(layer.widthCm),
    lengthCm: String(layer.lengthCm),
  }));
}

/**
 * Create default circular layer inputs
 */
function createDefaultCircularLayers(
  count: number,
  baseDiameterCm: number
): CircularLayerInput[] {
  const autoLayers = calculateCircularAutoFillLayers(count, baseDiameterCm);
  return autoLayers.map((layer) => ({
    diameterCm: String(layer.diameterCm),
  }));
}

/**
 * Get initial form values from an existing component
 */
function getInitialValues(component?: ComponentData | null) {
  const defaultValues = {
    name: '',
    sunDirection: null as SunDirection | null,
    widthCm: '60',
    lengthCm: '120',
    diameterCm: '40',
    borderWidthCm: '2',
    numberOfLayers: '3',
    autoCalculateLayers: true,
    rectangularLayers: createDefaultRectangularLayers(3, 60, 120),
    circularLayers: createDefaultCircularLayers(3, 40),
  };

  if (!component) {
    return defaultValues;
  }

  const base = {
    ...defaultValues,
    name: component.name,
    sunDirection: component.sunDirection,
    borderWidthCm: String(component.borderWidthInCm),
  };

  if (isGardenBox(component) || isRectangularTower(component)) {
    base.widthCm = String(component.widthInCm);
    base.lengthCm = String(component.lengthInCm);
  }

  if (isPot(component) || isCircularTower(component)) {
    base.diameterCm = String(component.diameterInCm);
  }

  if (isRectangularTower(component)) {
    base.numberOfLayers = String(component.numberOfLayers);
    const hasCustom = component.customLayers && component.customLayers.length > 0;
    base.autoCalculateLayers = !hasCustom;
    if (hasCustom) {
      base.rectangularLayers = component.customLayers!.map((layer) => ({
        widthCm: String(layer.widthCm),
        lengthCm: String(layer.lengthCm),
      }));
    } else {
      base.rectangularLayers = createDefaultRectangularLayers(
        component.numberOfLayers,
        component.widthInCm,
        component.lengthInCm
      );
    }
  }

  if (isCircularTower(component)) {
    base.numberOfLayers = String(component.numberOfLayers);
    const hasCustom = component.customLayers && component.customLayers.length > 0;
    base.autoCalculateLayers = !hasCustom;
    if (hasCustom) {
      base.circularLayers = component.customLayers!.map((layer) => ({
        diameterCm: String(layer.diameterCm),
      }));
    } else {
      base.circularLayers = createDefaultCircularLayers(
        component.numberOfLayers,
        component.diameterInCm
      );
    }
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
  const [autoCalculateLayers, setAutoCalculateLayers] = useState(initialValues.autoCalculateLayers);
  const [rectangularLayers, setRectangularLayers] = useState<RectangularLayerInput[]>(
    initialValues.rectangularLayers
  );
  const [circularLayers, setCircularLayers] = useState<CircularLayerInput[]>(
    initialValues.circularLayers
  );

  // Determine which fields to show based on component type
  const isRectangular = componentType === 'gardenBox' || componentType === 'rectangularTower';
  const isCircular = componentType === 'pot' || componentType === 'circularTower';
  const isTower = componentType === 'rectangularTower' || componentType === 'circularTower';
  const isRectangularTowerType = componentType === 'rectangularTower';
  const isCircularTowerType = componentType === 'circularTower';

  // Update layer count when numberOfLayers changes
  useEffect(() => {
    const layerCount = parseInt(numberOfLayers, 10);
    if (isNaN(layerCount) || layerCount < 1 || layerCount > 10) return;

    const baseWidth = parseFloat(widthCm) || 60;
    const baseLength = parseFloat(lengthCm) || 120;
    const baseDiameter = parseFloat(diameterCm) || 40;

    // Adjust rectangular layers
    if (isRectangularTowerType) {
      if (layerCount < rectangularLayers.length) {
        // Keep bottom N layers when decreasing
        setRectangularLayers((prev) => prev.slice(0, layerCount));
      } else if (layerCount > rectangularLayers.length) {
        // Add new layers when increasing
        const additionalLayers = createDefaultRectangularLayers(
          layerCount - rectangularLayers.length,
          rectangularLayers.length > 0
            ? parseFloat(rectangularLayers[rectangularLayers.length - 1].widthCm) * 0.85
            : baseWidth,
          rectangularLayers.length > 0
            ? parseFloat(rectangularLayers[rectangularLayers.length - 1].lengthCm) * 0.85
            : baseLength
        );
        setRectangularLayers((prev) => [...prev, ...additionalLayers]);
      }
    }

    // Adjust circular layers
    if (isCircularTowerType) {
      if (layerCount < circularLayers.length) {
        // Keep bottom N layers when decreasing
        setCircularLayers((prev) => prev.slice(0, layerCount));
      } else if (layerCount > circularLayers.length) {
        // Add new layers when increasing
        const additionalLayers = createDefaultCircularLayers(
          layerCount - circularLayers.length,
          circularLayers.length > 0
            ? parseFloat(circularLayers[circularLayers.length - 1].diameterCm) * 0.85
            : baseDiameter
        );
        setCircularLayers((prev) => [...prev, ...additionalLayers]);
      }
    }
  }, [numberOfLayers, isRectangularTowerType, isCircularTowerType]);

  // Auto-fill layer dimensions with 0.85 reduction factor
  const handleAutoFillLayers = useCallback(() => {
    const layerCount = parseInt(numberOfLayers, 10);
    if (isNaN(layerCount) || layerCount < 1) return;

    if (isRectangularTowerType) {
      const baseWidth = parseFloat(widthCm) || 60;
      const baseLength = parseFloat(lengthCm) || 120;
      setRectangularLayers(createDefaultRectangularLayers(layerCount, baseWidth, baseLength));
    }

    if (isCircularTowerType) {
      const baseDiameter = parseFloat(diameterCm) || 40;
      setCircularLayers(createDefaultCircularLayers(layerCount, baseDiameter));
    }
  }, [numberOfLayers, widthCm, lengthCm, diameterCm, isRectangularTowerType, isCircularTowerType]);

  // Update a specific rectangular layer
  const updateRectangularLayer = useCallback(
    (index: number, field: 'widthCm' | 'lengthCm', value: string) => {
      setRectangularLayers((prev) =>
        prev.map((layer, i) => (i === index ? { ...layer, [field]: value } : layer))
      );
    },
    []
  );

  // Update a specific circular layer
  const updateCircularLayer = useCallback((index: number, value: string) => {
    setCircularLayers((prev) =>
      prev.map((layer, i) => (i === index ? { diameterCm: value } : layer))
    );
  }, []);

  // Validate custom layer dimensions
  const validateCustomLayers = useCallback((): boolean => {
    if (autoCalculateLayers) return true;

    const layerCount = parseInt(numberOfLayers, 10);
    if (isNaN(layerCount) || layerCount < 1) return false;

    if (isRectangularTowerType) {
      if (rectangularLayers.length !== layerCount) return false;
      for (let i = 0; i < rectangularLayers.length; i++) {
        const w = parseFloat(rectangularLayers[i].widthCm);
        const l = parseFloat(rectangularLayers[i].lengthCm);
        if (isNaN(w) || w <= 0 || isNaN(l) || l <= 0) return false;
        // Each layer must be <= layer below (or equal)
        if (i > 0) {
          const prevW = parseFloat(rectangularLayers[i - 1].widthCm);
          const prevL = parseFloat(rectangularLayers[i - 1].lengthCm);
          if (w > prevW || l > prevL) return false;
        }
      }
    }

    if (isCircularTowerType) {
      if (circularLayers.length !== layerCount) return false;
      for (let i = 0; i < circularLayers.length; i++) {
        const d = parseFloat(circularLayers[i].diameterCm);
        if (isNaN(d) || d <= 0) return false;
        // Each layer must be <= layer below (or equal)
        if (i > 0) {
          const prevD = parseFloat(circularLayers[i - 1].diameterCm);
          if (d > prevD) return false;
        }
      }
    }

    return true;
  }, [autoCalculateLayers, numberOfLayers, rectangularLayers, circularLayers, isRectangularTowerType, isCircularTowerType]);

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
      if (!validateCustomLayers()) return false;
    }

    const bw = parseFloat(borderWidthCm);
    if (isNaN(bw) || bw < 0) return false;

    return true;
  }, [name, sunDirection, widthCm, lengthCm, diameterCm, borderWidthCm, numberOfLayers, isRectangular, isCircular, isTower, validateCustomLayers]);

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
      autoCalculateLayers,
      rectangularLayers,
      circularLayers,
    });
  }, [name, sunDirection, widthCm, lengthCm, diameterCm, borderWidthCm, numberOfLayers, autoCalculateLayers, rectangularLayers, circularLayers, isValid, onSubmit]);

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
        <Text className="text-green-500 text-xs text-center mb-3">
          {t('componentCreation.sunDirectionHint')}
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

      {/* Layer configuration toggle (for towers) */}
      {isTower && (
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-green-200 text-sm font-medium">
              {t('componentCreation.autoCalculateLayers')}
            </Text>
            <Switch
              value={autoCalculateLayers}
              onValueChange={setAutoCalculateLayers}
              trackColor={{ false: '#1e3a2f', true: '#059669' }}
              thumbColor={autoCalculateLayers ? '#10b981' : '#4a7c59'}
              testID={`${testID}-auto-calculate-toggle`}
            />
          </View>
        </View>
      )}

      {/* Custom layer dimensions - Rectangular Tower */}
      {isRectangularTowerType && !autoCalculateLayers && (
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-green-200 text-sm font-medium">
              {t('componentCreation.layerDimensions')}
            </Text>
            <Pressable
              onPress={handleAutoFillLayers}
              className="bg-green-700/50 px-3 py-1.5 rounded-md"
              testID={`${testID}-auto-fill-button`}
            >
              <Text className="text-green-200 text-xs font-medium">
                {t('componentCreation.autoFill')}
              </Text>
            </Pressable>
          </View>
          {rectangularLayers.map((layer, index) => {
            const isBottom = index === 0;
            const isTop = index === rectangularLayers.length - 1;
            const layerLabel = isBottom
              ? `${t('componentCreation.layer')} ${index + 1} (${t('componentCreation.bottom')})`
              : isTop
              ? `${t('componentCreation.layer')} ${index + 1} (${t('componentCreation.top')})`
              : `${t('componentCreation.layer')} ${index + 1}`;
            return (
              <View key={index} className="mb-3 bg-green-900/20 p-3 rounded-lg">
                <Text className="text-green-300 text-xs font-medium mb-2">
                  {layerLabel}
                </Text>
                <View className="flex-row">
                  <View className="flex-1 mr-2">
                    <Text className="text-green-400 text-xs mb-1">
                      {t('componentCreation.width')} (cm)
                    </Text>
                    <TextInput
                      value={layer.widthCm}
                      onChangeText={(value) => updateRectangularLayer(index, 'widthCm', value)}
                      keyboardType="decimal-pad"
                      className="bg-green-900/40 border border-green-700/50 rounded-md px-3 py-2 text-white text-sm"
                      testID={`${testID}-layer-${index}-width-input`}
                    />
                  </View>
                  <View className="flex-1 ml-2">
                    <Text className="text-green-400 text-xs mb-1">
                      {t('componentCreation.length')} (cm)
                    </Text>
                    <TextInput
                      value={layer.lengthCm}
                      onChangeText={(value) => updateRectangularLayer(index, 'lengthCm', value)}
                      keyboardType="decimal-pad"
                      className="bg-green-900/40 border border-green-700/50 rounded-md px-3 py-2 text-white text-sm"
                      testID={`${testID}-layer-${index}-length-input`}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Custom layer dimensions - Circular Tower */}
      {isCircularTowerType && !autoCalculateLayers && (
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-green-200 text-sm font-medium">
              {t('componentCreation.layerDimensions')}
            </Text>
            <Pressable
              onPress={handleAutoFillLayers}
              className="bg-green-700/50 px-3 py-1.5 rounded-md"
              testID={`${testID}-auto-fill-button`}
            >
              <Text className="text-green-200 text-xs font-medium">
                {t('componentCreation.autoFill')}
              </Text>
            </Pressable>
          </View>
          {circularLayers.map((layer, index) => {
            const isBottom = index === 0;
            const isTop = index === circularLayers.length - 1;
            const layerLabel = isBottom
              ? `${t('componentCreation.layer')} ${index + 1} (${t('componentCreation.bottom')})`
              : isTop
              ? `${t('componentCreation.layer')} ${index + 1} (${t('componentCreation.top')})`
              : `${t('componentCreation.layer')} ${index + 1}`;
            return (
              <View key={index} className="mb-3 bg-green-900/20 p-3 rounded-lg">
                <Text className="text-green-300 text-xs font-medium mb-2">
                  {layerLabel}
                </Text>
                <View>
                  <Text className="text-green-400 text-xs mb-1">
                    {t('componentCreation.diameter')} (cm)
                  </Text>
                  <TextInput
                    value={layer.diameterCm}
                    onChangeText={(value) => updateCircularLayer(index, value)}
                    keyboardType="decimal-pad"
                    className="bg-green-900/40 border border-green-700/50 rounded-md px-3 py-2 text-white text-sm"
                    testID={`${testID}-layer-${index}-diameter-input`}
                  />
                </View>
              </View>
            );
          })}
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
