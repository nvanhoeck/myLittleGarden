/**
 * Small presentational helpers shared by the home slider and list.
 */
import type { ComponentData } from '@/types';

export function getComponentTypeIcon(component: ComponentData): string {
  switch (component.type) {
    case 'gardenBox':
      return '□';
    case 'pot':
      return '○';
    case 'rectangularTower':
      return '▲';
    case 'circularTower':
      return '△';
  }
}

export function getComponentDimensionsLabel(component: ComponentData): string {
  switch (component.type) {
    case 'gardenBox':
    case 'rectangularTower':
      return `${component.widthInCm} x ${component.lengthInCm} cm`;
    case 'pot':
    case 'circularTower':
      return `Ø ${component.diameterInCm} cm`;
  }
}

export function getComponentColor(component: ComponentData): string {
  switch (component.type) {
    case 'gardenBox':
      return '#8B4513';
    case 'pot':
      return '#CD853F';
    case 'rectangularTower':
      return '#A0522D';
    case 'circularTower':
      return '#D2691E';
  }
}

export function isTowerComponent(component: ComponentData): boolean {
  return component.type === 'rectangularTower' || component.type === 'circularTower';
}
