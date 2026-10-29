import { createContext, useContext, useEffect, useState } from 'react';
import { loadConfig } from './configLoader';

// Create a context for the configuration
const ConfigContext = createContext(null);

/**
 * Configuration provider component
 * Loads the configuration and provides it to all child components
 */
export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configData = await loadConfig();
        setConfig(configData);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to load configuration');
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // If there's an error loading the configuration, display an error message
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
        <div className="max-w-md w-full bg-gray-800 p-6 rounded-lg shadow-lg border border-red-500">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Configuration Error</h1>
          <p className="mb-4">{error}</p>
          <p className="text-gray-400 text-sm">
            Please ensure that a valid config.json file exists in the public directory of the frontend application.
          </p>
        </div>
      </div>
    );
  }

  // If still loading, you could show a loading indicator
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Provide the configuration to all child components
  return (
    <ConfigContext.Provider value={{ config, loading, error }}>
      {children}
    </ConfigContext.Provider>
  );
};

/**
 * Hook to access the configuration
 * @returns {Object} The configuration context
 */
export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === null) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}; 