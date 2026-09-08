export interface PresetAvatar {
  id: string;
  label: string;
  dataUrl: string;
  category: 'football' | 'basketball' | 'champion' | 'combat' | 'gaming' | 'athletics';
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  {
    id: 'striker-gold',
    label: 'Football Striker',
    category: 'football',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-striker" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#F59E0B" />
            <stop offset="100%" stop-color="#D97706" />
          </linearGradient>
          <linearGradient id="skin1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FED7AA" />
            <stop offset="100%" stop-color="#FDBA74" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="20" fill="url(#bg-striker)" />
        <circle cx="50" cy="40" r="18" fill="url(#skin1)" />
        <!-- Jersey -->
        <path d="M22 88 C25 64 35 60 50 60 C65 60 75 64 78 88 Z" fill="#1E293B" />
        <path d="M42 60 L50 72 L58 60 Z" fill="#F59E0B" />
        <!-- Hair & Headband -->
        <path d="M32 36 C32 24 68 24 68 36 C64 30 36 30 32 36 Z" fill="#0F172A" />
        <rect x="32" y="32" width="36" height="5" rx="2" fill="#EF4444" />
        <!-- Number 10 -->
        <text x="50" y="82" fill="#F8FAFC" font-size="12" font-family="system-ui, sans-serif" font-weight="900" text-anchor="middle">10</text>
      </svg>
    `)
  },
  {
    id: 'champion-trophy',
    label: 'Golden Champion',
    category: 'champion',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-champ" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FBBF24" />
            <stop offset="100%" stop-color="#B45309" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="20" fill="url(#bg-champ)" />
        <!-- Trophy Icon -->
        <circle cx="50" cy="38" r="16" fill="#FEF08A" opacity="0.3" />
        <path d="M35 30 L65 30 C65 46 56 54 50 54 C44 54 35 46 35 30 Z" fill="#FFFFFF" />
        <path d="M35 34 C26 34 26 44 35 44" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" />
        <path d="M65 34 C74 34 74 44 65 44" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" />
        <rect x="47" y="54" width="6" height="14" fill="#FFFFFF" />
        <rect x="36" y="68" width="28" height="8" rx="2" fill="#FFFFFF" />
        <polygon points="50,22 53,28 59,28 54,32 56,38 50,34 44,38 46,32 41,28 47,28" fill="#FFFFFF" />
      </svg>
    `)
  },
  {
    id: 'streamer-neon',
    label: 'Esports Streamer',
    category: 'gaming',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-stream" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#6366F1" />
            <stop offset="100%" stop-color="#8B5CF6" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="20" fill="url(#bg-stream)" />
        <circle cx="50" cy="42" r="17" fill="#E2E8F0" />
        <!-- Headset -->
        <path d="M30 42 C30 25 70 25 70 42" stroke="#0F172A" stroke-width="5" fill="none" stroke-linecap="round" />
        <rect x="27" y="36" width="7" height="15" rx="3" fill="#10B981" />
        <rect x="66" y="36" width="7" height="15" rx="3" fill="#10B981" />
        <!-- Mic -->
        <path d="M34 47 Q40 56 46 54" stroke="#0F172A" stroke-width="2.5" fill="none" stroke-linecap="round" />
        <!-- Gamer Hoodie -->
        <path d="M24 88 C26 64 36 62 50 62 C64 62 74 64 76 88 Z" fill="#0F172A" />
        <path d="M44 62 L50 74 L56 62 Z" fill="#6366F1" />
      </svg>
    `)
  },
  {
    id: 'baller-orange',
    label: 'Basketball Baller',
    category: 'basketball',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-baller" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#EA580C" />
            <stop offset="100%" stop-color="#C2410C" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="20" fill="url(#bg-baller)" />
        <!-- Basketball -->
        <circle cx="50" cy="50" r="28" fill="#F97316" stroke="#FFFFFF" stroke-width="2.5" />
        <line x1="22" y1="50" x2="78" y2="50" stroke="#FFFFFF" stroke-width="2" />
        <line x1="50" y1="22" x2="50" y2="78" stroke="#FFFFFF" stroke-width="2" />
        <path d="M30 28 C42 40 42 60 30 72" stroke="#FFFFFF" stroke-width="2" fill="none" />
        <path d="M70 28 C58 40 58 60 70 72" stroke="#FFFFFF" stroke-width="2" fill="none" />
      </svg>
    `)
  },
  {
    id: 'boxing-champ',
    label: 'Fighter / Boxing',
    category: 'combat',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-fight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#DC2626" />
            <stop offset="100%" stop-color="#991B1B" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="20" fill="url(#bg-fight)" />
        <!-- Boxing Glove -->
        <circle cx="50" cy="46" r="24" fill="#FEF2F2" />
        <path d="M38 40 C38 30 62 30 62 44 C62 52 54 58 46 58 L46 68 L38 68 Z" fill="#DC2626" />
        <path d="M34 44 C34 38 42 38 44 44 L44 54 C40 54 34 50 34 44 Z" fill="#B91C1C" />
        <rect x="36" y="66" width="18" height="6" rx="2" fill="#1E293B" />
      </svg>
    `)
  },
  {
    id: 'speed-racer',
    label: 'Pro Racer / Speed',
    category: 'athletics',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-race" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0284C7" />
            <stop offset="100%" stop-color="#0369A1" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="20" fill="url(#bg-race)" />
        <!-- Helmet -->
        <circle cx="50" cy="45" r="22" fill="#F8FAFC" />
        <path d="M32 40 L68 40 C68 50 62 56 50 56 C38 56 32 50 32 40 Z" fill="#0F172A" />
        <rect x="34" y="42" width="32" height="6" rx="2" fill="#38BDF8" opacity="0.8" />
        <!-- Shoulders -->
        <path d="M22 88 C26 68 36 65 50 65 C64 65 74 68 78 88 Z" fill="#0F172A" />
        <path d="M46 65 L50 78 L54 65 Z" fill="#38BDF8" />
      </svg>
    `)
  },
  {
    id: 'tactician-coach',
    label: 'VIP Manager / Coach',
    category: 'football',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-coach" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#334155" />
            <stop offset="100%" stop-color="#0F172A" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="20" fill="url(#bg-coach)" />
        <circle cx="50" cy="38" r="16" fill="#FDE68A" />
        <!-- Hair -->
        <path d="M34 32 C34 20 66 20 66 32 C62 26 38 26 34 32 Z" fill="#E2E8F0" />
        <!-- Suit & Tie -->
        <path d="M22 88 C26 62 36 58 50 58 C64 58 74 62 78 88 Z" fill="#1E293B" />
        <polygon points="50,58 44,70 56,70" fill="#FFFFFF" />
        <polygon points="50,66 47,84 50,88 53,84" fill="#EF4444" />
      </svg>
    `)
  },
  {
    id: 'athletic-gold',
    label: 'Track & Field Star',
    category: 'athletics',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-track" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#10B981" />
            <stop offset="100%" stop-color="#047857" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="20" fill="url(#bg-track)" />
        <circle cx="50" cy="40" r="18" fill="#FCD34D" />
        <!-- Headband -->
        <rect x="32" y="32" width="36" height="5" rx="2" fill="#FFFFFF" />
        <!-- Athletic Singlet -->
        <path d="M24 88 C26 64 36 60 50 60 C64 60 74 64 76 88 Z" fill="#064E3B" />
        <path d="M38 60 L50 78 L62 60 Z" fill="#FCD34D" />
        <!-- Star -->
        <polygon points="50,68 52,73 57,73 53,76 55,81 50,78 45,81 47,76 43,73 48,73" fill="#FFFFFF" />
      </svg>
    `)
  }
];
