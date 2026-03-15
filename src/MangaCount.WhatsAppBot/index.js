const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const dotenv = require('dotenv');
const winston = require('winston');
const CommandParser = require('./services/CommandParser');
const ApiService = require('./services/ApiService');
const NotificationService = require('./services/NotificationService');

// Load environment variables
dotenv.config();

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'manga-whatsapp-bot' },
  transports: [
    new winston.transports.File({ 
      filename: process.env.LOG_FILE || './logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: process.env.LOG_FILE || './logs/combined.log' 
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class MangaCountBot {
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: process.env.SESSION_NAME || 'manga-bot-session'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    this.commandParser = new CommandParser();
    this.apiService = new ApiService();
    this.notificationService = new NotificationService();
    this.adminNumbers = (process.env.ADMIN_PHONE_NUMBERS || '').split(',');
    
    this.setupEventHandlers();
    
    logger.info('🤖 MangaCount WhatsApp Bot initialized');
  }

  setupEventHandlers() {
    // QR Code generation for initial setup
    this.client.on('qr', (qr) => {
      logger.info('📱 Scan this QR code with WhatsApp to connect:');
      qrcode.generate(qr, { small: true });
    });

    // Bot ready
    this.client.on('ready', () => {
      logger.info('✅ MangaCount Bot is ready and connected to WhatsApp!');
      console.log('🚀 Bot is ready to receive commands!');
      
      // Send startup notification to admin users
      this.notifyAdmins('🤖 MangaCount Bot está listo y funcionando correctamente!');
    });

    // Handle authentication
    this.client.on('authenticated', () => {
      logger.info('🔐 Bot authenticated successfully');
    });

    this.client.on('auth_failure', (msg) => {
      logger.error('❌ Authentication failed:', msg);
    });

    // Handle disconnection
    this.client.on('disconnected', (reason) => {
      logger.warn('🔌 Bot disconnected:', reason);
    });

    // Handle incoming messages
    this.client.on('message', async (message) => {
      try {
        await this.handleMessage(message);
      } catch (error) {
        logger.error('❌ Error handling message:', error);
      }
    });
  }

  async handleMessage(message) {
    // Skip if message is from status broadcast or groups (unless specifically enabled)
    if (message.from === 'status@broadcast' || message.isGroupMsg) {
      return;
    }

    // Log incoming message (without content for privacy)
    logger.info(`📩 Message received from ${message.from}`);

    // Skip if not a command (doesn't start with /)
    if (!message.body.startsWith('/')) {
      return;
    }

    // Parse command
    const command = this.commandParser.parse(message.body);
    
    if (!command) {
      await message.reply(
        '❓ Comando no reconocido. Usa */help* para ver los comandos disponibles.'
      );
      return;
    }

    // Execute command
    await this.executeCommand(command, message);
  }

  async executeCommand(command, message) {
    try {
      logger.info(`🎯 Executing command: ${command.action}`, command);

      switch (command.action) {
        case 'help':
          await this.sendHelp(message);
          break;

        case 'manga':
          await this.handleMangaCommand(command, message);
          break;

        case 'profile':
          await this.handleProfileCommand(command, message);
          break;

        case 'stats':
          await this.handleStatsCommand(command, message);
          break;

        case 'search':
          await this.handleSearchCommand(command, message);
          break;

        case 'status':
          await this.handleStatusCommand(message);
          break;

        default:
          await message.reply(`❓ Comando *${command.action}* no implementado aún.`);
      }

    } catch (error) {
      logger.error(`❌ Error executing command ${command.action}:`, error);
      await message.reply(
        '⚠️ Ocurrió un error al procesar tu comando. Intenta más tarde.'
      );
    }
  }

  async sendHelp(message) {
    const helpText = this.notificationService.formatHelp();
    await message.reply(helpText);
  }

  async handleMangaCommand(command, message) {
    const subcommand = command.parameters.subcommand;
    
    switch (subcommand) {
      case 'add':
        await this.addManga(command.parameters, message);
        break;
      case 'list':
        await this.listManga(message);
        break;
      case 'delete':
        await this.deleteManga(command.parameters, message);
        break;
      case 'priority':
        await this.togglePriority(command.parameters, message);
        break;
      default:
        await message.reply('❓ Subcomando de manga no válido. Usa */help* para ver opciones.');
    }
  }

  async addManga(params, message) {
    // Validate command
    const validation = this.commandParser.validate({ action: 'manga', parameters: params });
    if (!validation.valid) {
      await message.reply(this.notificationService.formatError(validation.message));
      return;
    }

    try {
      const result = await this.apiService.addManga(params);
      const response = result.success 
        ? this.notificationService.formatSuccess(result.message)
        : this.notificationService.formatError(result.message);
      
      await message.reply(response);
    } catch (error) {
      logger.error('Error adding manga:', error);
      await message.reply(this.notificationService.formatError('Error interno al agregar manga.'));
    }
  }

  async listManga(message) {
    try {
      const result = await this.apiService.getMangaList();
      const response = this.notificationService.formatMangaList(result);
      await message.reply(response);
    } catch (error) {
      logger.error('Error listing manga:', error);
      await message.reply(this.notificationService.formatError('Error al obtener la lista de manga.'));
    }
  }

  async deleteManga(params, message) {
    // Validate command
    const validation = this.commandParser.validate({ action: 'manga', parameters: { subcommand: 'delete', ...params } });
    if (!validation.valid) {
      await message.reply(this.notificationService.formatError(validation.message));
      return;
    }

    try {
      const result = await this.apiService.deleteManga(params.title);
      const response = result.success 
        ? this.notificationService.formatSuccess(result.message)
        : this.notificationService.formatError(result.message);
      
      await message.reply(response);
    } catch (error) {
      logger.error('Error deleting manga:', error);
      await message.reply(this.notificationService.formatError('Error interno al eliminar manga.'));
    }
  }

  async togglePriority(params, message) {
    // Validate command
    const validation = this.commandParser.validate({ action: 'manga', parameters: { subcommand: 'priority', ...params } });
    if (!validation.valid) {
      await message.reply(this.notificationService.formatError(validation.message));
      return;
    }

    try {
      const result = await this.apiService.toggleMangaPriority(params.title);
      const response = result.success 
        ? this.notificationService.formatSuccess(result.message)
        : this.notificationService.formatError(result.message);
      
      await message.reply(response);
    } catch (error) {
      logger.error('Error toggling priority:', error);
      await message.reply(this.notificationService.formatError('Error interno al cambiar prioridad.'));
    }
  }

  async handleProfileCommand(command, message) {
    const subcommand = command.parameters.subcommand;
    
    switch (subcommand) {
      case 'list':
        await this.listProfiles(message);
        break;
      case 'set':
        await this.setProfile(command.parameters, message);
        break;
      case 'create':
        await this.createProfile(command.parameters, message);
        break;
      default:
        await message.reply('❓ Subcomando de perfil no válido. Usa */help* para ver opciones.');
    }
  }

  async listProfiles(message) {
    try {
      const result = await this.apiService.getProfiles();
      const currentProfile = this.apiService.getCurrentProfile();
      const response = this.notificationService.formatProfileList(result, currentProfile);
      await message.reply(response);
    } catch (error) {
      logger.error('Error listing profiles:', error);
      await message.reply(this.notificationService.formatError('Error al obtener la lista de perfiles.'));
    }
  }

  async setProfile(params, message) {
    // Validate command
    const validation = this.commandParser.validate({ action: 'profile', parameters: { subcommand: 'set', ...params } });
    if (!validation.valid) {
      await message.reply(this.notificationService.formatError(validation.message));
      return;
    }

    try {
      // Check if profile exists
      const profilesResult = await this.apiService.getProfiles();
      if (!profilesResult.success) {
        await message.reply(this.notificationService.formatError(profilesResult.message));
        return;
      }

      const profileExists = profilesResult.data.some(p => p.name === params.profileName);
      if (!profileExists) {
        await message.reply(this.notificationService.formatError(
          `Perfil "${params.profileName}" no existe.`,
          'Usa /profile list para ver perfiles disponibles o /profile create para crear uno nuevo.'
        ));
        return;
      }

      // Set profile
      this.apiService.setCurrentProfile(params.profileName);
      const successMessage = `Perfil activo cambiado a "${params.profileName}"`;
      await message.reply(this.notificationService.formatSuccess(successMessage));
      
    } catch (error) {
      logger.error('Error setting profile:', error);
      await message.reply(this.notificationService.formatError('Error interno al cambiar de perfil.'));
    }
  }

  async createProfile(params, message) {
    // Validate command
    const validation = this.commandParser.validate({ action: 'profile', parameters: { subcommand: 'create', ...params } });
    if (!validation.valid) {
      await message.reply(this.notificationService.formatError(validation.message));
      return;
    }

    try {
      const result = await this.apiService.createProfile(params.profileName);
      if (result.success) {
        // Automatically set the new profile as active
        this.apiService.setCurrentProfile(params.profileName);
        const successMessage = `${result.message} y establecido como activo.`;
        await message.reply(this.notificationService.formatSuccess(successMessage));
      } else {
        await message.reply(this.notificationService.formatError(result.message));
      }
    } catch (error) {
      logger.error('Error creating profile:', error);
      await message.reply(this.notificationService.formatError('Error interno al crear perfil.'));
    }
  }

  async handleSearchCommand(command, message) {
    // Validate command
    const validation = this.commandParser.validate(command);
    if (!validation.valid) {
      await message.reply(this.notificationService.formatError(validation.message));
      return;
    }

    try {
      const result = await this.apiService.searchManga(command.parameters.query);
      const response = this.notificationService.formatSearchResults(result);
      await message.reply(response);
    } catch (error) {
      logger.error('Error searching manga:', error);
      await message.reply(this.notificationService.formatError('Error interno en la búsqueda.'));
    }
  }

  async handleStatsCommand(command, message) {
    try {
      const result = await this.apiService.getStatistics();
      const response = this.notificationService.formatStatistics(result);
      await message.reply(response);
    } catch (error) {
      logger.error('Error getting stats:', error);
      await message.reply(this.notificationService.formatError('Error al obtener estadísticas.'));
    }
  }

  async handleStatusCommand(message) {
    try {
      const apiConnection = await this.apiService.testConnection();
      const currentProfile = this.apiService.getCurrentProfile();
      const statusText = this.notificationService.formatStatus(apiConnection.success, currentProfile);
      await message.reply(statusText);
    } catch (error) {
      logger.error('Error getting status:', error);
      await message.reply(this.notificationService.formatError('Error al obtener el estado del bot.'));
    }
  }

  async notifyAdmins(message) {
    await this.notificationService.notifyAdmins(this.client, message);
  }

  async start() {
    try {
      logger.info('🚀 Starting MangaCount WhatsApp Bot...');
      await this.client.initialize();
    } catch (error) {
      logger.error('❌ Failed to start bot:', error);
      process.exit(1);
    }
  }

  async stop() {
    logger.info('🛑 Stopping MangaCount WhatsApp Bot...');
    await this.client.destroy();
  }
}

// Handle process termination gracefully
const bot = new MangaCountBot();

process.on('SIGINT', async () => {
  await bot.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await bot.stop();
  process.exit(0);
});

// Start the bot
bot.start().catch(error => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});

module.exports = MangaCountBot;