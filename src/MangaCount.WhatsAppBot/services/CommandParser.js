/**
 * CommandParser - Parses WhatsApp commands into structured objects
 * 
 * Supported command formats:
 * /help
 * /status
 * /manga add "Title" volumes:5 format:Tankoubon publisher:Editorial
 * /manga list
 * /manga delete "Title"
 * /manga priority "Title"
 * /profile set "Name"
 * /profile create "Name"
 * /profile list
 * /search "query"
 * /stats
 */

class CommandParser {
  constructor() {
    this.commandPatterns = {
      // Simple commands without parameters
      simple: /^\/(\w+)$/,
      
      // Commands with subcommands
      withSubcommand: /^\/(\w+)\s+(\w+)(?:\s+(.+))?$/,
      
      // Parameter extraction patterns
      quotedString: /"([^"]+)"/g,
      keyValue: /(\w+):(\S+)/g,
      flags: /--(\w+)/g
    };
  }

  /**
   * Parse a WhatsApp message into a command object
   * @param {string} messageBody - The raw message text
   * @returns {Object|null} Parsed command object or null if invalid
   */
  parse(messageBody) {
    if (!messageBody || !messageBody.startsWith('/')) {
      return null;
    }

    const trimmed = messageBody.trim();
    
    try {
      // Try simple command first
      const simpleMatch = trimmed.match(this.commandPatterns.simple);
      if (simpleMatch) {
        return this.createCommand(simpleMatch[1]);
      }

      // Try command with subcommand
      const complexMatch = trimmed.match(this.commandPatterns.withSubcommand);
      if (complexMatch) {
        const [, action, subcommand, params = ''] = complexMatch;
        return this.createCommand(action, subcommand, params);
      }

      return null;
    } catch (error) {
      console.error('Error parsing command:', error);
      return null;
    }
  }

  /**
   * Create a structured command object
   */
  createCommand(action, subcommand = null, paramString = '') {
    const command = {
      action: action.toLowerCase(),
      parameters: {}
    };

    if (subcommand) {
      command.parameters.subcommand = subcommand.toLowerCase();
    }

    if (paramString) {
      this.parseParameters(paramString, command.parameters);
    }

    return command;
  }

  /**
   * Parse parameters from the parameter string
   */
  parseParameters(paramString, parameters) {
    // Extract quoted strings (titles, names, etc.)
    const quotedStrings = [];
    let match;
    
    while ((match = this.commandPatterns.quotedString.exec(paramString)) !== null) {
      quotedStrings.push(match[1]);
    }

    // Clean param string from quoted content for further processing
    let cleanParams = paramString.replace(this.commandPatterns.quotedString, '').trim();

    // Extract key-value pairs (volumes:5, format:Tankoubon)
    const keyValuePairs = {};
    while ((match = this.commandPatterns.keyValue.exec(cleanParams)) !== null) {
      const key = match[1].toLowerCase();
      let value = match[2];
      
      // Try to convert to number if possible
      if (/^\d+$/.test(value)) {
        value = parseInt(value);
      } else if (/^\d+\.\d+$/.test(value)) {
        value = parseFloat(value);
      } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
        value = value.toLowerCase() === 'true';
      }
      
      keyValuePairs[key] = value;
    }

    // Extract flags (--priority, --complete)
    const flags = [];
    while ((match = this.commandPatterns.flags.exec(cleanParams)) !== null) {
      flags.push(match[1].toLowerCase());
    }

    // Assign parsed values based on command context
    this.assignParametersByContext(parameters, quotedStrings, keyValuePairs, flags);
  }

  /**
   * Assign parameters based on command context
   */
  assignParametersByContext(parameters, quotedStrings, keyValuePairs, flags) {
    const { subcommand } = parameters;

    // Handle manga commands
    if (parameters.subcommand === 'add' || parameters.subcommand === 'delete' || 
        parameters.subcommand === 'priority' || parameters.subcommand === 'search') {
      
      if (quotedStrings.length > 0) {
        parameters.title = quotedStrings[0];
      }

      if (subcommand === 'add') {
        // Default values for adding manga
        parameters.volumes = keyValuePairs.volumes || keyValuePairs.volúmenes || 1;
        parameters.total = keyValuePairs.total || '??';
        parameters.format = keyValuePairs.format || keyValuePairs.formato || 'Unknown';
        parameters.publisher = keyValuePairs.publisher || keyValuePairs.editorial || 'Unknown';
        parameters.priority = keyValuePairs.priority || flags.includes('priority') || false;
        parameters.complete = keyValuePairs.complete || flags.includes('complete') || false;
      }
    }

    // Handle profile commands  
    if (parameters.subcommand === 'set' || parameters.subcommand === 'create') {
      if (quotedStrings.length > 0) {
        parameters.profileName = quotedStrings[0];
      }
    }

    // Handle search commands
    if (parameters.action === 'search') {
      if (quotedStrings.length > 0) {
        parameters.query = quotedStrings[0];
      } else {
        // Handle special search types
        const cleanQuery = Object.keys(keyValuePairs).join(' ') + ' ' + flags.join(' ');
        parameters.query = cleanQuery.trim();
      }
    }

    // Add all key-value pairs directly
    Object.assign(parameters, keyValuePairs);

    // Add flags as boolean properties
    flags.forEach(flag => {
      parameters[flag] = true;
    });
  }

  /**
   * Validate command parameters
   */
  validate(command) {
    const { action, parameters } = command;

    switch (action) {
      case 'manga':
        return this.validateMangaCommand(parameters);
      case 'profile':
        return this.validateProfileCommand(parameters);
      case 'search':
        return this.validateSearchCommand(parameters);
      default:
        return { valid: true };
    }
  }

  validateMangaCommand(parameters) {
    const { subcommand } = parameters;

    switch (subcommand) {
      case 'add':
        if (!parameters.title) {
          return { 
            valid: false, 
            message: 'El título es requerido. Uso: /manga add "Título" volumes:5' 
          };
        }
        break;
      
      case 'delete':
      case 'priority':
        if (!parameters.title) {
          return { 
            valid: false, 
            message: 'El título es requerido.' 
          };
        }
        break;
    }

    return { valid: true };
  }

  validateProfileCommand(parameters) {
    const { subcommand } = parameters;

    if ((subcommand === 'set' || subcommand === 'create') && !parameters.profileName) {
      return { 
        valid: false, 
        message: 'El nombre del perfil es requerido. Uso: /profile set "Nombre"' 
      };
    }

    return { valid: true };
  }

  validateSearchCommand(parameters) {
    if (!parameters.query) {
      return { 
        valid: false, 
        message: 'Query de búsqueda requerida. Uso: /search "término"' 
      };
    }

    return { valid: true };
  }

  /**
   * Get help text for command usage
   */
  getUsageHelp(action) {
    const helpTexts = {
      manga: `
*Comandos de Manga:*
• \`/manga add "Título" volumes:5 format:Tankoubon\`
• \`/manga list\`
• \`/manga delete "Título"\`
• \`/manga priority "Título"\`
      `,
      
      profile: `
*Comandos de Perfil:*
• \`/profile list\`
• \`/profile set "Nombre"\`
• \`/profile create "Nombre"\`
      `,
      
      search: `
*Comandos de Búsqueda:*
• \`/search "término"\`
• \`/search incomplete\`
• \`/search priority\`
      `
    };

    return helpTexts[action] || 'Comando no reconocido. Usa /help para ver todos los comandos.';
  }
}

module.exports = CommandParser;