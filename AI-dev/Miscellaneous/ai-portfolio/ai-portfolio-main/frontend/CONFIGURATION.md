# Configuration System

This document explains the configuration system used in the AI Portfolio project. The configuration system allows you to customize the content of your portfolio without modifying the code.

## Overview

The project uses a single `config.json` file in the `public` directory to store all configuration values. This file is essential for the application to function properly. The frontend requires this file to be present and will display an error message if it cannot be found.

## Configuration File Structure

The `config.json` file has the following structure:

```json
{
  "personal": {
    "name": "Your Name",
    "email": "your.email@example.com",
  },
  "social": {
    "github": {
      "url": "https://github.com/yourusername"
    },
    "linkedin": {
      "url": "https://linkedin.com/in/yourusername"
    },
    "email": {
      "url": "mailto:your.email@example.com"
    }
  },
  "content": {
    "intro": {
      "cards": [
        {
          "title": "Feature 1",
          "description": "Description of feature 1",
          "icon": "Brain"
        },
        {
          "title": "Feature 2",
          "description": "Description of feature 2",
          "icon": "BookOpen"
        },
        {
          "title": "Feature 3",
          "description": "Description of feature 3",
          "icon": "MessageSquareText"
        }
      ],
      "paragraphs": [
        "Main paragraph about yourself.",
        "Secondary paragraph with additional information."
      ]
    }
  },
  "chat": {
    "inputPlaceholder": "Ask me anything about Your Name...",
    "initialMessage": "Hey there! 👋 I'm Your Name's AI assistant, I have access to their writings, and life insights. Feel free to ask and explore about their professional path or personal growth!"
  }
}
```

## How to Customize

1. Edit the `config.json` file in the `public` directory
2. Update the values to match your information
3. Restart the development server or rebuild the application

## Technical Implementation


The frontend uses a configuration loader that fetches the `config.json` file and provides access to the configuration values through React hooks and utility functions. The configuration is loaded when the application starts and is cached for subsequent access.

If the configuration file cannot be loaded, the application will display an error message to the user, indicating that the `config.json` file is required.

