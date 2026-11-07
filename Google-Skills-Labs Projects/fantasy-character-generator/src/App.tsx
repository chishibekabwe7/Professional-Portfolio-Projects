import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Shield,
  Sword,
  Wand2,
  Crosshair,
  Feather,
  Flame,
  Heart,
  Copy,
  Check,
  RefreshCw,
  Scroll,
  Crown,
  Zap,
  Dice5,
  Image as ImageIcon,
  UserRound,
  FlaskConical,
  ScrollText,
  BookmarkPlus,
  Trash2,
  Layers,
  Droplets,
  ExternalLink,
} from 'lucide-react';
import { Character, CardStats, DeckCard } from './types';

// Visual themes for classes with warm alchemical and heraldic brass/emerald tones
interface ClassTheme {
  icon: typeof Shield;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  glow: string;
  rune: string;
  description: string;
}

const CLASS_THEMES: Record<string, ClassTheme> = {
  mage: {
    icon: Wand2,
    color: 'text-violet-300',
    badgeBg: 'bg-[#221338]/90',
    badgeBorder: 'border-[#c084fc]/50',
    glow: 'shadow-violet-900/30',
    rune: '🜂',
    description: 'Weaver of arcane quintessence and cosmic ether',
  },
  rogue: {
    icon: Feather,
    color: 'text-emerald-300',
    badgeBg: 'bg-[#0b291d]/90',
    badgeBorder: 'border-[#34d399]/50',
    glow: 'shadow-emerald-950/40',
    rune: '🜄',
    description: 'Shadow operative versed in quiet venom and sleight of hand',
  },
  warrior: {
    icon: Sword,
    color: 'text-amber-200',
    badgeBg: 'bg-[#2e1509]/90',
    badgeBorder: 'border-[#f59e0b]/50',
    glow: 'shadow-amber-950/40',
    rune: '🜁',
    description: 'Tempered in molten crucibles and relentless vanguard steel',
  },
  paladin: {
    icon: Shield,
    color: 'text-amber-300',
    badgeBg: 'bg-[#291b08]/90',
    badgeBorder: 'border-[#fde047]/60',
    glow: 'shadow-yellow-900/40',
    rune: '🜃',
    description: 'Radiant knight consecrated in sacred solar fires',
  },
  ranger: {
    icon: Crosshair,
    color: 'text-teal-300',
    badgeBg: 'bg-[#082821]/90',
    badgeBorder: 'border-[#2dd4bf]/50',
    glow: 'shadow-teal-950/40',
    rune: '☿',
    description: 'Sylvan tracker adept in herbalist tinctures and silent bows',
  },
  cleric: {
    icon: Heart,
    color: 'text-sky-300',
    badgeBg: 'bg-[#0e2133]/90',
    badgeBorder: 'border-[#7dd3fc]/50',
    glow: 'shadow-sky-950/40',
    rune: '🜚',
    description: 'Healer transmuting divine elixirs to preserve life and spirit',
  },
  druid: {
    icon: Zap,
    color: 'text-emerald-400',
    badgeBg: 'bg-[#15290b]/90',
    badgeBorder: 'border-[#a3e635]/50',
    glow: 'shadow-lime-950/40',
    rune: '🝘',
    description: 'Primal alchemist communion with the ancient earth and flora',
  },
  warlock: {
    icon: Flame,
    color: 'text-purple-300',
    badgeBg: 'bg-[#290d2f]/90',
    badgeBorder: 'border-[#e879f9]/50',
    glow: 'shadow-purple-950/40',
    rune: '🝪',
    description: 'Nether binder commanding abyssal brimstone and forbidden pacts',
  },
  bard: {
    icon: Sparkles,
    color: 'text-rose-300',
    badgeBg: 'bg-[#2e0e22]/90',
    badgeBorder: 'border-[#f472b6]/50',
    glow: 'shadow-pink-950/40',
    rune: '🝤',
    description: 'Orator vibrating the harmonic frequencies of transmutation',
  },
  monk: {
    icon: Zap,
    color: 'text-amber-200',
    badgeBg: 'bg-[#26170a]/90',
    badgeBorder: 'border-[#fbbf24]/50',
    glow: 'shadow-amber-950/40',
    rune: '🝰',
    description: 'Ascetic channeling internal bio-alchemical ki',
  },
};

function getClassTheme(className: string): ClassTheme {
  const normalized = (className || '').toLowerCase().trim();
  for (const [key, theme] of Object.entries(CLASS_THEMES)) {
    if (normalized.includes(key)) {
      return theme;
    }
  }
  return {
    icon: Crown,
    color: 'text-amber-300',
    badgeBg: 'bg-[#24170e]/90',
    badgeBorder: 'border-[#ca8a04]/50',
    glow: 'shadow-amber-950/40',
    rune: '✦',
    description: 'Renowned champion of the realm',
  };
}

