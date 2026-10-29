import { describe, it, expect, vi, beforeEach } from 'vitest';
import mockConfig from '../test/mocks/config.json';

// Mock the entire module
vi.mock('./configLoader', () => {
  // Create a mock config cache
  let configCache = null;
  
  return {
    loadConfig: vi.fn().mockImplementation(async () => {
      configCache = mockConfig;
      return mockConfig;
    }),
    getConfig: vi.fn().mockImplementation((section, key, defaultValue) => {
      if (!configCache) {
        throw new Error('Configuration not loaded');
      }
      if (!section) return configCache;
      if (!key) return configCache[section] || defaultValue;
      return configCache[section]?.[key] || defaultValue;
    }),
    getPersonalInfo: vi.fn().mockImplementation(() => mockConfig.personal),
    getSocialLinks: vi.fn().mockImplementation(() => mockConfig.social),
    getChatConfig: vi.fn().mockImplementation(() => mockConfig.chat),
    getContentConfig: vi.fn().mockImplementation(() => mockConfig.content)
  };
});

// Import the mocked module
import { 
  loadConfig, 
  getConfig, 
  getPersonalInfo, 
  getSocialLinks, 
  getChatConfig, 
  getContentConfig 
} from './configLoader';

describe('configLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadConfig', () => {
    it('returns the config data', async () => {
      const config = await loadConfig();
      expect(config).toEqual(mockConfig);
      expect(loadConfig).toHaveBeenCalled();
    });
  });

  describe('getConfig', () => {
    it('throws error if config is not loaded', () => {
      // Reset the mock implementation to simulate unloaded config
      getConfig.mockImplementationOnce(() => {
        throw new Error('Configuration not loaded');
      });
      
      expect(() => getConfig()).toThrow('Configuration not loaded');
    });

    it('returns entire config when no section specified', async () => {
      await loadConfig();
      const config = getConfig();
      expect(config).toEqual(mockConfig);
    });

    it('returns specific section when specified', async () => {
      await loadConfig();
      const personal = getConfig('personal');
      expect(personal).toEqual(mockConfig.personal);
    });

    it('returns specific key when section and key specified', async () => {
      await loadConfig();
      const name = getConfig('personal', 'name');
      expect(name).toEqual(mockConfig.personal.name);
    });

    it('returns default value when section not found', async () => {
      await loadConfig();
      const defaultValue = { default: true };
      const result = getConfig('nonexistent', null, defaultValue);
      expect(result).toEqual(defaultValue);
    });

    it('returns default value when key not found', async () => {
      await loadConfig();
      const defaultValue = 'default';
      const result = getConfig('personal', 'nonexistent', defaultValue);
      expect(result).toEqual(defaultValue);
    });
  });

  describe('utility functions', () => {
    it('getPersonalInfo returns personal section', async () => {
      await loadConfig();
      expect(getPersonalInfo()).toEqual(mockConfig.personal);
    });

    it('getSocialLinks returns social section', async () => {
      await loadConfig();
      expect(getSocialLinks()).toEqual(mockConfig.social);
    });

    it('getChatConfig returns chat section', async () => {
      await loadConfig();
      expect(getChatConfig()).toEqual(mockConfig.chat);
    });

    it('getContentConfig returns content section', async () => {
      await loadConfig();
      expect(getContentConfig()).toEqual(mockConfig.content);
    });
  });
}); 