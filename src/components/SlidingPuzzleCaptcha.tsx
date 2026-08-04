import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';

// Puzzle piece shape path generator
function drawPuzzlePiece(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  operation: 'clip' | 'fill'
) {
  const s = size;
  const r = s * 0.2; // tab radius
  ctx.beginPath();
  ctx.moveTo(x, y);
  // Top edge with tab
  ctx.lineTo(x + s * 0.35, y);
  ctx.arc(x + s * 0.5, y - r * 0.4, r, Math.PI * 0.8, Math.PI * 0.2, false);
  ctx.lineTo(x + s, y);
  // Right edge
  ctx.lineTo(x + s, y + s * 0.35);
  ctx.arc(x + s + r * 0.4, y + s * 0.5, r, Math.PI * 1.3, Math.PI * 0.7, false);
  ctx.lineTo(x + s, y + s);
  // Bottom edge
  ctx.lineTo(x, y + s);
  // Left edge
  ctx.lineTo(x, y);
  ctx.closePath();

  if (operation === 'clip') {
    ctx.clip();
  } else {
    ctx.fill();
  }
}

// Stock background images for puzzle (using Unsplash source for variety)
const PUZZLE_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1518173946687-a4c932e2b7d0?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=200&fit=crop',
];

interface SlidingPuzzleCaptchaProps {
  isOpen: boolean;
  onSuccess: (captchaToken: string) => void;
  onClose: () => void;
}

