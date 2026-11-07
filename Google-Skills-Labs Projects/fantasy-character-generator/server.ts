import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { generateCartoonPortrait } from './server/cartoonPortrait.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Initialize server-side Gemini client with recommended telemetry header
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // API endpoint for generating fantasy character
  app.post('/api/generate-character', async (req, res) => {
    const { classPreference, tone } = req.body || {};

    try {
      if (!process.env.GEMINI_API_KEY) {
        // Return structured fallback if API key is not yet set in environment
        console.warn('GEMINI_API_KEY not configured, using crafted fantasy archetype generator');
        const fallback = generateCraftedFallback(classPreference);
        return res.json({
          success: true,
          character: fallback,
          isFallback: true,
          message: 'Generated with fantasy archetype system (API key not configured in environment).',
        });
      }

      const prompt = `Generate an authentic, highly unique, and memorable fantasy character for an RPG or tabletop adventure.
${classPreference && classPreference !== 'Random' ? `Desired Class/Role: ${classPreference}` : 'Pick an evocative fantasy class such as Mage, Rogue, Warrior, Paladin, Ranger, Cleric, Druid, Warlock, Bard, Monk, Necromancer, or Artificer.'}
${tone ? `Character tone/flavor: ${tone}` : ''}
Ensure the character has a distinctive, original Name, a clear Class, an evocative title, race, weapon, signature ability, stats (10-20), and 2-sentence rich backstory. Avoid clichés like generic tavern brawlers.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an expert fantasy worldbuilder and RPG character designer. Create vivid, unique, and compelling characters with distinct fantasy names and iconic classes.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: 'Unique and evocative fantasy character name (e.g. Kaelen Duskstride, Aurelia Solvane, Thorgar Thunderbrow)',
              },
              class: {
                type: Type.STRING,
                description: 'The primary fantasy class (e.g. Mage, Rogue, Warrior, Paladin, Ranger, Cleric, Druid, Warlock, Bard, Monk)',
              },
              title: {
                type: Type.STRING,
                description: 'An evocative honorific or moniker (e.g. The Moonlit Fang, Keeper of the Hearthfire)',
              },
              race: {
                type: Type.STRING,
                description: 'Fantasy race or heritage (e.g. High Elf, Mountain Dwarf, Tiefling, Human, Dragonborn, Half-Orc)',
              },
              lore: {
                type: Type.STRING,
                description: 'A 1-2 sentence compelling summary of their background, personality, or oath.',
              },
              primaryWeapon: {
                type: Type.STRING,
                description: 'Their signature weapon, arcane focus, or relic.',
              },
              signatureAbility: {
                type: Type.STRING,
                description: 'A standout spell, technique, or battle stance.',
              },
              alignment: {
                type: Type.STRING,
                description: 'Classic moral alignment (e.g. Chaotic Good, Lawful Neutral, Neutral Good)',
              },
              stats: {
                type: Type.OBJECT,
                properties: {
                  might: { type: Type.INTEGER, description: 'Strength rating between 10 and 20' },
                  agility: { type: Type.INTEGER, description: 'Speed rating between 10 and 20' },
                  intellect: { type: Type.INTEGER, description: 'Intelligence rating between 10 and 20' },
                  resilience: { type: Type.INTEGER, description: 'Constitution rating between 10 and 20' },
                },
                required: ['might', 'agility', 'intellect', 'resilience'],
              },
            },
            required: ['name', 'class', 'title', 'race', 'lore', 'primaryWeapon', 'signatureAbility', 'alignment', 'stats'],
          },
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error('Received empty response from Gemini model');
      }

      const characterData = JSON.parse(text);
      return res.json({
        success: true,
        character: characterData,
        isFallback: false,
      });
    } catch (err: any) {
      console.error('Error generating character via Gemini:', err);
      // Fallback gracefully so user gets a character even if API errors
      const fallback = generateCraftedFallback(classPreference);
      return res.json({
        success: true,
        character: fallback,
        isFallback: true,
        error: err.message || 'Gemini API call failed, generated using backup character matrix',
      });
    }
  });

  // API endpoint for generating character portrait
  app.post('/api/generate-portrait', async (req, res) => {
    const { name, characterClass, race, seed } = req.body || {};

    if (!name || !characterClass) {
      return res.status(400).json({
        success: false,
        error: 'Character Name and Class are required to generate a portrait',
      });
    }

    // Try Gemini image model if API key is present
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `A vibrant cartoon and video game style portrait avatar of a fantasy ${characterClass} character named "${name}"${race ? ` of ${race} heritage` : ''}. Stylized character head and shoulders portrait, bold outlines, expressive anime/game art style, rich lighting, fantasy RPG game avatar icon.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [{ text: prompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: '1:1',
            },
          },
        });

        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            return res.json({
              success: true,
              imageUrl: `data:${mime};base64,${part.inlineData.data}`,
              source: 'gemini',
            });
          }
        }
      } catch (geminiErr: any) {
        console.warn('Gemini image generation attempt failed, generating cartoon vector portrait:', geminiErr?.message || geminiErr);
      }
    }

    // Procedural cartoon video game portrait generator
    const svgDataUrl = generateCartoonPortrait({
      name,
      characterClass,
      race: race || '',
      seed: seed !== undefined ? seed : Date.now(),
    });

    return res.json({
      success: true,
      imageUrl: svgDataUrl,
      source: 'procedural-cartoon',
    });
  });

  // API endpoint for generating character origin backstory
  app.post('/api/generate-backstory', async (req, res) => {
    const { name, characterClass, race, title } = req.body || {};

    if (!name || !characterClass) {
      return res.status(400).json({
        success: false,
        error: 'Character Name and Class are required to generate a backstory',
      });
    }

    try {
      if (!process.env.GEMINI_API_KEY) {
        const fallbackStory = generateFallbackBackstory(name, characterClass, race);
        return res.json({
          success: true,
          backstory: fallbackStory,
          isAiGenerated: false,
        });
      }

      const prompt = `Write a unique and evocative one-to-two-sentence origin story for a fantasy ${characterClass} named "${name}"${title ? ` known as "${title}"` : ''}${race ? ` of ${race} lineage` : ''}.
Make it exactly 1 to 2 sentences long, vivid, atmospheric, and authentic to high fantasy lore. Explain their humble or mysterious beginning and the personal catalyst that set them on their path.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an expert fantasy worldbuilder. Write concise, compelling, high-quality one-to-two-sentence origin stories for fantasy characters based on their name, class, and archetype.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              backstory: {
                type: Type.STRING,
                description: 'A unique, atmospheric 1-to-2 sentence origin story for the character.',
              },
            },
            required: ['backstory'],
          },
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error('No content returned from Gemini');
      }

      const parsed = JSON.parse(text);
      return res.json({
        success: true,
        backstory: parsed.backstory || generateFallbackBackstory(name, characterClass, race),
        isAiGenerated: true,
      });
    } catch (err: any) {
      console.warn('Gemini backstory generation failed, using fallback:', err?.message || err);
      const fallbackStory = generateFallbackBackstory(name, characterClass, race);
      return res.json({
        success: true,
        backstory: fallbackStory,
        isAiGenerated: false,
      });
    }
  });

  // Development: Mount Vite middlewares for HMR and module transforms
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built static files
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

// Rich fallback generator in case of network, quota, or missing key events
function generateCraftedFallback(classPreference?: string) {
  const classes = ['Mage', 'Rogue', 'Warrior', 'Paladin', 'Ranger', 'Cleric', 'Druid', 'Warlock', 'Bard', 'Monk'];
  const firstNames = ['Valerius', 'Kaelen', 'Lyra', 'Sylvia', 'Drakon', 'Eldrin', 'Morrigan', 'Boran', 'Zephyr', 'Aurelia', 'Finnegan', 'Rowan', 'Thalor', 'Seraphina'];
  const lastNames = ['Shadowstride', 'Ironfist', 'Dawnseeker', 'Stormcaller', 'Nightshade', 'Silverbranch', 'Frostvein', 'Emberfang', 'Spellweaver', 'Oakenshield'];
  const races = ['Moon Elf', 'Mountain Dwarf', 'Human', 'Tiefling', 'Dragonborn', 'Half-Elf', 'Goliath', 'Sylph'];
  const alignments = ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral', 'Chaotic Neutral'];

  const matchedClass = classPreference && classPreference !== 'Random' 
    ? classes.find((c) => c.toLowerCase() === classPreference.toLowerCase()) || classPreference
    : classes[Math.floor(Math.random() * classes.length)];
  const selectedClass = matchedClass;
  const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  const race = races[Math.floor(Math.random() * races.length)];
  const alignment = alignments[Math.floor(Math.random() * alignments.length)];

  const classDetails: Record<string, { title: string; weapon: string; ability: string; lore: string }> = {
    Mage: {
      title: 'The Arcane Prism',
      weapon: 'Stave of Whispering Constellations',
      ability: 'Prismatic Nova',
      lore: 'Scholarly wanderer who unlocked celestial runes in the forgotten library of Aethelgard.',
    },
    Rogue: {
      title: 'The Velvet Shadow',
      weapon: 'Twin Moon-Forged Daggers',
      ability: 'Ghoststep Mirage',
      lore: 'An acrobatic infiltrator who dances between moonlight and darkness without leaving a whisper behind.',
    },
    Warrior: {
      title: 'The Unyielding Bulwark',
      weapon: 'Dragonbone Greatsword',
      ability: 'Seismic Cleave',
      lore: 'A veteran champion forged in the Northern Crusades, whose blade bears the crest of fallen comrades.',
    },
    Paladin: {
      title: 'Shield of the Golden Dawn',
      weapon: 'Sun-Forged Warhammer & Aegis',
      ability: 'Radiant Smite of Retribution',
      lore: 'Sworn by ancient sacred vows to purge malevolent shadow and safeguard the defenseless.',
    },
    Ranger: {
      title: 'Warden of the Sylvan Canopy',
      weapon: 'Yew Longbow & Hawk-Feather Arrows',
      ability: 'Tempest Volley',
      lore: 'Tracks beasts and fiends across untamed frontiers with an untamed bond to wild beasts.',
    },
    Cleric: {
      title: 'Herald of the Sacred Beacon',
      weapon: 'Sanctified Morningstar',
      ability: 'Divine Restoration Halo',
      lore: 'Channels the celestial light of benevolent deities to mend mortal wounds and banish dark corruption.',
    },
    Druid: {
      title: 'Voice of the Ancient Grove',
      weapon: 'Living Briar Staff',
      ability: 'Wrath of the Earthbound',
      lore: 'Commands wild elements and shifts into primordial predators to defend pristine ancient forests.',
    },
    Warlock: {
      title: 'Binder of the Nether Core',
      weapon: 'Eldritch Void Focus',
      ability: 'Abyssal Singularity',
      lore: 'Bound by a pact with an enigmatic entity beyond the stars in exchange for eldritch mastery.',
    },
    Bard: {
      title: 'Maestro of the Silver String',
      weapon: 'Enchanted Lute & Rapier',
      ability: 'Crescendo of Discord',
      lore: 'Weaves legendary epics that twist fate itself, mesmerizing entire royal courts with harmonious magic.',
    },
    Monk: {
      title: 'The Flowing Tempest',
      weapon: 'Ironwood Quarterstaff',
      ability: 'Seven-Fold Palm Strike',
      lore: 'Harnessed inner spiritual energy through decades of ascetic discipline upon the cloud peaks.',
    },
  };

  const details = classDetails[selectedClass] || classDetails['Warrior'];

  return {
    name,
    class: selectedClass,
    title: details.title,
    race,
    lore: details.lore,
    primaryWeapon: details.weapon,
    signatureAbility: details.ability,
    alignment,
    stats: {
      might: 12 + Math.floor(Math.random() * 8),
      agility: 12 + Math.floor(Math.random() * 8),
      intellect: 12 + Math.floor(Math.random() * 8),
      resilience: 12 + Math.floor(Math.random() * 8),
    },
  };
}

function generateFallbackBackstory(name: string, characterClass: string, race?: string): string {
  const cls = (characterClass || 'Warrior').toLowerCase();
  const heritage = race ? ` of ${race} blood` : '';

  if (cls.includes('mage')) {
    return `Raised within the dusty archives of the Sunken Spire, ${name}${heritage} inadvertently unlocked a forbidden constellation rune that bound celestial mana to their mortal soul. Now exiled from the academy, they travel perilous frontiers seeking the fallen star-shards needed to master their volatile arcane gift.`;
  }
  if (cls.includes('rogue')) {
    return `Orphaned in the shadowed alleys of the lower harbor, ${name}${heritage} learned to survive by picking locks and outrunning guild enforcers before stealing an enchanted dagger from a corrupt baron's vault. With a bounty on their head across three kingdoms, they navigate the underworld selling their lethal cunning to the boldest bidder.`;
  }
  if (cls.includes('paladin')) {
    return `Consecrated at the sacred altar of the Dawn Citadel after surviving a demonic siege, ${name}${heritage} witnessed a blinding vision of the Golden Sun that burned holy purpose into their spirit. Bound by solemn oaths to purge malevolent shadow, they ride across fractured realms safeguarding the helpless and dispensing righteous justice.`;
  }
  if (cls.includes('ranger')) {
    return `Raised by wild sylvan guardians after wildfire swept their ancestral frontier settlement, ${name}${heritage} grew to speak the secret whispers of the forest canopy. Bearing a master-crafted yew bow, they now track monstrous aberrations and lead lost wanderers through untamed borderlands.`;
  }
  if (cls.includes('cleric')) {
    return `Chosen as an humble acolyte when a miraculous healing spring erupted beneath their touch, ${name}${heritage} dedicated their mortal breath to the benevolent deities of restoration. Carrying a sanctified morningstar and holy relic, they walk plague-touched provinces banishing corruption and bringing light to the forgotten.`;
  }
  if (cls.includes('druid')) {
    return `Deep in the primeval heart of the Ironwood, ${name}${heritage} drank from the Primordial Spring and bound their heartbeat to the pulse of the ancient earth. When reckless lumber barons desecrated the sacred grove, they took up a living briar staff to drive despoilers from the wilderness.`;
  }
  if (cls.includes('warlock')) {
    return `Desperate to save their dying kin, ${name}${heritage} spoke the forgotten incantation at a crossroad and sealed a binding pact with an enigmatic entity beyond the stars. Gifted with crackling eldritch power at the cost of restless dreams, they now walk between light and darkness on a dangerous quest of their own making.`;
  }
  if (cls.includes('bard')) {
    return `Cast out of the royal conservatory for weaving subversive magic into courtly serenades, ${name}${heritage} took to the cobblestone highways with an enchanted lute and quick-witted rapier. They now roam tavern hearths and noble halls alike, manipulating destiny through song while seeking legends worthy of immortality.`;
  }
  if (cls.includes('monk')) {
    return `Having spent two decades in silent meditation upon the wind-scoured peaks of Mount Shen, ${name}${heritage} mastered the internal flow of spiritual ki until their bare strikes struck like thunder. Descending from the monastery gates, they now walk the mortal plane to bring balance to a world fractured by greed and war.`;
  }
  // Default Warrior
  return `Forged in the merciless northern crusades, ${name}${heritage} earned their renown when they single-handedly held a narrow mountain pass against a legion of war trolls. Bearing the scarred blade of their fallen commander, they now wander the realm seeking battles worthy of their unyielding spirit.`;
}


startServer();