// Generate unique random Health, Mana, and Strength stats for each character
function generateRandomStats(clsName?: string): CardStats {
  const cls = (clsName || '').toLowerCase();
  let baseHp = 70 + Math.floor(Math.random() * 50); // 70-120
  let baseMp = 35 + Math.floor(Math.random() * 55); // 35-90
  let baseStr = 45 + Math.floor(Math.random() * 50); // 45-95

  if (cls.includes('mage') || cls.includes('warlock')) {
    baseMp += 30;
    baseHp -= 10;
    baseStr -= 15;
  } else if (cls.includes('warrior') || cls.includes('paladin')) {
    baseHp += 25;
    baseStr += 25;
    baseMp -= 20;
  } else if (cls.includes('rogue') || cls.includes('ranger')) {
    baseStr += 20;
    baseHp += 10;
  } else if (cls.includes('cleric') || cls.includes('druid')) {
    baseMp += 20;
    baseHp += 15;
  }

  return {
    health: Math.max(35, baseHp),
    mana: Math.max(25, baseMp),
    strength: Math.max(30, baseStr),
  };
}

export default function App() {
  const [character, setCharacter] = useState<Character | null>(null);
  const [cardStats, setCardStats] = useState<CardStats>({ health: 100, mana: 75, strength: 80 });
  const [history, setHistory] = useState<Character[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [classFilter, setClassFilter] = useState<string>('Random');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAiPowered, setIsAiPowered] = useState<boolean | null>(null);

  // Character Portrait State
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
  const [portraitLoading, setPortraitLoading] = useState<boolean>(false);
  const [portraitError, setPortraitError] = useState<string | null>(null);

  // Character Backstory State
  const [backstory, setBackstory] = useState<string | null>(null);
  const [backstoryLoading, setBackstoryLoading] = useState<boolean>(false);
  const [backstoryError, setBackstoryError] = useState<string | null>(null);

  // My Deck State (stored in memory & preserved while open)
  const [deck, setDeck] = useState<DeckCard[]>(() => {
    try {
      const saved = localStorage.getItem('alchemist_hero_deck');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const filterOptions = ['Random', 'Mage', 'Rogue', 'Warrior', 'Paladin', 'Ranger', 'Cleric'];

  // Generate a brand new character (generating new stats, CLEARING old portrait and backstory)
  const handleGenerate = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSaveFeedback(null);
    // Clear old portrait whenever a new character is generated
    setPortraitUrl(null);
    setPortraitError(null);
    // Clear previous backstory whenever a new character is generated
    setBackstory(null);
    setBackstoryLoading(false);
    setBackstoryError(null);

    try {
      const response = await fetch('/api/generate-character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classPreference: classFilter === 'Random' ? undefined : classFilter,
        }),
      });

      const data = await response.json();

      if (data.success && data.character) {
        setCharacter(data.character);
        // Generate new random stats (Health, Mana, Strength) each time a new character is generated
        const newStats = generateRandomStats(data.character.class);
        setCardStats(newStats);
        setIsAiPowered(!data.isFallback);
        // Add to history without duplicates
        setHistory((prev) => [data.character, ...prev.filter((c) => c.name !== data.character.name)].slice(0, 8));
      } else {
        throw new Error(data.error || 'Failed to transfigure character');
      }
    } catch (err: any) {
      console.error('Character generation failed:', err);
      setErrorMsg(err.message || 'The transmutation circle collapsed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate or Regenerate Cartoon / Video Game Portrait for current character
  const handleGeneratePortrait = async () => {
    if (!character || portraitLoading) return;
    setPortraitLoading(true);
    setPortraitError(null);

    try {
      const seed = Date.now();
      const response = await fetch('/api/generate-portrait', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: character.name,
          characterClass: character.class,
          race: character.race,
          seed,
        }),
      });

      const data = await response.json();
      if (data.success && data.imageUrl) {
        setPortraitUrl(data.imageUrl);
      } else {
        throw new Error(data.error || 'Failed to generate portrait');
      }
    } catch (err: any) {
      console.error('Portrait generation failed:', err);
      setPortraitError(err.message || 'Unable to inscribe portrait. Please try again.');
    } finally {
      setPortraitLoading(false);
    }
  };

  // Generate Backstory for currently displayed character using Gemini API
  const handleGenerateBackstory = async () => {
    if (!character || backstoryLoading) return;
    setBackstoryLoading(true);
    setBackstoryError(null);

    try {
      const response = await fetch('/api/generate-backstory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: character.name,
          characterClass: character.class,
          race: character.race,
          title: character.title,
        }),
      });

      const data = await response.json();
      if (data.success && data.backstory) {
        setBackstory(data.backstory);
      } else {
        throw new Error(data.error || 'Failed to generate origin backstory');
      }
    } catch (err: any) {
      console.error('Backstory generation failed:', err);
      setBackstoryError(err.message || 'Unable to inscribe origin backstory. Please try again.');
    } finally {
      setBackstoryLoading(false);
    }
  };

  // Save current character card to "My Deck" (avoiding duplicates)
  const handleSaveToDeck = () => {
    if (!character) return;

    // Check for duplicates by character name
    const exists = deck.some((card) => card.name.toLowerCase() === character.name.toLowerCase());
    if (exists) {
      setSaveFeedback('Already in My Deck!');
      setTimeout(() => setSaveFeedback(null), 3500);
      return;
    }

    const newDeckCard: DeckCard = {
      id: `${character.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name: character.name,
      characterClass: character.class,
      title: character.title,
      race: character.race,
      stats: { ...cardStats },
      portraitUrl,
      backstory,
      savedAt: Date.now(),
    };

    const updatedDeck = [newDeckCard, ...deck];
    setDeck(updatedDeck);
    try {
      localStorage.setItem('alchemist_hero_deck', JSON.stringify(updatedDeck));
    } catch (e) {
      console.error(e);
    }

    setSaveFeedback('Saved to My Deck!');
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  // Load a saved card from "My Deck" into the active trading card viewer
  const handleLoadDeckCard = (savedCard: DeckCard) => {
    setCharacter({
      name: savedCard.name,
      class: savedCard.characterClass,
      title: savedCard.title,
      race: savedCard.race,
    });
    setCardStats(savedCard.stats);
    setPortraitUrl(savedCard.portraitUrl);
    setBackstory(savedCard.backstory);
    setSaveFeedback('Card Loaded from Deck');
    setTimeout(() => setSaveFeedback(null), 2500);
  };

  // Remove card from deck
  const handleRemoveFromDeck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedDeck = deck.filter((c) => c.id !== id);
    setDeck(updatedDeck);
    try {
      localStorage.setItem('alchemist_hero_deck', JSON.stringify(updatedDeck));
    } catch (e) {
      console.error(e);
    }
  };

  // Switching character from Hall of Heroes history
  const handleSelectHero = (hero: Character) => {
    setCharacter(hero);
    setCardStats(generateRandomStats(hero.class));
    setPortraitUrl(null);
    setPortraitError(null);
    setBackstory(null);
    setBackstoryLoading(false);
    setBackstoryError(null);
  };

  const copyCharacterSheet = () => {
    if (!character) return;
    const text = `=== COLLECTIBLE TRADING CARD ===
Name: ${character.name}
Class: ${character.class}
Title: ${character.title || 'N/A'}
Heritage: ${character.race || 'N/A'}
[STATS]
Health: ${cardStats.health}
Mana: ${cardStats.mana}
Strength: ${cardStats.strength}
${backstory ? `\n[BACKSTORY]\n${backstory}\n` : ''}=================================`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentTheme = character ? getClassTheme(character.class) : null;
  const ClassIcon = currentTheme ? currentTheme.icon : Crown;
  const isCurrentInDeck = character
    ? deck.some((card) => card.name.toLowerCase() === character.name.toLowerCase())
    : false;

  return (
    <div className="min-h-screen bg-alchemist-workbench text-[#f5ebd7] flex flex-col items-center justify-between px-3 sm:px-6 py-6 sm:py-10 selection:bg-amber-700/40 selection:text-amber-200">
      {/* Top Header: Alchemist's Athenaeum */}
      <header className="w-full max-w-4xl flex flex-col items-center text-center space-y-3 mb-5">
        {/* Brass Sigil Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#18110b] border border-[#b45309]/60 text-amber-300 text-xs font-cinzel font-semibold tracking-widest uppercase shadow-md glow-brass">
          <FlaskConical className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Alchemist's Trading Card Forge</span>
          <span className="text-[#10b981]">✦</span>
          <span className="text-emerald-400 text-[11px] font-sans">Gemini Arcana</span>
        </div>

        {/* Title */}
        <div className="relative">
          <h1 className="font-medieval text-3xl sm:text-5xl md:text-6xl font-bold tracking-wide bg-gradient-to-b from-[#fef08a] via-[#f59e0b] to-[#b45309] bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            Fantasy Character Generator
          </h1>
          <div className="flex items-center justify-center gap-2 mt-1 opacity-70 text-xs text-amber-400/80 font-cinzel">
            <span>🜂 Ignis</span>
            <span>•</span>
            <span>🜄 Aqua</span>
            <span>•</span>
            <span>🜁 Aer</span>
            <span>•</span>
            <span>🜃 Terra</span>
          </div>
        </div>

        <p className="text-[#c8b598] text-xs sm:text-sm md:text-base max-w-xl font-normal leading-relaxed">
          Transmute legendary heroes into collectible trading cards. Each card features authentic fantasy calligraphy, portrait art, Health, Mana, and Strength stats, and origin backstories.
        </p>

        {/* Alchemical Archetype Selector */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          <span className="text-xs text-[#a89070] mr-1 font-cinzel font-semibold">Class Filter:</span>
          {filterOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setClassFilter(opt)}
              className={`px-3 py-1 rounded-md text-xs font-cinzel font-semibold transition-all cursor-pointer ${
                classFilter === opt
                  ? 'bg-[#064e3b] text-[#6ee7b7] border border-[#10b981] shadow-md glow-emerald'
                  : 'bg-[#1a120a]/90 text-[#d4af37]/80 hover:text-[#fef08a] hover:bg-[#25190e] border border-[#523318]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </header>

      {/* Main Altar Area */}
      <main className="w-full max-w-4xl flex flex-col items-center flex-1 space-y-8">
        {/* Prominent Action Button: Generate Character */}
        <div className="flex flex-col items-center justify-center w-full">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleGenerate}
            disabled={loading}
            className={`relative group px-8 sm:px-14 py-4 sm:py-5 rounded-2xl font-cinzel text-lg sm:text-xl font-black tracking-widest uppercase transition-all duration-300 flex items-center gap-3.5 shadow-2xl cursor-pointer ${
              loading
                ? 'bg-[#451a03] text-amber-200 border-2 border-amber-600/50 cursor-wait'
                : 'bg-gradient-to-r from-[#92400e] via-[#d97706] to-[#b45309] hover:from-[#b45309] hover:via-[#f59e0b] hover:to-[#d97706] text-[#1c0f05] border-2 border-[#fef08a] glow-candle'
            }`}
          >
            {/* Corner rivets */}
            <span className="absolute top-2 left-2 rivet" />
            <span className="absolute top-2 right-2 rivet" />
            <span className="absolute bottom-2 left-2 rivet" />
            <span className="absolute bottom-2 right-2 rivet" />

            {loading ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin text-amber-200" />
                <span className="drop-shadow-sm">Transmuting Card...</span>
              </>
            ) : (
              <>
                <Dice5 className="w-6 h-6 text-[#1c0f05] transition-transform group-hover:rotate-90 duration-500" />
                <span className="drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]">
                  Generate Character
                </span>
                <Flame className="w-5 h-5 text-[#1c0f05] transition-transform group-hover:scale-125" />
              </>
            )}
            <span className="absolute inset-0 rounded-2xl bg-[#ffffff]/15 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </motion.button>

          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-rose-300 text-xs sm:text-sm bg-[#300c0a]/90 border border-rose-800/80 px-4 py-2 rounded-lg shadow-md"
            >
              {errorMsg}
            </motion.div>
          )}

          {saveFeedback && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mt-3 text-xs sm:text-sm font-cinzel font-bold px-4 py-2 rounded-xl shadow-lg border flex items-center gap-2 ${
                saveFeedback.includes('Already')
                  ? 'bg-[#3b2310] text-amber-300 border-amber-500/80'
                  : 'bg-[#064e3b] text-emerald-200 border-emerald-400 glow-emerald'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{saveFeedback}</span>
            </motion.div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* COLLECTIBLE TRADING CARD DISPLAY AREA                                     */}
        {/* ========================================================================= */}
        <div className="w-full flex justify-center">
          <AnimatePresence mode="wait">
            {!character ? (
              /* Empty Card Placeholder */
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full max-w-[460px] trading-card trading-card-border rounded-[28px] p-8 text-center flex flex-col items-center justify-center space-y-4 relative"
              >
                <div className="w-20 h-20 rounded-full bg-[#1e150e] border-2 border-[#b45309]/50 flex items-center justify-center text-amber-400 shadow-inner glow-brass">
                  <Layers className="w-10 h-10 text-amber-400/70 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-medieval text-2xl font-bold text-[#fef08a] tracking-wide">
                    Empty Card Frame
                  </h3>
                  <p className="text-[#baa386] text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
                    Click <strong className="text-amber-300 font-bold">Generate Character</strong> to inscribe a brand-new collectible trading card complete with portrait, stats, and backstory.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-3 text-[11px] text-[#988065] font-cinzel">
                  <span>✦ Collectible Card</span>
                  <span>•</span>
                  <span>✦ 3 RPG Stats</span>
                  <span>•</span>
                  <span>✦ Deck Builder</span>
                </div>
              </motion.div>
            ) : (
              /* THE BORDERED PLAYER CARD (Collectible Trading Card) */
              <motion.div
                key={character.name + character.class}
                initial={{ opacity: 0, y: 15, rotate: -0.5 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={{ opacity: 0, y: -15, rotate: 0.5 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="relative w-full max-w-[460px] trading-card trading-card-border rounded-[28px] p-4 sm:p-5 shadow-2xl flex flex-col space-y-3.5 select-none"
              >
                {/* 4 Ornate Brass Corner Clasps / Rivets */}
                <span className="absolute top-2 left-2 rivet z-20" />
                <span className="absolute top-2 right-2 rivet z-20" />
                <span className="absolute bottom-2 left-2 rivet z-20" />
                <span className="absolute bottom-2 right-2 rivet z-20" />

                {/* CARD HEADER: Character Name in Fantasy Font & Class Emblem */}
                <div className="relative bg-gradient-to-r from-[#20140c] via-[#2f1b0f] to-[#20140c] border-2 border-[#b45309] rounded-2xl px-3.5 py-2 flex items-center justify-between shadow-md">
                  <div className="flex-1 min-w-0 pr-2">
                    {/* CHARACTER NAME IN STYLIZED FANTASY FONT */}
                    <h2
                      data-testid="character-name"
                      className="font-medieval text-2xl sm:text-3xl font-black text-[#fef3c7] truncate tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                    >
                      {character.name}
                    </h2>
                    {character.title && (
                      <p className="text-[#eab308] font-cinzel text-[11px] sm:text-xs truncate italic">
                        "{character.title}"
                      </p>
                    )}
                  </div>

                  {/* CLASS MEDALLION */}
                  <div
                    data-testid="character-class"
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border ${
                      currentTheme?.badgeBorder || 'border-amber-500/60'
                    } ${currentTheme?.badgeBg || 'bg-[#22160d]'} shadow-md shrink-0`}
                  >
                    <span className="text-xs">{currentTheme?.rune || '✦'}</span>
                    <ClassIcon className={`w-4 h-4 ${currentTheme?.color || 'text-amber-400'}`} />
                    <span
                      className={`font-medieval text-sm sm:text-base font-extrabold ${
                        currentTheme?.color || 'text-[#fef08a]'
                      }`}
                    >
                      {character.class}
                    </span>
                  </div>
                </div>

                {/* CARD ART WINDOW (Portrait Frame) */}
                <div className="relative w-full aspect-square sm:aspect-[4/3] rounded-2xl border-2 border-[#854d0e] bg-[#0c0805] p-1.5 shadow-inner overflow-hidden group">
                  {/* Portrait Loading State */}
                  {portraitLoading ? (
                    <div className="w-full h-full rounded-xl bg-[#1c120a]/95 flex flex-col items-center justify-center p-4 text-center space-y-2">
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <RefreshCw className="w-10 h-10 animate-spin text-amber-400" />
                        <FlaskConical className="w-5 h-5 text-emerald-400 absolute animate-pulse" />
                      </div>
                      <span className="font-medieval text-sm font-semibold text-[#fef08a] animate-pulse">
                        Transmuting Art Window...
                      </span>
                      <span className="text-[11px] text-[#c4aa8a]">
                        Painting cartoon game portrait
                      </span>
                    </div>
                  ) : portraitUrl ? (
                    /* Inscribed Portrait */
                    <div className="relative w-full h-full rounded-xl overflow-hidden bg-[#0c0805]">
                      <img
                        src={portraitUrl}
                        alt={`${character.name} Portrait`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#18110b]/90 border border-[#b45309]/80 text-[10px] font-cinzel font-bold text-amber-300 tracking-wider uppercase">
                        Portrait Art
                      </div>
                    </div>
                  ) : (
                    /* Empty Art Window */
                    <div className="w-full h-full rounded-xl bg-gradient-to-b from-[#18110a] to-[#0f0a06] border border-dashed border-[#5c3717] flex flex-col items-center justify-center p-4 text-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-[#20150d] border border-[#b45309]/30 flex items-center justify-center text-amber-400/60 shadow-inner">
                        <UserRound className="w-6 h-6" />
                      </div>
                      <span className="text-xs text-[#baa386] font-cinzel font-semibold">
                        Card Art Uninscribed
                      </span>
                      <span className="text-[10px] text-[#8c7457]">
                        Click Generate Portrait below
                      </span>
                    </div>
                  )}

                  {/* Corner foil glints */}
                  <div className="absolute top-0 right-0 w-16 h-16 bg-radial from-amber-400/10 to-transparent pointer-events-none" />
                </div>

                {/* ART ACTION BAR: Generate Portrait / Regenerate Portrait */}
                <div className="flex items-center justify-between gap-2 px-1">
                  {!portraitUrl ? (
                    <button
                      onClick={handleGeneratePortrait}
                      disabled={portraitLoading}
                      className={`flex-1 py-1.5 px-3 rounded-xl font-cinzel text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                        portraitLoading
                          ? 'bg-[#3b1d09] text-amber-300 border border-[#b45309]/50 cursor-wait'
                          : 'bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#064e3b] hover:from-[#047857] hover:to-[#059669] text-[#ecfdf5] border border-[#34d399]/70 glow-emerald'
                      }`}
                    >
                      {portraitLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Generate Portrait</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleGeneratePortrait}
                      disabled={portraitLoading}
                      className={`flex-1 py-1.5 px-3 rounded-xl font-cinzel text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                        portraitLoading
                          ? 'bg-[#3b1d09] text-amber-300 border border-[#b45309]/50 cursor-wait'
                          : 'bg-[#22160d] hover:bg-[#2e1d11] text-[#fef08a] border border-[#b45309] hover:border-[#f59e0b]'
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${portraitLoading ? 'animate-spin' : ''}`} />
                      <span>Regenerate Portrait</span>
                    </button>
                  )}

                  {portraitError && (
                    <span className="text-[10px] text-rose-300 truncate max-w-[150px]">
                      {portraitError}
                    </span>
                  )}
                </div>

                {/* CARD TYPE / SUBTITLE RIBBON */}
                <div className="bg-[#1c120a] border border-[#5c3717] rounded-xl px-3 py-1 flex items-center justify-between text-[11px] font-cinzel text-amber-400 font-semibold shadow-xs">
                  <span className="flex items-center gap-1">
                    <Crown className="w-3 h-3 text-[#ca8a04]" />
                    <span>{character.race || 'Heroic Lineage'}</span>
                  </span>
                  <span className="text-[#8c7457]">•</span>
                  <span className="text-[#fef08a]">{character.class} Card</span>
                  <span className="text-[#8c7457]">•</span>
                  <span className="text-emerald-400">✦ Legendary</span>
                </div>

                {/* CARD TEXT BOX: Backstory & Lore */}
                <div className="bg-[#181009]/95 border-2 border-[#523318] rounded-2xl p-3 sm:p-3.5 space-y-2 shadow-inner">
                  <div className="flex items-center justify-between border-b border-[#3d2411] pb-1.5">
                    <span className="text-[11px] uppercase font-cinzel font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                      <ScrollText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Origin Backstory</span>
                    </span>

                    {/* Button to Generate / Regenerate Backstory */}
                    <button
                      onClick={handleGenerateBackstory}
                      disabled={backstoryLoading}
                      className="px-2.5 py-1 rounded-lg bg-[#b45309]/20 hover:bg-[#b45309]/40 text-amber-300 border border-[#b45309]/60 font-cinzel text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Feather className={`w-3 h-3 ${backstoryLoading ? 'animate-bounce' : ''}`} />
                      <span>{backstory ? 'Regenerate Backstory' : 'Generate Backstory'}</span>
                    </button>
                  </div>

                  {backstoryLoading ? (
                    <div className="py-2 flex items-center justify-center gap-2 text-amber-300 text-xs font-cinzel animate-pulse">
                      <FlaskConical className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                      <span>Inscribing origin story with Gemini...</span>
                    </div>
                  ) : backstory ? (
                    <p
                      data-testid="character-backstory"
                      className="text-[#fef3c7] text-xs sm:text-[13px] leading-relaxed italic font-serif"
                    >
                      "{backstory}"
                    </p>
                  ) : (
                    <p className="text-[#a89070] text-[11px] sm:text-xs italic">
                      No unique origin story inscribed yet. Click <strong className="text-amber-300 font-semibold">"Generate Backstory"</strong> to unveil {character.name}'s saga.
                    </p>
                  )}

                  {backstoryError && (
                    <p className="text-[10px] text-rose-300 font-medium">
                      {backstoryError}
                    </p>
                  )}
                </div>

                {/* ========================================================================= */}
                {/* THREE RANDOMLY GENERATED STATS: HEALTH, MANA, AND STRENGTH                */}
                {/* ========================================================================= */}
                <div className="bg-[#120c08] border-2 border-[#b45309] rounded-2xl p-2.5 sm:p-3 shadow-lg">
                  <div className="flex items-center justify-between text-[10px] uppercase font-cinzel font-bold text-[#c8b598] mb-2 px-1">
                    <span>Card Attributes</span>
                    <span className="text-[#8c7457]">Transmuted Scores</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* STAT 1: HEALTH */}
                    <div className="bg-[#1f140c] border border-red-900/60 rounded-xl p-2 text-center shadow-xs relative overflow-hidden">
                      <div className="flex items-center justify-center gap-1 text-[11px] font-cinzel font-bold text-red-400 mb-0.5">
                        <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500/20" />
                        <span>Health</span>
                      </div>
                      <div className="font-medieval text-2xl font-black text-red-200 drop-shadow-sm">
                        {cardStats.health}
                      </div>
                      <div className="w-full bg-[#0d0704] h-1.5 rounded-full mt-1 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-red-600 to-rose-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, (cardStats.health / 150) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* STAT 2: MANA */}
                    <div className="bg-[#1f140c] border border-sky-900/60 rounded-xl p-2 text-center shadow-xs relative overflow-hidden">
                      <div className="flex items-center justify-center gap-1 text-[11px] font-cinzel font-bold text-sky-400 mb-0.5">
                        <Droplets className="w-3.5 h-3.5 text-sky-400 fill-sky-400/20" />
                        <span>Mana</span>
                      </div>
                      <div className="font-medieval text-2xl font-black text-sky-200 drop-shadow-sm">
                        {cardStats.mana}
                      </div>
                      <div className="w-full bg-[#0d0704] h-1.5 rounded-full mt-1 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-sky-600 to-cyan-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, (cardStats.mana / 120) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* STAT 3: STRENGTH */}
                    <div className="bg-[#1f140c] border border-amber-900/60 rounded-xl p-2 text-center shadow-xs relative overflow-hidden">
                      <div className="flex items-center justify-center gap-1 text-[11px] font-cinzel font-bold text-amber-400 mb-0.5">
                        <Sword className="w-3.5 h-3.5 text-amber-400" />
                        <span>Strength</span>
                      </div>
                      <div className="font-medieval text-2xl font-black text-amber-200 drop-shadow-sm">
                        {cardStats.strength}
                      </div>
                      <div className="w-full bg-[#0d0704] h-1.5 rounded-full mt-1 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-600 to-yellow-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, (cardStats.strength / 130) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD FOOTER: "Save to Deck" & Utilities */}
                <div className="pt-1 flex items-center justify-between gap-2 border-t border-[#452814]/80">
                  {/* THE PROMINENT "Save to Deck" BUTTON */}
                  <button
                    onClick={handleSaveToDeck}
                    disabled={isCurrentInDeck}
                    className={`flex-1 py-2 px-3 rounded-xl font-cinzel text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                      isCurrentInDeck
                        ? 'bg-[#2b1f13] text-[#a89070] border border-[#5c3717] cursor-not-allowed opacity-80'
                        : 'bg-gradient-to-r from-[#b45309] via-[#d97706] to-[#b45309] hover:from-[#d97706] hover:to-[#f59e0b] text-[#1c0f05] border border-[#fef08a] glow-brass'
                    }`}
                  >
                    <BookmarkPlus className="w-4 h-4" />
                    <span>{isCurrentInDeck ? 'In My Deck' : 'Save to Deck'}</span>
                  </button>

                  {/* Copy Bio Button */}
                  <button
                    onClick={copyCharacterSheet}
                    className="p-2 rounded-xl bg-[#1c130b] hover:bg-[#281a10] text-[#e2ceb4] border border-[#523318] transition-colors cursor-pointer"
                    title="Copy card details"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#baa386]" />}
                  </button>

                  {/* Reroll Button */}
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="p-2 rounded-xl bg-[#2e190b] hover:bg-[#3c220f] text-[#fef08a] border border-[#b45309] transition-colors cursor-pointer"
                    title="Generate another card"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ========================================================================= */}
        {/* "MY DECK" SECTION (Displays saved characters as smaller trading cards)    */}
        {/* ========================================================================= */}
        <section className="w-full parchment-card border-2 border-[#b45309]/70 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#452814]/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#2b180a] border border-[#b45309]/50 text-amber-400 glow-brass">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medieval text-xl sm:text-2xl font-bold text-[#fef08a] tracking-wide">
                  My Deck
                </h3>
                <p className="text-[#a89070] text-xs font-cinzel">
                  {deck.length} {deck.length === 1 ? 'Hero Card' : 'Hero Cards'} in Binder
                </p>
              </div>
            </div>

            <div className="text-xs text-[#baa386] font-cinzel flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Preserved while the app is open</span>
            </div>
          </div>

          {/* Deck Cards Grid */}
          {deck.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed border-[#452814] rounded-2xl flex flex-col items-center justify-center space-y-2">
              <Scroll className="w-8 h-8 text-[#5c3717]" />
              <p className="text-[#c8b598] text-sm font-cinzel font-semibold">
                No cards in your deck yet
              </p>
              <p className="text-[#8c7457] text-xs max-w-sm">
                Generate a character and click <strong className="text-amber-300">"Save to Deck"</strong> to add it to your collectible collection.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {deck.map((card) => {
                const theme = getClassTheme(card.characterClass);
                const isViewing = character?.name.toLowerCase() === card.name.toLowerCase();

                return (
                  <div
                    key={card.id}
                    onClick={() => handleLoadDeckCard(card)}
                    className={`mini-trading-card rounded-2xl p-3.5 flex flex-col justify-between space-y-3 transition-all duration-200 cursor-pointer relative group hover:-translate-y-1 ${
                      isViewing
                        ? 'border-2 border-amber-400 shadow-xl glow-brass ring-1 ring-amber-300'
                        : 'hover:border-amber-500/80 hover:shadow-lg'
                    }`}
                  >
                    {/* Mini Card Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-[#3b2413] pb-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-medieval text-lg font-bold text-[#fef08a] truncate block">
                          {card.name}
                        </span>
                        {card.title && (
                          <span className="text-[#a89070] text-[10px] truncate block italic">
                            "{card.title}"
                          </span>
                        )}
                      </div>

                      {/* Class Badge */}
                      <span
                        className={`text-[10px] font-cinzel font-bold px-2 py-0.5 rounded-md border shrink-0 ${theme.badgeBg} ${theme.badgeBorder} ${theme.color}`}
                      >
                        {card.characterClass}
                      </span>
                    </div>

                    {/* Middle: Portrait Thumbnail & Backstory Snippet */}
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl border border-[#b45309]/60 bg-[#0d0805] overflow-hidden shrink-0 flex items-center justify-center">
                        {card.portraitUrl ? (
                          <img
                            src={card.portraitUrl}
                            alt={card.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserRound className="w-7 h-7 text-[#5c3717]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {card.backstory ? (
                          <p className="text-[#d8c7b0] text-[11px] leading-tight italic line-clamp-3">
                            "{card.backstory}"
                          </p>
                        ) : (
                          <p className="text-[#8c7457] text-[11px] italic">
                            No origin story recorded.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Mini Stat Bar: Health, Mana, Strength */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-[#3b2413]">
                      <div className="bg-[#180f08] border border-red-950/60 rounded-lg py-1 px-0.5">
                        <span className="text-[9px] uppercase font-cinzel text-red-400 block font-bold">Health</span>
                        <span className="font-medieval text-sm font-bold text-red-200">{card.stats.health}</span>
                      </div>
                      <div className="bg-[#180f08] border border-sky-950/60 rounded-lg py-1 px-0.5">
                        <span className="text-[9px] uppercase font-cinzel text-sky-400 block font-bold">Mana</span>
                        <span className="font-medieval text-sm font-bold text-sky-200">{card.stats.mana}</span>
                      </div>
                      <div className="bg-[#180f08] border border-amber-950/60 rounded-lg py-1 px-0.5">
                        <span className="text-[9px] uppercase font-cinzel text-amber-400 block font-bold">Strength</span>
                        <span className="font-medieval text-sm font-bold text-amber-200">{card.stats.strength}</span>
                      </div>
                    </div>

                    {/* Mini Card Actions: Inspect & Delete */}
                    <div className="flex items-center justify-between pt-1 text-[11px] font-cinzel text-amber-400/90">
                      <span className="flex items-center gap-1 text-[10px] text-amber-300">
                        <ExternalLink className="w-3 h-3" />
                        <span>Inspect Card</span>
                      </span>

                      <button
                        onClick={(e) => handleRemoveFromDeck(card.id, e)}
                        className="p-1 rounded-md text-red-400/70 hover:text-red-300 hover:bg-red-950/50 transition-colors cursor-pointer"
                        title="Remove from deck"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Previous Transmutations History (Hall of Heroes) */}
        {history.length > 1 && (
          <section className="w-full parchment-card border-2 border-[#523318] rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-cinzel font-bold text-[#d4af37] uppercase tracking-wider mb-3">
              <Scroll className="w-3.5 h-3.5 text-amber-400" />
              <span>Transmutation History</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {history.map((hero, idx) => {
                const isSelected = character?.name === hero.name;
                const theme = getClassTheme(hero.class);
                return (
                  <button
                    key={`${hero.name}-${idx}`}
                    onClick={() => handleSelectHero(hero)}
                    className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#2b1b10] border-[#d97706] shadow-md glow-brass'
                        : 'bg-[#17100a]/90 border-[#3d2411] hover:border-[#78461f] hover:bg-[#20150d]'
                    }`}
                  >
                    <span className="font-medieval font-bold text-[#fef08a] text-sm truncate block">
                      {hero.name}
                    </span>
                    <span
                      className={`text-[10px] font-cinzel font-bold px-1.5 py-0.5 rounded-sm border inline-block mt-1 ${theme.badgeBg} ${theme.badgeBorder} ${theme.color}`}
                    >
                      {hero.class}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl text-center text-xs text-[#8c7457] mt-8 pt-4 border-t border-[#311d0e] font-cinzel">
        <p>Fantasy Character Generator • Collectible Player Cards & Deck Builder • Powered by Gemini 3.8 Flash</p>
      </footer>
    </div>
  );
}
