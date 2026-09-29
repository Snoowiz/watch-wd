import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Check, 
  RotateCcw, 
  CheckCircle, 
  Sparkles, 
  Pipette, 
  Copy, 
  Radio, 
  Tv, 
  Flame, 
  ShieldCheck, 
  Eye
} from 'lucide-react';
import { useSettingsStore } from '../../store';
import { 
  COLOR_PRESETS, 
  DEFAULT_PRIMARY_COLOR, 
  DEFAULT_SECONDARY_COLOR, 
  generateShades, 
  getContrastTextColor,
  applyThemeColors,
  ColorPreset 
} from '../../utils/themeColors';

export function AdminSiteColorSettings() {
  const { siteColorSettings, setSiteColorSettings } = useSettingsStore();

  const [primaryColor, setPrimaryColor] = useState<string>(
    siteColorSettings?.primaryColor || DEFAULT_PRIMARY_COLOR
  );
  const [secondaryColor, setSecondaryColor] = useState<string>(
    siteColorSettings?.secondaryColor || DEFAULT_SECONDARY_COLOR
  );

  const [hexInput, setHexInput] = useState<string>(
    (siteColorSettings?.primaryColor || DEFAULT_PRIMARY_COLOR).toUpperCase()
  );
  const [secondaryHexInput, setSecondaryHexInput] = useState<string>(
    (siteColorSettings?.secondaryColor || DEFAULT_SECONDARY_COLOR).toUpperCase()
  );

  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  // Sync state when store updates
  useEffect(() => {
    if (siteColorSettings?.primaryColor) {
      setPrimaryColor(siteColorSettings.primaryColor);
      setHexInput(siteColorSettings.primaryColor.toUpperCase());
    }
    if (siteColorSettings?.secondaryColor) {
      setSecondaryColor(siteColorSettings.secondaryColor);
      setSecondaryHexInput(siteColorSettings.secondaryColor.toUpperCase());
    }
  }, [siteColorSettings]);

  // Handle primary color change
  const handlePrimaryChange = (newHex: string) => {
    setPrimaryColor(newHex);
    setHexInput(newHex.toUpperCase());
    applyThemeColors(newHex, secondaryColor);
    setIsSaved(false);
  };

  // Handle secondary color change
  const handleSecondaryChange = (newHex: string) => {
    setSecondaryColor(newHex);
    setSecondaryHexInput(newHex.toUpperCase());
    applyThemeColors(primaryColor, newHex);
    setIsSaved(false);
  };

  // Handle typing in primary hex input
  const handlePrimaryHexInput = (val: string) => {
    let clean = val.trim();
    if (!clean.startsWith('#')) {
      clean = '#' + clean;
    }
    setHexInput(clean.toUpperCase());
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(clean)) {
      setPrimaryColor(clean);
      applyThemeColors(clean, secondaryColor);
      setIsSaved(false);
    }
  };

  // Handle typing in secondary hex input
  const handleSecondaryHexInput = (val: string) => {
    let clean = val.trim();
    if (!clean.startsWith('#')) {
      clean = '#' + clean;
    }
    setSecondaryHexInput(clean.toUpperCase());
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(clean)) {
      setSecondaryColor(clean);
      applyThemeColors(primaryColor, clean);
      setIsSaved(false);
    }
  };

  // Handle preset selection
  const handleSelectPreset = (preset: ColorPreset) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
    setHexInput(preset.primary.toUpperCase());
    setSecondaryHexInput(preset.secondary.toUpperCase());
    applyThemeColors(preset.primary, preset.secondary);
    setIsSaved(false);
  };

  // Reset to default WatchWDS gold
  const handleResetToDefault = () => {
    setPrimaryColor(DEFAULT_PRIMARY_COLOR);
    setSecondaryColor(DEFAULT_SECONDARY_COLOR);
    setHexInput(DEFAULT_PRIMARY_COLOR);
    setSecondaryHexInput(DEFAULT_SECONDARY_COLOR);
    applyThemeColors(DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR);
    setIsSaved(false);
  };

  // Save to backend database
  const handleSave = () => {
    setSiteColorSettings({
      primaryColor,
      secondaryColor
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  // Copy hex code to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedHex(text);
    setTimeout(() => setCopiedHex(null), 1500);
  };

  // Native EyeDropper API if supported in modern browsers
  const handleEyeDropper = async (target: 'primary' | 'secondary') => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          if (target === 'primary') {
            handlePrimaryChange(result.sRGBHex);
          } else {
            handleSecondaryChange(result.sRGBHex);
          }
        }
      } catch (e) {
        // User cancelled picker
      }
    }
  };

  const shades = generateShades(primaryColor);
  const contrastText = getContrastTextColor(primaryColor);

  return (
    <div className="space-y-8 text-left">
      {/* Introduction Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 shadow-inner">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-105"
            style={{ backgroundColor: primaryColor, color: contrastText }}
          >
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-base flex items-center gap-2">
              Site Brand & Accent Color System
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
                Tailwind v4 Engine
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Customize the platform's primary accent color. Changes take effect across buttons, live badges, navigation, and glows.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all flex items-center gap-1.5"
            title="Reset to default WatchWDS gold and indigo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
        </div>
      </div>

      {/* 1. Curated Luxury Color Presets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" style={{ color: primaryColor }} />
              Quick Theme Presets
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select one of our curated themes or create a completely custom color below.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {COLOR_PRESETS.map((preset) => {
            const isSelected = 
              primaryColor.toLowerCase() === preset.primary.toLowerCase() &&
              secondaryColor.toLowerCase() === preset.secondary.toLowerCase();

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`group text-left p-3 rounded-xl border transition-all flex items-center gap-3 relative overflow-hidden ${
                  isSelected
                    ? 'border-yellow-500 dark:border-yellow-500 bg-yellow-500/5 dark:bg-yellow-500/10 shadow-md ring-1 ring-yellow-500/30'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {/* Visual dual swatch */}
                <div className="relative w-10 h-10 rounded-xl shrink-0 shadow-inner flex items-center justify-center overflow-hidden border border-black/10 dark:border-white/10"
                     style={{ backgroundColor: preset.primary }}>
                  <div 
                    className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full border border-white dark:border-slate-900 shadow-sm"
                    style={{ backgroundColor: preset.secondary }}
                  />
                  {isSelected && (
                    <Check 
                      className="w-5 h-5 z-10 drop-shadow-md" 
                      style={{ color: getContrastTextColor(preset.primary) }} 
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {preset.name}
                    </span>
                    <span className="text-[10px] font-mono font-medium text-slate-400 uppercase">
                      {preset.primary}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {preset.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Custom Color Pickers & Hex Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
        
        {/* Primary Accent Color Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: primaryColor }} />
              Primary Accent Color (Replaces Yellow)
            </label>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {primaryColor.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Color Swatch & Native Color Input */}
            <div className="relative group shrink-0">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => handlePrimaryChange(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                id="primary-color-native-picker"
                title="Click to open color picker palette"
              />
              <div 
                className="w-12 h-12 rounded-xl border-2 border-slate-300 dark:border-slate-600 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform"
                style={{ backgroundColor: primaryColor }}
              >
                <Palette 
                  className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity drop-shadow" 
                  style={{ color: contrastText }} 
                />
              </div>
            </div>

            {/* Hex Input Field */}
            <div className="relative flex-1">
              <input
                type="text"
                value={hexInput}
                onChange={(e) => handlePrimaryHexInput(e.target.value)}
                placeholder="#EAB308"
                maxLength={7}
                className="w-full pl-3 pr-20 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {'EyeDropper' in (typeof window !== 'undefined' ? window : {}) && (
                  <button
                    type="button"
                    onClick={() => handleEyeDropper('primary')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                    title="Pick color from screen"
                  >
                    <Pipette className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleCopy(primaryColor)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                  title="Copy Hex Code"
                >
                  {copiedHex === primaryColor ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Main brand color used for action buttons, video badges, glows, and header accents.
          </p>
        </div>

        {/* Secondary Accent Color Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: secondaryColor }} />
              Secondary / Highlight Accent Color
            </label>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {secondaryColor.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Color Swatch & Native Color Input */}
            <div className="relative group shrink-0">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => handleSecondaryChange(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                id="secondary-color-native-picker"
                title="Click to open secondary color picker"
              />
              <div 
                className="w-12 h-12 rounded-xl border-2 border-slate-300 dark:border-slate-600 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform"
                style={{ backgroundColor: secondaryColor }}
              >
                <Palette 
                  className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity drop-shadow" 
                  style={{ color: getContrastTextColor(secondaryColor) }} 
                />
              </div>
            </div>

            {/* Hex Input Field */}
            <div className="relative flex-1">
              <input
                type="text"
                value={secondaryHexInput}
                onChange={(e) => handleSecondaryHexInput(e.target.value)}
                placeholder="#6366F1"
                maxLength={7}
                className="w-full pl-3 pr-20 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {'EyeDropper' in (typeof window !== 'undefined' ? window : {}) && (
                  <button
                    type="button"
                    onClick={() => handleEyeDropper('secondary')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                    title="Pick color from screen"
                  >
                    <Pipette className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleCopy(secondaryColor)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                  title="Copy Hex Code"
                >
                  {copiedHex === secondaryColor ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Accent color used for gradient animations, secondary badges, and complementary highlights.
          </p>
        </div>
      </div>

      {/* 3. Generated Dynamic Shade Spectrum */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Auto-Generated Color Shades (50 - 950)
          </h4>
          <span className="text-[11px] text-slate-400">Generated by mathematical color mixing</span>
        </div>
        
        <div className="grid grid-cols-11 gap-1.5 p-2 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((shade) => {
            const hex = shades[shade];
            const isBase = shade === 500;
            return (
              <div 
                key={shade}
                className="group relative flex flex-col items-center cursor-pointer"
                onClick={() => handleCopy(hex)}
                title={`Shade ${shade}: ${hex} (Click to copy)`}
              >
                <div 
                  className={`w-full h-10 rounded-lg shadow-sm transition-transform group-hover:scale-105 border ${
                    isBase ? 'ring-2 ring-white dark:ring-slate-300 border-white/50' : 'border-black/5 dark:border-white/5'
                  }`}
                  style={{ backgroundColor: hex }}
                />
                <span className={`text-[10px] font-mono mt-1 font-semibold ${
                  isBase ? 'text-slate-900 dark:text-white font-black' : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {shade}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Live Interactive Platform Preview Card */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-500" />
            Live Platform Component Preview
          </h4>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Changes apply in real-time
          </span>
        </div>

        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-white shadow-2xl relative overflow-hidden">
          {/* Subtle background glow with chosen color */}
          <div 
            className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: primaryColor }}
          />

          <div className="relative z-10 space-y-6">
            {/* Mock Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white">Watch</span>
                <span className="text-xl font-black tracking-tight" style={{ color: primaryColor }}>WDS</span>
              </div>

              <div className="flex items-center gap-3">
                <span 
                  className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  style={{ backgroundColor: `${primaryColor}25`, color: primaryColor, border: `1px solid ${primaryColor}40` }}
                >
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  LIVE NOW
                </span>
                <span 
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: secondaryColor, color: getContrastTextColor(secondaryColor) }}
                >
                  PRO PASS
                </span>
              </div>
            </div>

            {/* Mock Match Card with Animated Rotating Border */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: primaryColor, color: contrastText }}
                >
                  <Tv className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-bold text-white text-sm">Super Cup Final: Lions vs Titans</h5>
                  <p className="text-xs text-slate-400">National Stadium Arena • 1080p 60fps Broadcast</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Rotating Border Button Demo */}
                <div className="rotating-border-effect btn-rotating-border">
                  <button 
                    type="button"
                    className="btn-rotating-border-inner px-5 py-2 text-xs font-black bg-slate-950 hover:bg-slate-900 transition-colors flex items-center gap-2"
                    style={{ color: primaryColor }}
                  >
                    <Flame className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                    Watch Match
                  </button>
                </div>

                {/* Primary Solid Action Button */}
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all hover:scale-105"
                  style={{ backgroundColor: primaryColor, color: contrastText }}
                >
                  Unlock PPV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Settings Action Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Colors are saved to system settings and cached locally for instantaneous page loading.
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className={`px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2 ${
            isSaved 
              ? 'bg-emerald-600 text-white scale-105' 
              : 'hover:opacity-90'
          }`}
          style={!isSaved ? { backgroundColor: primaryColor, color: contrastText } : undefined}
          id="save-site-colors-btn"
        >
          {isSaved ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Colors Saved Successfully!
            </>
          ) : (
            'Save Color Configuration'
          )}
        </button>
      </div>
    </div>
  );
}
