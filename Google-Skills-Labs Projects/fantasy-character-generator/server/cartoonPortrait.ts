// Procedural Cartoon & Video Game Style Character Portrait Generator
// Generates unique, colorful SVG character art based on Name, Class, and Seed

interface PortraitOptions {
  name: string;
  characterClass: string;
  race?: string;
  seed?: number | string;
}

export function generateCartoonPortrait(options: PortraitOptions): string {
  const { name, characterClass, race = '', seed = 0 } = options;
  const hash = Math.abs(hashString(`${name}-${characterClass}-${seed}`));

  const cls = (characterClass || 'Warrior').toLowerCase();

  // Class specific color palettes & themes
  const themes: Record<string, {
    bg1: string;
    bg2: string;
    accent: string;
    armor: string;
    armorTrim: string;
    glow: string;
    hatType: string;
    motif: string;
  }> = {
    mage: {
      bg1: '#1e1035',
      bg2: '#3b1d6e',
      accent: '#c084fc',
      armor: '#2e1065',
      armorTrim: '#e9d5ff',
      glow: '#a855f7',
      hatType: 'wizard_hood',
      motif: 'arcane_runes',
    },
    rogue: {
      bg1: '#062822',
      bg2: '#0d4a3e',
      accent: '#34d399',
      armor: '#064e3b',
      armorTrim: '#6ee7b7',
      glow: '#10b981',
      hatType: 'thief_cowl',
      motif: 'shadow_daggers',
    },
    warrior: {
      bg1: '#3b0d0c',
      bg2: '#681816',
      accent: '#f87171',
      armor: '#450a0a',
      armorTrim: '#fca5a5',
      glow: '#ef4444',
      hatType: 'war_helm',
      motif: 'battle_sparks',
    },
    paladin: {
      bg1: '#362306',
      bg2: '#5f370e',
      accent: '#fbbf24',
      armor: '#78350f',
      armorTrim: '#fef08a',
      glow: '#f59e0b',
      hatType: 'halo_circlet',
      motif: 'holy_sun',
    },
    ranger: {
      bg1: '#0a2c1e',
      bg2: '#134e38',
      accent: '#2dd4bf',
      armor: '#064e3b',
      armorTrim: '#99f6e4',
      glow: '#14b8a6',
      hatType: 'ranger_feather',
      motif: 'forest_leaves',
    },
    cleric: {
      bg1: '#0c2738',
      bg2: '#134363',
      accent: '#38bdf8',
      armor: '#075985',
      armorTrim: '#bae6fd',
      glow: '#0ea5e9',
      hatType: 'radiant_mitre',
      motif: 'divine_cross',
    },
    druid: {
      bg1: '#1b2d07',
      bg2: '#30530b',
      accent: '#a3e635',
      armor: '#365314',
      armorTrim: '#d9f99d',
      glow: '#84cc16',
      hatType: 'antlers',
      motif: 'vines',
    },
    warlock: {
      bg1: '#260938',
      bg2: '#491068',
      accent: '#e879f9',
      armor: '#581c87',
      armorTrim: '#f0abfc',
      glow: '#d946ef',
      hatType: 'horns',
      motif: 'void_eye',
    },
    bard: {
      bg1: '#380724',
      bg2: '#641042',
      accent: '#f472b6',
      armor: '#831843',
      armorTrim: '#fbcfe8',
      glow: '#ec4899',
      hatType: 'beret',
      motif: 'music_notes',
    },
    monk: {
      bg1: '#331908',
      bg2: '#572b0d',
      accent: '#fcd34d',
      armor: '#713f12',
      armorTrim: '#fde68a',
      glow: '#eab308',
      hatType: 'headband',
      motif: 'zen_circle',
    },
  };

  const matchedKey = Object.keys(themes).find((k) => cls.includes(k)) || 'warrior';
  const theme = themes[matchedKey];

  // Variations based on seed hash
  const skinTones = ['#fbd8b5', '#f1c298', '#df9b64', '#c5783f', '#e2d4f0', '#9bc6b3', '#a78bfa'];
  const hairColors = ['#facc15', '#f97316', '#713f12', '#1e293b', '#cbd5e1', '#ef4444', '#818cf8', '#06b6d4'];
  const eyeColors = ['#38bdf8', '#34d399', '#f59e0b', '#a855f7', '#f43f5e', '#ffffff'];

  const skin = skinTones[hash % skinTones.length];
  const hair = hairColors[(hash >> 2) % hairColors.length];
  const eye = eyeColors[(hash >> 4) % eyeColors.length];
  const expressionId = (hash >> 3) % 3; // 0: confident smile, 1: fierce, 2: serene
  const hairStyleId = (hash >> 5) % 4; // 0: spikes, 1: flowing long, 2: cropped, 3: sleek

  // Render SVG elements
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
    <defs>
      <radialGradient id="bgGrad" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stop-color="${theme.bg2}" />
        <stop offset="100%" stop-color="${theme.bg1}" />
      </radialGradient>
      
      <radialGradient id="auraGlow" cx="50%" cy="45%" r="50%">
        <stop offset="0%" stop-color="${theme.glow}" stop-opacity="0.45" />
        <stop offset="100%" stop-color="${theme.glow}" stop-opacity="0" />
      </radialGradient>

      <linearGradient id="armorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.armorTrim}" />
        <stop offset="35%" stop-color="${theme.armor}" />
        <stop offset="100%" stop-color="${theme.bg1}" />
      </linearGradient>

      <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${skin}" />
        <stop offset="100%" stop-color="#b88358" stop-opacity="0.8" />
      </linearGradient>

      <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${hair}" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>

      <filter id="shadowFilter" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity="0.4" />
      </filter>
    </defs>

    <!-- Background -->
    <rect width="500" height="500" fill="url(#bgGrad)" />

    <!-- Ambient Aura -->
    <circle cx="250" cy="240" r="190" fill="url(#auraGlow)" />

    <!-- Decorative Game Rune Frame Circle -->
    <circle cx="250" cy="240" r="215" fill="none" stroke="${theme.accent}" stroke-width="2.5" stroke-opacity="0.3" stroke-dasharray="12 8" />
    <circle cx="250" cy="240" r="185" fill="none" stroke="${theme.glow}" stroke-width="1.5" stroke-opacity="0.4" />

    <!-- Background Class Motif Elements -->
    ${renderClassMotif(matchedKey, theme.accent, theme.glow, hash)}

    <g filter="url(#shadowFilter)">
      <!-- Shoulders & Upper Armor/Garment -->
      <path d="M 120 480 C 130 380, 180 340, 250 340 C 320 340, 370 380, 380 480 Z" fill="url(#armorGrad)" stroke="#0f172a" stroke-width="6" stroke-linejoin="round" />
      
      <!-- Pauldrons / Shoulder Plates -->
      <path d="M 110 470 C 120 370, 160 350, 195 385 C 160 430, 130 460, 110 470 Z" fill="${theme.armorTrim}" stroke="#0f172a" stroke-width="5" />
      <path d="M 390 470 C 380 370, 340 350, 305 385 C 340 430, 370 460, 390 470 Z" fill="${theme.armorTrim}" stroke="#0f172a" stroke-width="5" />

      <!-- Chest Emblem / Collar -->
      <path d="M 215 340 L 250 395 L 285 340 Z" fill="${theme.accent}" stroke="#0f172a" stroke-width="4" />
      <circle cx="250" cy="365" r="9" fill="${theme.glow}" stroke="#fff" stroke-width="2" />

      <!-- Neck -->
      <rect x="225" y="270" width="50" height="75" rx="10" fill="${skin}" stroke="#0f172a" stroke-width="5" />
      <!-- Neck Shadow under chin -->
      <path d="M 225 285 Q 250 305 275 285 L 275 305 Q 250 325 225 305 Z" fill="#00000028" />

      <!-- Head Base -->
      <path d="M 175 200 C 175 130, 325 130, 325 200 C 325 270, 290 305, 250 305 C 210 305, 175 270, 175 200 Z" fill="${skin}" stroke="#0f172a" stroke-width="6" stroke-linejoin="round" />

      <!-- Ears (Elf or Human) -->
      ${renderEars(race, skin)}

      <!-- Hair Back / Underlay -->
      ${renderHairBack(hairStyleId, hair)}

      <!-- Facial Features -->
      <!-- Eyebrows -->
      <path d="${expressionId === 1 ? 'M 195 185 Q 220 195 230 190' : 'M 195 185 Q 215 178 232 184'}" stroke="#0f172a" stroke-width="5" stroke-linecap="round" fill="none" />
      <path d="${expressionId === 1 ? 'M 305 185 Q 280 195 270 190' : 'M 305 185 Q 285 178 268 184'}" stroke="#0f172a" stroke-width="5" stroke-linecap="round" fill="none" />

      <!-- Big Expressive Cartoon Eyes -->
      <ellipse cx="215" cy="205" rx="17" ry="20" fill="#ffffff" stroke="#0f172a" stroke-width="4.5" />
      <ellipse cx="285" cy="205" rx="17" ry="20" fill="#ffffff" stroke="#0f172a" stroke-width="4.5" />

      <!-- Irises & Glowing Pupils -->
      <circle cx="216" cy="205" r="10.5" fill="${eye}" />
      <circle cx="284" cy="205" r="10.5" fill="${eye}" />
      <circle cx="216" cy="205" r="6" fill="#0f172a" />
      <circle cx="284" cy="205" r="6" fill="#0f172a" />

      <!-- Cute Anime/Cartoon Catchlights -->
      <circle cx="212" cy="200" r="4.5" fill="#ffffff" />
      <circle cx="218" cy="210" r="2" fill="#ffffff" />
      <circle cx="280" cy="200" r="4.5" fill="#ffffff" />
      <circle cx="286" cy="210" r="2" fill="#ffffff" />

      <!-- Nose -->
      <path d="M 248 220 Q 254 235 246 242 Q 252 242 255 240" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round" />

      <!-- Mouth -->
      ${renderMouth(expressionId)}

      <!-- Cheeks Blush -->
      <ellipse cx="190" cy="235" rx="12" ry="7" fill="#f43f5e" fill-opacity="0.25" />
      <ellipse cx="310" cy="235" rx="12" ry="7" fill="#f43f5e" fill-opacity="0.25" />

      <!-- Front Hair & Class Headgear -->
      ${renderHairFront(hairStyleId, hair)}
      ${renderHeadgear(theme.hatType, theme.armorTrim, theme.glow, theme.accent)}

      <!-- War Paint / Tattoo or Arcane Mark -->
      ${renderMark(matchedKey, theme.glow)}
    </g>

    <!-- Outer Card Frame Edge -->
    <rect x="8" y="8" width="484" height="484" rx="20" fill="none" stroke="${theme.accent}" stroke-width="4" stroke-opacity="0.6" />
    <rect x="15" y="15" width="470" height="470" rx="14" fill="none" stroke="#0f172a" stroke-width="2" stroke-opacity="0.8" />

    <!-- Corner Heraldic Emblems -->
    <path d="M 10 35 L 35 10 M 10 50 L 50 10" stroke="${theme.accent}" stroke-width="2.5" />
    <path d="M 490 35 L 465 10 M 490 50 L 450 10" stroke="${theme.accent}" stroke-width="2.5" />

    <!-- Bottom Name & Class Ribbon -->
    <g transform="translate(0, 425)">
      <!-- Ribbon Shadow -->
      <path d="M 35 30 L 465 30 L 450 72 L 50 72 Z" fill="#000000" opacity="0.6" />
      <!-- Ribbon Body -->
      <path d="M 45 20 L 455 20 L 440 65 L 60 65 Z" fill="${theme.bg1}" stroke="${theme.accent}" stroke-width="3" />
      <!-- Name Text -->
      <text x="250" y="44" font-family="'Cinzel', Georgia, serif" font-size="20" font-weight="900" fill="#fef08a" text-anchor="middle" letter-spacing="1.5">
        ${escapeXml(name.toUpperCase())}
      </text>
      <!-- Class Subtitle -->
      <text x="250" y="59" font-family="'Cinzel', Georgia, serif" font-size="11" font-weight="700" fill="${theme.accent}" text-anchor="middle" letter-spacing="2">
        ✦ ${escapeXml(characterClass.toUpperCase())} ✦
      </text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function renderEars(race: string, skin: string): string {
  const isElf = race.toLowerCase().includes('elf') || race.toLowerCase().includes('sylph');
  if (isElf) {
    return `
      <!-- Long Elf Ears -->
      <path d="M 180 200 C 140 180, 110 145, 120 135 C 135 140, 160 170, 185 195 Z" fill="${skin}" stroke="#0f172a" stroke-width="4.5" />
      <path d="M 320 200 C 360 180, 390 145, 380 135 C 365 140, 340 170, 315 195 Z" fill="${skin}" stroke="#0f172a" stroke-width="4.5" />
    `;
  }
  return `
    <!-- Round Humanoid Ears -->
    <circle cx="172" cy="210" r="14" fill="${skin}" stroke="#0f172a" stroke-width="4" />
    <circle cx="328" cy="210" r="14" fill="${skin}" stroke="#0f172a" stroke-width="4" />
  `;
}

function renderMouth(expressionId: number): string {
  if (expressionId === 0) {
    // Confident smirk
    return `<path d="M 230 262 Q 250 278 274 263" fill="none" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" />`;
  } else if (expressionId === 1) {
    // Battle grin
    return `
      <path d="M 230 260 Q 250 282 270 260 Z" fill="#ffffff" stroke="#0f172a" stroke-width="4" />
      <path d="M 235 264 L 265 264" stroke="#0f172a" stroke-width="2" />
    `;
  }
  // Serene calm
  return `<path d="M 235 264 Q 250 270 265 264" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round" />`;
}

function renderHairBack(style: number, hair: string): string {
  if (style === 1) {
    // Long flowing hair
    return `<path d="M 150 200 C 130 270, 130 360, 160 410 L 340 410 C 370 360, 370 270, 350 200 Z" fill="${hair}" stroke="#0f172a" stroke-width="5" />`;
  }
  return '';
}

function renderHairFront(style: number, hair: string): string {
  if (style === 0) {
    // Spiky anime hair
    return `
      <path d="M 165 180 L 190 120 L 215 160 L 250 100 L 285 160 L 310 120 L 335 180 C 310 150, 190 150, 165 180 Z" fill="${hair}" stroke="#0f172a" stroke-width="5" stroke-linejoin="round" />
    `;
  } else if (style === 1) {
    // Flowing bangs
    return `
      <path d="M 170 170 Q 210 200 240 180 Q 280 210 330 170 C 310 120, 190 120, 170 170 Z" fill="${hair}" stroke="#0f172a" stroke-width="5" />
    `;
  } else if (style === 2) {
    // Short cropped
    return `
      <path d="M 170 170 C 180 125, 320 125, 330 170 Q 250 155, 170 170 Z" fill="${hair}" stroke="#0f172a" stroke-width="5" />
    `;
  }
  // Side parted
  return `
    <path d="M 168 180 Q 220 130 290 160 Q 320 180 332 170 C 320 110, 180 110, 168 180 Z" fill="${hair}" stroke="#0f172a" stroke-width="5" />
  `;
}

function renderHeadgear(hatType: string, trim: string, glow: string, accent: string): string {
  switch (hatType) {
    case 'wizard_hood':
      return `
        <!-- Wizard Arcane Hood -->
        <path d="M 140 230 C 140 100, 200 50, 250 40 C 300 50, 360 100, 360 230 C 330 160, 170 160, 140 230 Z" fill="${trim}" stroke="#0f172a" stroke-width="6" opacity="0.9" />
        <circle cx="250" cy="115" r="8" fill="${glow}" stroke="#fff" stroke-width="2" />
      `;
    case 'thief_cowl':
      return `
        <!-- Thief Shadow Mask & Cowl -->
        <path d="M 160 215 C 160 100, 340 100, 340 215 C 320 165, 180 165, 160 215 Z" fill="#0f172a" stroke="${accent}" stroke-width="3" opacity="0.95" />
        <path d="M 185 240 L 250 270 L 315 240 L 305 285 L 250 300 L 195 285 Z" fill="#0f172a" stroke="${accent}" stroke-width="2" />
      `;
    case 'war_helm':
      return `
        <!-- Spiked Heavy War Helm -->
        <path d="M 170 160 C 180 90, 320 90, 330 160 L 335 180 L 165 180 Z" fill="${trim}" stroke="#0f172a" stroke-width="5" />
        <path d="M 240 70 L 250 40 L 260 70 Z" fill="${accent}" stroke="#0f172a" stroke-width="3" />
        <path d="M 235 150 L 250 170 L 265 150 Z" fill="${accent}" />
      `;
    case 'halo_circlet':
      return `
        <!-- Radiant Sun Halo & Circlet -->
        <ellipse cx="250" cy="110" rx="90" ry="24" fill="none" stroke="${glow}" stroke-width="6" opacity="0.8" />
        <ellipse cx="250" cy="110" rx="90" ry="24" fill="none" stroke="#fff" stroke-width="2" />
        <path d="M 175 160 Q 250 145 325 160 L 320 170 Q 250 155 180 170 Z" fill="${trim}" stroke="#0f172a" stroke-width="3" />
        <polygon points="250,135 258,150 242,150" fill="${accent}" stroke="#fff" stroke-width="1.5" />
      `;
    case 'ranger_feather':
      return `
        <!-- Feathered Archer Hat -->
        <path d="M 155 170 C 180 110, 320 110, 345 170 Q 250 140, 155 170 Z" fill="#14532d" stroke="#0f172a" stroke-width="4.5" />
        <!-- Falcon Feather -->
        <path d="M 170 160 C 140 100, 110 70, 120 50 C 135 70, 160 110, 175 150 Z" fill="${accent}" stroke="#0f172a" stroke-width="3" />
      `;
    case 'radiant_mitre':
      return `
        <polygon points="250,60 290,140 210,140" fill="${trim}" stroke="#0f172a" stroke-width="5" />
        <circle cx="250" cy="105" r="9" fill="${glow}" stroke="#fff" stroke-width="2" />
      `;
    case 'antlers':
      return `
        <!-- Forest Antlers -->
        <path d="M 190 140 C 160 100, 140 70, 120 70 C 130 90, 150 110, 180 150 M 150 95 C 130 90, 120 90, 110 80" stroke="${trim}" stroke-width="6" stroke-linecap="round" fill="none" />
        <path d="M 310 140 C 340 100, 360 70, 380 70 C 370 90, 350 110, 320 150 M 350 95 C 370 90, 380 90, 390 80" stroke="${trim}" stroke-width="6" stroke-linecap="round" fill="none" />
      `;
    case 'horns':
      return `
        <!-- Demon/Tiefling Horns -->
        <path d="M 185 150 C 150 110, 140 70, 165 45 C 175 75, 190 115, 205 145 Z" fill="${trim}" stroke="#0f172a" stroke-width="5" />
        <path d="M 315 150 C 350 110, 360 70, 335 45 C 325 75, 310 115, 295 145 Z" fill="${trim}" stroke="#0f172a" stroke-width="5" />
      `;
    case 'beret':
      return `
        <!-- Bard Cavalier Beret -->
        <path d="M 150 160 C 160 90, 310 80, 345 130 C 320 160, 190 165, 150 160 Z" fill="#9d174d" stroke="#0f172a" stroke-width="5" />
        <circle cx="340" cy="120" r="14" fill="${glow}" />
      `;
    case 'headband':
      return `
        <!-- Martial Headband -->
        <path d="M 170 170 Q 250 160 330 170 L 328 185 Q 250 175 172 185 Z" fill="${accent}" stroke="#0f172a" stroke-width="4" />
        <circle cx="250" cy="172" r="6" fill="#fff" stroke="#0f172a" stroke-width="2" />
      `;
    default:
      return '';
  }
}

function renderMark(matchedKey: string, glow: string): string {
  if (matchedKey === 'mage' || matchedKey === 'warlock') {
    return `<circle cx="250" cy="175" r="4" fill="${glow}" />`;
  } else if (matchedKey === 'warrior') {
    // Battle scar across left cheek
    return `<path d="M 210 220 L 225 245" stroke="#991b1b" stroke-width="3" stroke-linecap="round" />`;
  }
  return '';
}

function renderClassMotif(cls: string, accent: string, glow: string, hash: number): string {
  switch (cls) {
    case 'mage':
      return `
        <circle cx="100" cy="130" r="8" fill="${glow}" opacity="0.8" />
        <circle cx="400" cy="140" r="12" fill="${accent}" opacity="0.6" />
        <polygon points="120,300 126,316 110,308" fill="${glow}" opacity="0.7" />
        <polygon points="380,280 395,290 385,305" fill="${accent}" opacity="0.7" />
      `;
    case 'rogue':
      return `
        <!-- Shadow Blades in background -->
        <path d="M 80 120 L 120 180" stroke="${accent}" stroke-width="4" opacity="0.4" stroke-linecap="round" />
        <path d="M 420 120 L 380 180" stroke="${accent}" stroke-width="4" opacity="0.4" stroke-linecap="round" />
      `;
    case 'warrior':
      return `
        <!-- Flaming sparks -->
        <circle cx="90" cy="200" r="4" fill="${accent}" />
        <circle cx="410" cy="180" r="6" fill="${glow}" />
        <circle cx="110" cy="140" r="3" fill="#fde047" />
        <circle cx="390" cy="120" r="4" fill="#fde047" />
      `;
    case 'paladin':
      return `
        <!-- Sunburst Rays -->
        <line x1="250" y1="20" x2="250" y2="70" stroke="${accent}" stroke-width="3" opacity="0.5" />
        <line x1="160" y1="40" x2="190" y2="80" stroke="${accent}" stroke-width="3" opacity="0.5" />
        <line x1="340" y1="40" x2="310" y2="80" stroke="${accent}" stroke-width="3" opacity="0.5" />
      `;
    default:
      return `<circle cx="250" cy="240" r="230" fill="none" stroke="${accent}" stroke-width="1" opacity="0.2" />`;
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
