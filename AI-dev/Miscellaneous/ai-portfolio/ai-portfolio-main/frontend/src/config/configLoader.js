// Cache for the loaded configuration
let configCache = null;
// Flag to track if we've started loading the config
let isLoading = false;
// Promise that resolves when the config is loaded
let configLoadingPromise = null;

/**
 * Load the configuration from the config.json file
 * @returns {Promise<Object>} The configuration object
 * @throws {Error} If the config.json file is not found or cannot be loaded
 */
export const loadConfig = async () => {
  if (configCache) {
    return configCache;
  }

  if (isLoading && configLoadingPromise) {
    return configLoadingPromise;
  }

  isLoading = true;
  configLoadingPromise = new Promise(async (resolve, reject) => {
    try {
      const response = await fetch('/config.json');    
      const config = await response.json();
      configCache = config;
      resolve(config);
    } catch (error) {
      reject(new Error('Failed to load configuration. The application requires a valid config.json file in the public directory.'));
    } finally {
      isLoading = false;
    }
  });

  return configLoadingPromise;
};

// Start loading the config immediately when this module is imported
loadConfig()

/**
 * Get a configuration value
 * @param {string} section - The section of the configuration (e.g., 'personal', 'social')
 * @param {string} key - The specific key within the section
 * @param {*} defaultValue - Default value if the key is not found
 * @returns {*} The configuration value or default if not found
 * @throws {Error} If the configuration is not loaded
 */
export const getConfig = (section, key, defaultValue) => {
  // If config is not loaded yet, throw an error
  if (!configCache) {
    throw new Error('Configuration not loaded. The application requires a valid config.json file in the public directory.');
  }

  if (!section) return configCache;
  if (!key) return configCache[section] || defaultValue;
  return configCache[section]?.[key] || defaultValue;
};

export const getPersonalInfo = () => getConfig('personal');

export const getSocialLinks = () => getConfig('social');

export const getChatConfig = () => getConfig('chat');

export const getContentConfig = () => getConfig('content');