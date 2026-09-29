// Theme and Brand Color Engine for WatchWDS
// Dynamically generates comprehensive color palettes and applies CSS variables across the entire platform.

export interface ColorPreset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  description: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'gold',
    name: 'WatchWDS Gold (Default)',
    primary: '#EAB308',
    secondary: '#6366F1',
    description: 'Signature electric yellow and broadcast gold'
  },
  {
    id: 'emerald',
    name: 'Emerald Stadium',
    primary: '#10B981',
    secondary: '#3B82F6',
    description: 'Classic football pitch green & crisp neon emerald'
  },
  {
    id: 'cyan',
    name: 'Cyber Cyan',
    primary: '#06B6D4',
    secondary: '#8B5CF6',
    description: 'High-tech energetic cyan & ocean sky'
  },
  {
    id: 'royal',
    name: 'Royal Violet',
    primary: '#8B5CF6',
    secondary: '#EC4899',
    description: 'Luxury sports violet & electric purple'
  },
  {
    id: 'crimson',
    name: 'Arena Crimson',
    primary: '#EF4444',
    secondary: '#F59E0B',
    description: 'Bold stadium crimson & energetic arena red'
  },
  {
    id: 'blaze',
    name: 'Blaze Orange',
    primary: '#F97316',
    secondary: '#06B6D4',
    description: 'Dynamic sunset orange & high-voltage flame'
  },
  {
    id: 'rose',
    name: 'Electric Rose',
    primary: '#F43F5E',
    secondary: '#6366F1',
    description: 'Vibrant neon rose & modern athletic magenta'
  },
  {
    id: 'sapphire',
    name: 'Sapphire Blue',
    primary: '#3B82F6',
    secondary: '#10B981',
    description: 'Crisp sports sapphire & broadcast royal blue'
  },
  {
    id: 'lime',
    name: 'Neon Lime',
    primary: '#84CC16',
    secondary: '#0EA5E9',
    description: 'High-velocity neon lime & sprint energy'
  }
];

export const DEFAULT_PRIMARY_COLOR = '#EAB308';
export const DEFAULT_SECONDARY_COLOR = '#6366F1';
export const DEFAULT_BUTTON_TEXT_COLOR = '#FFFFFF';