export function SlidingPuzzleCaptcha({ isOpen, onSuccess, onClose }: SlidingPuzzleCaptchaProps) {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [targetX, setTargetX] = useState(0);
  const [targetY, setTargetY] = useState(0);
  const [sliderX, setSliderX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'verifying'>('idle');
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pieceCanvasRef = useRef<HTMLCanvasElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);

  const CANVAS_WIDTH = 320;
  const CANVAS_HEIGHT = 180;
  const PIECE_SIZE = 48;
  const TOLERANCE = 8;

  // Initialize puzzle challenge from server
  const initPuzzle = useCallback(async () => {
    setIsLoading(true);
    setStatus('idle');
    setSliderX(0);

    try {
      const res = await fetch('/api/captcha/generate', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate captcha');
      const data = await res.json();
      setCaptchaToken(data.token);
      setTargetX(data.targetX);
      setTargetY(data.targetY);

      // Load background image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setBgImage(img);
        setIsLoading(false);
      };
      img.onerror = () => {
        // Fallback: generate a gradient canvas instead
        const fallback = new Image();
        const cvs = document.createElement('canvas');
        cvs.width = CANVAS_WIDTH;
        cvs.height = CANVAS_HEIGHT;
        const fCtx = cvs.getContext('2d')!;
        const grad = fCtx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        grad.addColorStop(0, '#667eea');
        grad.addColorStop(0.5, '#764ba2');
        grad.addColorStop(1, '#f093fb');
        fCtx.fillStyle = grad;
        fCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // Add some visual noise
        for (let i = 0; i < 60; i++) {
          fCtx.fillStyle = `rgba(255,255,255,${Math.random() * 0.15})`;
          fCtx.fillRect(
            Math.random() * CANVAS_WIDTH,
            Math.random() * CANVAS_HEIGHT,
            Math.random() * 60 + 10,
            Math.random() * 30 + 5
          );
        }
        fallback.src = cvs.toDataURL();
        fallback.onload = () => {
          setBgImage(fallback);
          setIsLoading(false);
        };
      };
      // Pick random image from the list
      const randomBg = PUZZLE_BACKGROUNDS[data.imageIndex % PUZZLE_BACKGROUNDS.length];
      img.src = randomBg;
    } catch (err) {
      console.error('Captcha init error:', err);
      setIsLoading(false);
    }
  }, []);

  // Draw the puzzle canvas
  useEffect(() => {
    if (!bgImage || !canvasRef.current || !pieceCanvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const pieceCanvas = pieceCanvasRef.current;
    const pieceCtx = pieceCanvas.getContext('2d')!;

    // Draw main canvas with notch
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.drawImage(bgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw notch shadow/hole
    ctx.save();
    drawPuzzlePiece(ctx, targetX, targetY, PIECE_SIZE, 'clip');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();

    // Draw notch border
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    drawPuzzlePiece(ctx, targetX, targetY, PIECE_SIZE, 'fill');
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    const region = new Path2D();
    const nx = targetX, ny = targetY, ns = PIECE_SIZE, nr = ns * 0.2;
    region.moveTo(nx, ny);
    region.lineTo(nx + ns * 0.35, ny);
    region.arc(nx + ns * 0.5, ny - nr * 0.4, nr, Math.PI * 0.8, Math.PI * 0.2, false);
    region.lineTo(nx + ns, ny);
    region.lineTo(nx + ns, ny + ns * 0.35);
    region.arc(nx + ns + nr * 0.4, ny + ns * 0.5, nr, Math.PI * 1.3, Math.PI * 0.7, false);
    region.lineTo(nx + ns, ny + ns);
    region.lineTo(nx, ny + ns);
    region.closePath();
    ctx.stroke(region);
    ctx.restore();

    // Draw puzzle piece thumbnail
    pieceCanvas.width = PIECE_SIZE + 20;
    pieceCanvas.height = PIECE_SIZE + 20;
    pieceCtx.clearRect(0, 0, pieceCanvas.width, pieceCanvas.height);

    // Shadow for piece
    pieceCtx.shadowColor = 'rgba(0,0,0,0.4)';
    pieceCtx.shadowBlur = 6;
    pieceCtx.shadowOffsetX = 2;
    pieceCtx.shadowOffsetY = 2;

    pieceCtx.save();
    drawPuzzlePiece(pieceCtx, 5, 5, PIECE_SIZE, 'clip');
    pieceCtx.drawImage(
      bgImage,
      targetX, targetY, PIECE_SIZE + 10, PIECE_SIZE + 10,
      5, 5, PIECE_SIZE + 10, PIECE_SIZE + 10
    );
    pieceCtx.restore();

    // Border on piece
    pieceCtx.strokeStyle = 'rgba(255,255,255,0.9)';
    pieceCtx.lineWidth = 2;
    const pPath = new Path2D();
    pPath.moveTo(5, 5);
    pPath.lineTo(5 + PIECE_SIZE * 0.35, 5);
    pPath.arc(5 + PIECE_SIZE * 0.5, 5 - nr * 0.4, nr, Math.PI * 0.8, Math.PI * 0.2, false);
    pPath.lineTo(5 + PIECE_SIZE, 5);
    pPath.lineTo(5 + PIECE_SIZE, 5 + PIECE_SIZE * 0.35);
    pPath.arc(5 + PIECE_SIZE + nr * 0.4, 5 + PIECE_SIZE * 0.5, nr, Math.PI * 1.3, Math.PI * 0.7, false);
    pPath.lineTo(5 + PIECE_SIZE, 5 + PIECE_SIZE);
    pPath.lineTo(5, 5 + PIECE_SIZE);
    pPath.closePath();
    pieceCtx.stroke(pPath);
  }, [bgImage, targetX, targetY]);

  // Initialize on open
  useEffect(() => {
    if (isOpen) {
      initPuzzle();
    }
  }, [isOpen, initPuzzle]);

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (status !== 'idle') return;
    setIsDragging(true);
    startXRef.current = e.clientX - sliderX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || status !== 'idle') return;
    const trackWidth = trackRef.current?.offsetWidth || CANVAS_WIDTH;
    const maxSlide = trackWidth - 44; // Handle width
    let newX = e.clientX - startXRef.current;
    newX = Math.max(0, Math.min(newX, maxSlide));
    setSliderX(newX);
  };

  const handlePointerUp = async () => {
    if (!isDragging || status !== 'idle') return;
    setIsDragging(false);

    if (!captchaToken) return;

    // Server-side verification
    setStatus('verifying');
    try {
      const res = await fetch('/api/captcha/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: captchaToken, sliderX: Math.round(sliderX) })
      });
      const data = await res.json();

      if (data.success) {
        setStatus('success');
        setTimeout(() => {
          onSuccess(data.verifiedToken);
        }, 800);
      } else {
        setStatus('error');
        setTimeout(() => {
          initPuzzle();
        }, 600);
      }
    } catch {
      setStatus('error');
      setTimeout(() => {
        initPuzzle();
      }, 600);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-[360px] max-w-[95vw] overflow-hidden ${
          status === 'error' ? 'animate-shake' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Security Verification</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Drag the slider to complete the puzzle</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Puzzle Canvas */}
        <div className="relative px-5 pt-4">
          {isLoading ? (
            <div className="w-full aspect-[16/9] bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : (
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700"
                style={{ imageRendering: 'auto' }}
              />
              {/* Floating puzzle piece */}
              <canvas
                ref={pieceCanvasRef}
                className="absolute pointer-events-none transition-none"
                style={{
                  left: `${(sliderX / (CANVAS_WIDTH - 44)) * 100}%`,
                  top: `${(targetY / CANVAS_HEIGHT) * 100}%`,
                  width: `${((PIECE_SIZE + 20) / CANVAS_WIDTH) * 100}%`,
                  transform: 'translateX(-5px) translateY(-5px)',
                  filter: status === 'success' ? 'drop-shadow(0 0 8px rgba(34,197,94,0.6))' : 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
                }}
              />
              {/* Success overlay */}
              {status === 'success' && (
                <div className="absolute inset-0 bg-green-500/20 rounded-xl flex items-center justify-center backdrop-blur-[1px] animate-in fade-in duration-300">
                  <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 animate-in zoom-in duration-300">
                    <Check className="w-7 h-7 text-white" strokeWidth={3} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Slider Track */}
        <div className="px-5 pt-4 pb-5">
          <div
            ref={trackRef}
            className={`relative w-full h-11 rounded-full border-2 transition-colors duration-300 ${
              status === 'success'
                ? 'bg-green-50 dark:bg-green-950/30 border-green-400 dark:border-green-500'
                : status === 'error'
                ? 'bg-red-50 dark:bg-red-950/30 border-red-400 dark:border-red-500'
                : status === 'verifying'
                ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-400 dark:border-yellow-500'
                : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
            }`}
          >
            {/* Progress fill */}
            <div
              className={`absolute left-0 top-0 h-full rounded-full transition-colors duration-300 ${
                status === 'success'
                  ? 'bg-green-100 dark:bg-green-900/40'
                  : status === 'error'
                  ? 'bg-red-100 dark:bg-red-900/40'
                  : 'bg-indigo-50 dark:bg-indigo-900/20'
              }`}
              style={{ width: `${sliderX + 44}px` }}
            />
            {/* Center text */}
            {sliderX < 10 && status === 'idle' && (
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-400 dark:text-slate-500 select-none pointer-events-none tracking-wide">
                Drag to complete →
              </span>
            )}
            {status === 'verifying' && (
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-yellow-600 dark:text-yellow-400 select-none pointer-events-none">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Verifying...
              </span>
            )}
            {/* Draggable handle */}
            <div
              ref={sliderRef}
              className={`absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full cursor-grab active:cursor-grabbing shadow-lg flex items-center justify-center transition-colors duration-300 select-none ${
                status === 'success'
                  ? 'bg-green-500 text-white shadow-green-500/30'
                  : status === 'error'
                  ? 'bg-red-500 text-white shadow-red-500/30'
                  : isDragging
                  ? 'bg-indigo-600 text-white shadow-indigo-500/30 scale-110'
                  : 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-600 hover:bg-indigo-50 dark:hover:bg-slate-600'
              }`}
              style={{ left: `${sliderX}px`, transition: isDragging ? 'none' : 'background-color 0.3s, transform 0.15s' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {status === 'success' ? (
                <Check className="w-5 h-5" strokeWidth={3} />
              ) : status === 'error' ? (
                <X className="w-5 h-5" strokeWidth={3} />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
            </div>
          </div>

          {/* Refresh link */}
          {status === 'idle' && !isLoading && (
            <button
              onClick={initPuzzle}
              className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors mx-auto"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh puzzle
            </button>
          )}
        </div>
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
