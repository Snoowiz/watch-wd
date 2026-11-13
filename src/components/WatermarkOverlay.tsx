import React from 'react';
import type { MuxWatermarkConfig } from '../store';

export const DEFAULT_WATERMARK_CONFIG: MuxWatermarkConfig = {
  enabled: false,
  mode: 'mux_burn_in',
  url: '',
  vertical_align: 'top',
  vertical_margin: '4%',
  horizontal_align: 'right',
  horizontal_margin: '4%',
  width: '14%',
  opacity: '85%',
};

export function parseWatermarkConfig(raw?: MuxWatermarkConfig | string | null): MuxWatermarkConfig {
  if (!raw) return { ...DEFAULT_WATERMARK_CONFIG };
  let obj: any = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return { ...DEFAULT_WATERMARK_CONFIG };
    }
  }
  if (!obj || typeof obj !== 'object') return { ...DEFAULT_WATERMARK_CONFIG };

  return {
    enabled: Boolean(obj.enabled),
    mode: obj.mode === 'player_overlay' ? 'player_overlay' : 'mux_burn_in',
    url: typeof obj.url === 'string' ? obj.url.trim() : '',
    vertical_align:
      obj.vertical_align === 'middle' || obj.vertical_align === 'bottom' || obj.vertical_align === 'top'
        ? obj.vertical_align
        : DEFAULT_WATERMARK_CONFIG.vertical_align,
    vertical_margin: typeof obj.vertical_margin === 'string' && obj.vertical_margin.trim()
      ? obj.vertical_margin.trim()
      : DEFAULT_WATERMARK_CONFIG.vertical_margin,
    horizontal_align:
      obj.horizontal_align === 'left' || obj.horizontal_align === 'center' || obj.horizontal_align === 'right'
        ? obj.horizontal_align
        : DEFAULT_WATERMARK_CONFIG.horizontal_align,
    horizontal_margin: typeof obj.horizontal_margin === 'string' && obj.horizontal_margin.trim()
      ? obj.horizontal_margin.trim()
      : DEFAULT_WATERMARK_CONFIG.horizontal_margin,
    width: typeof obj.width === 'string' && obj.width.trim() ? obj.width.trim() : DEFAULT_WATERMARK_CONFIG.width,
    opacity: typeof obj.opacity === 'string' && obj.opacity.trim() ? obj.opacity.trim() : DEFAULT_WATERMARK_CONFIG.opacity,
    ...(obj.disabled === true && !obj.enabled ? { disabled: true } : {}),
  };
}

function parseOpacityValue(raw?: string): number {
  const num = Number.parseFloat(String(raw || '85').replace('%', '').trim());
  if (!Number.isFinite(num)) return 0.85;
  const fraction = num > 1 ? num / 100 : num;
  return Math.max(0.05, Math.min(1, fraction));
}

export function resolveRenderableWatermarkUrl(rawUrl?: string | null): string {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';
  if (typeof window !== 'undefined') {
    const localWmMatch = trimmed.match(/^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?(\/api\/mux\/watermarks\/.+)$/i);
    if (localWmMatch) {
      return localWmMatch[1];
    }
  }
  return trimmed;
}

export function WatermarkOverlay({
  config,
  forcePreview = false,
  allowBurnInFallback = false,
}: {
  config?: MuxWatermarkConfig | string | null;
  forcePreview?: boolean;
  allowBurnInFallback?: boolean;
}) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const wm = parseWatermarkConfig(config);
  const renderUrl = resolveRenderableWatermarkUrl(wm.url);

  React.useEffect(() => {
    setImgFailed(false);
  }, [renderUrl]);

  if (!renderUrl || imgFailed) return null;
  const isRenderableMode = wm.mode === 'player_overlay' || allowBurnInFallback;
  if (!forcePreview && (!wm.enabled || !isRenderableMode)) {
    return null;
  }

  const transforms: string[] = [];
  const style: React.CSSProperties = {
    position: 'absolute',
    width: wm.width || '14%',
    height: 'auto',
    maxWidth: '45%',
    maxHeight: '45%',
    objectFit: 'contain',
    opacity: parseOpacityValue(wm.opacity),
    filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.45))',
    pointerEvents: 'none',
  };

  if (wm.vertical_align === 'top') {
    style.top = wm.vertical_margin || '4%';
  } else if (wm.vertical_align === 'bottom') {
    style.bottom = wm.vertical_margin || '4%';
  } else {
    style.top = '50%';
    transforms.push('translateY(-50%)');
  }

  if (wm.horizontal_align === 'left') {
    style.left = wm.horizontal_margin || '4%';
  } else if (wm.horizontal_align === 'right') {
    style.right = wm.horizontal_margin || '4%';
  } else {
    style.left = '50%';
    transforms.push('translateX(-50%)');
  }

  if (transforms.length > 0) {
    style.transform = transforms.join(' ');
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none"
      style={{ transform: 'translateZ(0)' }}
    >
      <img
        src={renderUrl}
        alt=""
        style={style}
        draggable={false}
        onError={() => setImgFailed(true)}
      />
    </div>
  );
}

