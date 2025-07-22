/**
 * Centralized color constants for the application
 * This file contains all the primary brand colors used throughout the app
 */

export const COLORS = {
  primary: '#1475E1',
  primaryHover: '#1165C7', // Slightly darker for hover states
  primaryLight: '#4A90E6', // Lighter variant
  primaryDark: '#0F5BA8', // Darker variant
} as const;

// Helper function to generate color variations
export const generateColorVariations = (baseColor: string) => {
  // For now, returning predefined variations
  // In the future, this could use a color manipulation library
  return {
    base: baseColor,
    hover: baseColor === COLORS.primary ? COLORS.primaryHover : baseColor,
    light: baseColor === COLORS.primary ? COLORS.primaryLight : baseColor,
    dark: baseColor === COLORS.primary ? COLORS.primaryDark : baseColor,
  };
};

// Export individual colors for easier imports
export const PRIMARY_COLOR = COLORS.primary;
export const PRIMARY_HOVER = COLORS.primaryHover;
export const PRIMARY_LIGHT = COLORS.primaryLight;
export const PRIMARY_DARK = COLORS.primaryDark;