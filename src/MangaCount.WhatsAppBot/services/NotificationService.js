/**
 * NotificationService - Handles message formatting and notification delivery
 * 
 * Provides methods to:
 * - Format API responses into readable WhatsApp messages
 * - Send notifications to users and admins
 * - Create rich text responses with emojis and formatting
 * - Handle error message formatting
 */

class NotificationService {
  constructor() {
    this.maxMessageLength = 4096; // WhatsApp message limit
    this.adminNumbers = process.env.ADMIN_NUMBERS?.split(',') || [];
  }

  // ==================== MESSAGE FORMATTING ====================

  /**
   * Format manga list response
   */
  formatMangaList(apiResponse) {
    if (!apiResponse.success || !apiResponse.data) {
      return `❌ ${apiResponse.message}`;
    }

    const manga = apiResponse.data;
    if (manga.length === 0) {
      return '📚 *Tu colección está vacía*\n\nUsa `/manga add "Título" volumes:1` para agregar manga.';
    }

    let message = `📚 *Tu Colección de Manga* (${manga.length} títulos)\n\n`;

    // Sort by priority first, then by title
    const sortedManga = manga.sort((a, b) => {
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      return a.title.localeCompare(b.title);
    });

    sortedManga.forEach((m, index) => {
      const priorityIcon = m.priority ? '🔥 ' : '';
      const completionIcon = this.getCompletionIcon(m);
      const volumeInfo = this.formatVolumeInfo(m);
      
      message += `${index + 1}. ${priorityIcon}*${m.title}*\n`;
      message += `   ${completionIcon} ${volumeInfo} | ${m.format}\n`;
      message += `   📖 ${m.publisher}\n\n`;
    });

    // Truncate if too long
    if (message.length > this.maxMessageLength) {
      const truncateAt = this.maxMessageLength - 200;
      message = message.substring(0, truncateAt) + '\n\n... _(lista truncada)_\n\nUsa `/search` para filtrar resultados.';
    }

    return message;
  }

  /**
   * Format search results
   */
  formatSearchResults(apiResponse) {
    if (!apiResponse.success || !apiResponse.data) {
      return `❌ ${apiResponse.message}`;
    }

    const manga = apiResponse.data;
    const query = apiResponse.query;

    if (manga.length === 0) {
      return `🔍 *Búsqueda: "${query}"*\n\nNo se encontraron resultados.`;
    }

    let message = `🔍 *Orden: "${query}"* (${manga.length} resultados)\n\n`;

    manga.forEach((m, index) => {
      const priorityIcon = m.priority ? '🔥 ' : '';
      const completionIcon = this.getCompletionIcon(m);
      const volumeInfo = this.formatVolumeInfo(m);
      
      message += `${index + 1}. ${priorityIcon}*${m.title}*\n`;
      message += `   ${completionIcon} ${volumeInfo} | ${m.format}\n\n`;
    });

    return message;
  }

  /**
   * Format statistics response
   */
  formatStatistics(apiResponse) {
    if (!apiResponse.success || !apiResponse.data) {
      return `❌ ${apiResponse.message}`;
    }

    const stats = apiResponse.data;
    
    let message = `📊 *Estadísticas - ${stats.profile}*\n\n`;
    
    message += `📚 *Resumen General:*\n`;
    message += `• Total de títulos: *${stats.total}*\n`;
    message += `• Volúmenes totales: *${stats.totalVolumes}*\n`;
    message += `• Con prioridad: *${stats.priority}*\n`;
    message += `• Incompletos: *${stats.incomplete}*\n`;
    message += `• Completos: *${stats.complete}*\n\n`;

    // Format breakdown
    if (Object.keys(stats.formats).length > 0) {
      message += `📖 *Por Formato:*\n`;
      Object.entries(stats.formats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5) // Top 5
        .forEach(([format, count]) => {
          message += `• ${format}: ${count}\n`;
        });
      message += '\n';
    }

    if (Object.keys(stats.publishers).length > 0) {
      message += `🏢 *Top Editoriales:*\n`;
      Object.entries(stats.publishers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5) // Top 5
        .forEach(([publisher, count]) => {
          message += `• ${publisher}: ${count}\n`;
        });
    }

    return message;
  }