// Convert hex (#RRGGBB or #RGB) to [r, g, b]
export function hexToRgb(hex: string): [number, number, number] {
  let cleanHex = hex.trim().replace(/^#/, '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length !== 6) {
    return [234, 179, 8]; // fallback to #EAB308
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return [234, 179, 8];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Convert [r, g, b] to hex (#RRGGBB)
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
}

// Mix two colors with weight (0 = color1, 1 = color2)
export function mixRgb(
  color1: [number, number, number],
  color2: [number, number, number],
  weight: number
): string {
  const r = color1[0] + (color2[0] - color1[0]) * weight;
  const g = color1[1] + (color2[1] - color1[1]) * weight;
  const b = color1[2] + (color2[2] - color1[2]) * weight;
  return rgbToHex(r, g, b);
}

// Generate complete Tailwind 50-950 scale from a base hex
export function generateShades(baseHex: string): Record<number, string> {
  const rgb = hexToRgb(baseHex);
  const white: [number, number, number] = [255, 255, 255];
  const black: [number, number, number] = [0, 0, 0];

  return {
    50: mixRgb(rgb, white, 0.92),
    100: mixRgb(rgb, white, 0.82),
    200: mixRgb(rgb, white, 0.65),
    300: mixRgb(rgb, white, 0.45),
    400: mixRgb(rgb, white, 0.20),
    500: baseHex,
    600: mixRgb(rgb, black, 0.15),
    700: mixRgb(rgb, black, 0.30),
    800: mixRgb(rgb, black, 0.45),
    900: mixRgb(rgb, black, 0.60),
    950: mixRgb(rgb, black, 0.75),
  };
}

// Calculate luminance to decide whether text on top should be dark or light
export function getContrastTextColor(hex: string): '#0a0a0a' | '#ffffff' {
  const [r, g, b] = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#0a0a0a' : '#ffffff';
}

// Apply colors globally to document root and styles
export function applyThemeColors(
  primaryHex: string, 
  secondaryHex: string = DEFAULT_SECONDARY_COLOR,
  buttonTextHex: string = DEFAULT_BUTTON_TEXT_COLOR
) {
  if (typeof document === 'undefined') return;

  const validPrimary = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(primaryHex)
    ? primaryHex
    : DEFAULT_PRIMARY_COLOR;
  const validSecondary = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(secondaryHex)
    ? secondaryHex
    : DEFAULT_SECONDARY_COLOR;
  const validButtonText = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(buttonTextHex)
    ? buttonTextHex
    : DEFAULT_BUTTON_TEXT_COLOR;

  const primaryShades = generateShades(validPrimary);
  const secondaryShades = generateShades(validSecondary);
  const contrastText = getContrastTextColor(validPrimary);

  const root = document.documentElement;

  // Set CSS Custom Properties on :root
  Object.entries(primaryShades).forEach(([shade, hex]) => {
    root.style.setProperty(`--primary-${shade}`, hex);
    root.style.setProperty(`--color-yellow-${shade}`, hex);
  });

  root.style.setProperty('--color-amber-400', primaryShades[400]);
  root.style.setProperty('--color-amber-500', primaryShades[500]);
  root.style.setProperty('--color-amber-600', primaryShades[600]);

  Object.entries(secondaryShades).forEach(([shade, hex]) => {
    root.style.setProperty(`--secondary-${shade}`, hex);
  });
  root.style.setProperty('--color-secondary-500', validSecondary);
  root.style.setProperty('--primary-contrast-text', contrastText);
  root.style.setProperty('--button-text-color', validButtonText);

  // In addition to root properties, inject a high-priority style tag
  // ensuring Tailwind v4 compiled rules and fallbacks update instantaneously
  let styleEl = document.getElementById('watchwds-dynamic-theme-colors') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'watchwds-dynamic-theme-colors';
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    :root {
      --color-yellow-50: ${primaryShades[50]} !important;
      --color-yellow-100: ${primaryShades[100]} !important;
      --color-yellow-200: ${primaryShades[200]} !important;
      --color-yellow-300: ${primaryShades[300]} !important;
      --color-yellow-400: ${primaryShades[400]} !important;
      --color-yellow-500: ${validPrimary} !important;
      --color-yellow-600: ${primaryShades[600]} !important;
      --color-yellow-700: ${primaryShades[700]} !important;
      --color-yellow-800: ${primaryShades[800]} !important;
      --color-yellow-900: ${primaryShades[900]} !important;
      --color-yellow-950: ${primaryShades[950]} !important;

      --color-amber-400: ${primaryShades[400]} !important;
      --color-amber-500: ${validPrimary} !important;
      --color-amber-600: ${primaryShades[600]} !important;

      --primary-50: ${primaryShades[50]} !important;
      --primary-100: ${primaryShades[100]} !important;
      --primary-200: ${primaryShades[200]} !important;
      --primary-300: ${primaryShades[300]} !important;
      --primary-400: ${primaryShades[400]} !important;
      --primary-500: ${validPrimary} !important;
      --primary-600: ${primaryShades[600]} !important;
      --primary-700: ${primaryShades[700]} !important;
      --primary-800: ${primaryShades[800]} !important;
      --primary-900: ${primaryShades[900]} !important;
      --primary-950: ${primaryShades[950]} !important;

      --secondary-500: ${validSecondary} !important;
      --color-secondary-500: ${validSecondary} !important;
      --primary-contrast-text: ${contrastText} !important;
      --button-text-color: ${validButtonText} !important;
    }

    /* Primary and action button text colors configured by admin */
    button.bg-yellow-500,
    a.bg-yellow-500,
    button.bg-yellow-400,
    a.bg-yellow-400,
    button.bg-amber-500,
    a.bg-amber-500,
    .btn-primary,
    .btn-solid-primary,
    button[class*="bg-yellow-500"],
    a[class*="bg-yellow-500"],
    button[class*="bg-yellow-400"],
    a[class*="bg-yellow-400"],
    button[class*="bg-amber-500"],
    a[class*="bg-amber-500"],
    [role="button"].bg-yellow-500,
    [role="button"][class*="bg-yellow-500"] {
      color: var(--button-text-color) !important;
    }

    /* Ensure icons inside these primary buttons match the button text color */
    button.bg-yellow-500 svg,
    a.bg-yellow-500 svg,
    button.bg-yellow-400 svg,
    a.bg-yellow-400 svg,
    button.bg-amber-500 svg,
    a.bg-amber-500 svg,
    .btn-primary svg,
    .btn-solid-primary svg,
    button[class*="bg-yellow-500"] svg,
    a[class*="bg-yellow-500"] svg,
    button[class*="bg-yellow-400"] svg,
    a[class*="bg-yellow-400"] svg,
    [role="button"].bg-yellow-500 svg,
    [role="button"][class*="bg-yellow-500"] svg {
      color: var(--button-text-color) !important;
    }

    /* Live update rotating border effect with active theme colors */
    .rotating-border-effect::before {
      background: conic-gradient(
        from 0deg,
        ${validPrimary} 0deg,
        ${validSecondary} 120deg,
        ${validPrimary} 240deg,
        ${validSecondary} 360deg
      ) !important;
    }
  `;

  // Persist locally for instant hydration before network response
  try {
    localStorage.setItem('watchwds_primary_color', validPrimary);
    localStorage.setItem('watchwds_secondary_color', validSecondary);
    localStorage.setItem('watchwds_button_text_color', validButtonText);
  } catch (e) {
    // LocalStorage quota or privacy mode handling
  }
}

// Read stored colors from LocalStorage (synchronous for fast boot)
export function getStoredThemeColors(): { primary: string; secondary: string; buttonTextColor: string } {
  if (typeof window === 'undefined') {
    return { 
      primary: DEFAULT_PRIMARY_COLOR, 
      secondary: DEFAULT_SECONDARY_COLOR,
      buttonTextColor: DEFAULT_BUTTON_TEXT_COLOR
    };
  }
  const storedPrimary = localStorage.getItem('watchwds_primary_color');
  const storedSecondary = localStorage.getItem('watchwds_secondary_color');
  const storedButtonText = localStorage.getItem('watchwds_button_text_color');
  return {
    primary: storedPrimary && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(storedPrimary)
      ? storedPrimary
      : DEFAULT_PRIMARY_COLOR,
    secondary: storedSecondary && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(storedSecondary)
      ? storedSecondary
      : DEFAULT_SECONDARY_COLOR,
    buttonTextColor: storedButtonText && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(storedButtonText)
      ? storedButtonText
      : DEFAULT_BUTTON_TEXT_COLOR,
  };
}

// Initialize theme colors at bootstrap
export function initThemeColors() {
  const { primary, secondary, buttonTextColor } = getStoredThemeColors();
  applyThemeColors(primary, secondary, buttonTextColor);
}