  /**
   * Format profile list response
   */
  formatProfileList(apiResponse, currentProfile) {
    if (!apiResponse.success || !apiResponse.data) {
      return `❌ ${apiResponse.message}`;
    }

    const profiles = apiResponse.data;
    
    if (profiles.length === 0) {
      return '👤 *No hay perfiles*\n\nCrea uno con `/profile create "Nombre"`';
    }

    let message = '👤 *Perfiles Disponibles:*\n\n';
    
    profiles.forEach((profile, index) => {
      const isActive = profile.name === currentProfile;
      const activeIcon = isActive ? '✅ ' : '◦ ';
      const mangaCount = profile.mangaCount || 0;
      
      message += `${activeIcon}*${profile.name}*`;
      if (mangaCount > 0) {
        message += ` (${mangaCount} manga)`;
      }
      if (isActive) {
        message += ' _(activo)_';
      }
      message += '\n';
    });

    message += '\nUsa `/profile set "Nombre"` para cambiar de perfil.';

    return message;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get completion icon based on manga status
   */
  getCompletionIcon(manga) {
    if (manga.totalVolumes === '??') {
      return '❓'; // Unknown total
    }
    
    if (typeof manga.totalVolumes === 'number') {
      if (manga.volumes >= manga.totalVolumes) {
        return '✅'; // Complete
      } else {
        const progress = Math.round((manga.volumes / manga.totalVolumes) * 100);
        if (progress >= 75) return '🟡'; // Near complete
        if (progress >= 50) return '🟠'; // Half complete
        return '🔴'; // Incomplete
      }
    }
    
    return '📖'; // Default
  }

  /**
   * Format volume information
   */
  formatVolumeInfo(manga) {
    if (manga.totalVolumes === '??') {
      return `${manga.volumes} volúmenes`;
    }
    
    if (typeof manga.totalVolumes === 'number') {
      const progress = Math.round((manga.volumes / manga.totalVolumes) * 100);
      return `${manga.volumes}/${manga.totalVolumes} (${progress}%)`;
    }
    
    return `${manga.volumes} volúmenes`;
  }

  /**
   * Format success message
   */
  formatSuccess(message, details = null) {
    let response = `✅ ${message}`;
    if (details) {
      response += `\n\n${details}`;
    }
    return response;
  }

  /**
   * Format error message
   */
  formatError(message, suggestion = null) {
    let response = `❌ ${message}`;
    if (suggestion) {
      response += `\n\n💡 ${suggestion}`;
    }
    return response;
  }

  /**
   * Format help message
   */
  formatHelp() {
    return `🤖 *MangaCount Bot - Comandos Disponibles*

📚 *Gestión de Manga:*
• \`/manga list\` - Ver tu colección
• \`/manga add "Título" volumes:5\` - Agregar manga
• \`/manga delete "Título"\` - Eliminar manga
• \`/manga priority "Título"\` - Cambiar prioridad

👤 *Perfiles:*
• \`/profile list\` - Ver perfiles
• \`/profile set "Nombre"\` - Cambiar perfil
• \`/profile create "Nombre"\` - Crear perfil

🔍 *Búsqueda:*
• \`/search "término"\` - Buscar en tu colección
• \`/search incomplete\` - Ver manga incompleto
• \`/search priority\` - Ver manga prioritario

📊 *Estadísticas:*
• \`/stats\` - Ver estadísticas de tu colección

ℹ️ *Información:*
• \`/help\` - Ver esta ayuda
• \`/status\` - Estado del bot

*Ejemplos de uso:*
\`/manga add "Attack on Titan" volumes:34 format:Tankoubon\`
\`/profile set "Lucas"\`
\`/search "One Piece"\``;
  }

  /**
   * Format bot status message
   */
  formatStatus(apiConnection, currentProfile) {
    const apiStatus = apiConnection ? '🟢 Conectado' : '🔴 Desconectado';
    const profileStatus = currentProfile ? `👤 ${currentProfile}` : '❌ Sin perfil';
    
    return `🤖 *Estado del Bot*

🔌 API: ${apiStatus}
👤 Perfil: ${profileStatus}
⏰ Hora: ${new Date().toLocaleString('es-ES')}

${currentProfile ? '' : '\n💡 Usa `/profile set "Nombre"` para activar un perfil.'}`;
  }

  // ==================== NOTIFICATION METHODS ====================

  /**
   * Send notification to user
   */
  async sendNotification(client, chatId, message) {
    try {
      await client.sendMessage(chatId, message);
      console.log(`[Notification] Sent to ${chatId}: ${message.substring(0, 50)}...`);
      return true;
    } catch (error) {
      console.error(`[Notification] Failed to send to ${chatId}:`, error);
      return false;
    }
  }

  /**
   * Send notification to admins
   */
  async notifyAdmins(client, message) {
    const adminMessage = `🔔 *Admin Notification*\n\n${message}`;
    
    for (const adminNumber of this.adminNumbers) {
      try {
        const chatId = `${adminNumber}@c.us`;
        await this.sendNotification(client, chatId, adminMessage);
      } catch (error) {
        console.error(`[Admin Notification] Failed to notify admin ${adminNumber}:`, error);
      }
    }
  }

  /**
   * Send welcome message to new user
   */
  async sendWelcome(client, chatId) {
    const welcomeMessage = `👋 ¡Hola! Bienvenido a *MangaCount Bot*

🤖 Soy tu asistente para gestionar tu colección de manga.

Para empezar:
1️⃣ Crea un perfil: \`/profile create "Tu Nombre"\`
2️⃣ Agrega tu primer manga: \`/manga add "Título" volumes:1\`
3️⃣ Ve tu colección: \`/manga list\`

Usa \`/help\` para ver todos los comandos disponibles.

¡Happy reading! 📚✨`;

    return await this.sendNotification(client, chatId, welcomeMessage);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Escape special characters for WhatsApp formatting
   */
  escapeWhatsAppMarkdown(text) {
    return text
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/~/g, '\\~')
      .replace(/`/g, '\\`');
  }

  /**
   * Truncate message if too long
   */
  truncateMessage(message, maxLength = null) {
    const limit = maxLength || this.maxMessageLength;
    
    if (message.length <= limit) {
      return message;
    }
    
    return message.substring(0, limit - 50) + '\n\n... _(mensaje truncado)_';
  }

  /**
   * Add timestamp to message
   */
  addTimestamp(message) {
    const timestamp = new Date().toLocaleString('es-ES');
    return `${message}\n\n_⏰ ${timestamp}_`;
  }
}

module.exports = NotificationService;