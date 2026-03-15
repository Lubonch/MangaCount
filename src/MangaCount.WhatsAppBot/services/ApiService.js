const axios = require('axios');

/**
 * ApiService - Handles all communication with the .NET MangaCount API
 * 
 * Provides methods to:
 * - Manage profiles (list, create, get, set current)
 * - Manage manga (list, add, delete, update, search)
 * - Get statistics and export data
 * - Handle API authentication and error responses
 */

class ApiService {
  constructor(baseUrl = 'http://localhost:5000/api') {
    this.baseUrl = baseUrl;
    this.currentProfile = null;
    this.timeout = 10000; // 10 seconds

    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Add request/response interceptors for logging and error handling
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      config => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      error => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      response => {
        console.log(`[API] Response ${response.status} from ${response.config.url}`);
        return response;
      },
      error => {
        console.error('[API] Response error:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );
  }

  // ==================== PROFILE OPERATIONS ====================

  /**
   * Get all available profiles
   */
  async getProfiles() {
    try {
      const response = await this.client.get('/profiles');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError('Error getting profiles', error);
    }
  }

  /**
   * Create a new profile
   */
  async createProfile(profileName) {
    try {
      const response = await this.client.post('/profiles', {
        name: profileName
      });
      
      return {
        success: true,
        data: response.data,
        message: `Perfil "${profileName}" creado exitosamente`
      };
    } catch (error) {
      return this.handleError(`Error creating profile "${profileName}"`, error);
    }
  }

  /**
   * Set current active profile
   */
  setCurrentProfile(profileName) {
    this.currentProfile = profileName;
    console.log(`[API] Current profile set to: ${profileName}`);
  }

  /**
   * Get current active profile
   */
  getCurrentProfile() {
    return this.currentProfile;
  }

  // ==================== MANGA OPERATIONS ====================

  /**
   * Get manga list for current profile
   */
  async getMangaList() {
    if (!this.currentProfile) {
      return {
        success: false,
        message: 'No hay perfil activo. Usa /profile set "nombre" para establecer uno.'
      };
    }

    try {
      const response = await this.client.get(`/manga?profile=${encodeURIComponent(this.currentProfile)}`);
      return {
        success: true,
        data: response.data,
        count: response.data.length
      };
    } catch (error) {
      return this.handleError('Error getting manga list', error);
    }
  }

  /**
   * Add new manga to current profile
   */
  async addManga(mangaData) {
    if (!this.currentProfile) {
      return {
        success: false,
        message: 'No hay perfil activo. Usa /profile set "nombre" para establecer uno.'
      };
    }

    try {
      const manga = {
        profile: this.currentProfile,
        title: mangaData.title,
        volumes: mangaData.volumes || 1,
        totalVolumes: mangaData.total || '??',
        format: mangaData.format || 'Unknown',
        publisher: mangaData.publisher || 'Unknown',
        priority: mangaData.priority || false,
        dateAdded: new Date().toISOString()
      };

      const response = await this.client.post('/manga', manga);
      
      return {
        success: true,
        data: response.data,
        message: `Manga "${mangaData.title}" agregado al perfil "${this.currentProfile}"`
      };
    } catch (error) {
      return this.handleError(`Error adding manga "${mangaData.title}"`, error);
    }
  }

  /**
   * Delete manga from current profile
   */
  async deleteManga(title) {
    if (!this.currentProfile) {
      return {
        success: false,
        message: 'No hay perfil activo. Usa /profile set "nombre" para establecer uno.'
      };
    }

    try {
      // First find the manga
      const mangaList = await this.getMangaList();
      if (!mangaList.success) {
        return mangaList;
      }

      const manga = mangaList.data.find(m => 
        m.title.toLowerCase().includes(title.toLowerCase())
      );

      if (!manga) {
        return {
          success: false,
          message: `Manga "${title}" no encontrado en el perfil "${this.currentProfile}"`
        };
      }

      await this.client.delete(`/manga/${manga.id}`);
      
      return {
        success: true,
        message: `Manga "${manga.title}" eliminado del perfil "${this.currentProfile}"`
      };
    } catch (error) {
      return this.handleError(`Error deleting manga "${title}"`, error);
    }
  }

  /**
   * Toggle manga priority status
   */
  async toggleMangaPriority(title) {
    if (!this.currentProfile) {
      return {
        success: false,
        message: 'No hay perfil activo. Usa /profile set "nombre" para establecer uno.'
      };
    }

    try {
      // First find the manga
      const mangaList = await this.getMangaList();
      if (!mangaList.success) {
        return mangaList;
      }

      const manga = mangaList.data.find(m => 
        m.title.toLowerCase().includes(title.toLowerCase())
      );

      if (!manga) {
        return {
          success: false,
          message: `Manga "${title}" no encontrado en el perfil "${this.currentProfile}"`
        };
      }

      const updatedManga = {
        ...manga,
        priority: !manga.priority
      };

      await this.client.put(`/manga/${manga.id}`, updatedManga);
      
      const priorityStatus = updatedManga.priority ? 'ALTA' : 'NORMAL';
      return {
        success: true,
        message: `Prioridad de "${manga.title}" cambiada a: ${priorityStatus}`
      };
    } catch (error) {
      return this.handleError(`Error updating manga priority "${title}"`, error);
    }
  }

  /**
   * Search manga in current profile
   */
  async searchManga(query) {
    if (!this.currentProfile) {
      return {
        success: false,
        message: 'No hay perfil activo. Usa /profile set "nombre" para establecer uno.'
      };
    }

    try {
      const mangaList = await this.getMangaList();
      if (!mangaList.success) {
        return mangaList;
      }

      let filteredManga = mangaList.data;

      // Apply search filters
      if (query.toLowerCase() === 'incomplete' || query.toLowerCase() === 'incompleto') {
        filteredManga = filteredManga.filter(m => 
          m.totalVolumes === '??' || 
          (typeof m.totalVolumes === 'number' && m.volumes < m.totalVolumes)
        );
      } else if (query.toLowerCase() === 'priority' || query.toLowerCase() === 'prioridad') {
        filteredManga = filteredManga.filter(m => m.priority);
      } else if (query.toLowerCase() === 'complete' || query.toLowerCase() === 'completo') {
        filteredManga = filteredManga.filter(m => 
          typeof m.totalVolumes === 'number' && m.volumes >= m.totalVolumes
        );
      } else {
        // Text search in title, publisher, format
        const searchTerm = query.toLowerCase();
        filteredManga = filteredManga.filter(m => 
          m.title.toLowerCase().includes(searchTerm) ||
          m.publisher.toLowerCase().includes(searchTerm) ||
          m.format.toLowerCase().includes(searchTerm)
        );
      }

      return {
        success: true,
        data: filteredManga,
        count: filteredManga.length,
        query: query
      };
    } catch (error) {
      return this.handleError(`Error searching manga with query "${query}"`, error);
    }
  }

  // ==================== STATISTICS ====================

  /**
   * Get manga statistics for current profile
   */
  async getStatistics() {
    if (!this.currentProfile) {
      return {
        success: false,
        message: 'No hay perfil activo. Usa /profile set "nombre" para establecer uno.'
      };
    }

    try {
      const mangaList = await this.getMangaList();
      if (!mangaList.success) {
        return mangaList;
      }

      const manga = mangaList.data;
      const stats = {
        profile: this.currentProfile,
        total: manga.length,
        totalVolumes: manga.reduce((sum, m) => sum + m.volumes, 0),
        priority: manga.filter(m => m.priority).length,
        incomplete: manga.filter(m => 
          m.totalVolumes === '??' || 
          (typeof m.totalVolumes === 'number' && m.volumes < m.totalVolumes)
        ).length,
        complete: manga.filter(m => 
          typeof m.totalVolumes === 'number' && m.volumes >= m.totalVolumes
        ).length,
        formats: this.getFormatStats(manga),
        publishers: this.getPublisherStats(manga)
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return this.handleError('Error getting statistics', error);
    }
  }

  getFormatStats(manga) {
    const formats = {};
    manga.forEach(m => {
      formats[m.format] = (formats[m.format] || 0) + 1;
    });
    return formats;
  }

  getPublisherStats(manga) {
    const publishers = {};
    manga.forEach(m => {
      publishers[m.publisher] = (publishers[m.publisher] || 0) + 1;
    });
    return publishers;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      const response = await this.client.get('/profiles');
      return {
        success: true,
        message: 'API connection successful',
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        message: 'API connection failed',
        error: error.message
      };
    }
  }

  /**
   * Handle API errors consistently
   */
  handleError(context, error) {
    let message = context;
    
    if (error.response) {
      // API returned an error response
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 404) {
        message += ' - Recurso no encontrado';
      } else if (status === 400) {
        message += ' - Datos inválidos';
      } else if (status >= 500) {
        message += ' - Error del servidor';
      }
      
      if (data?.message) {
        message += `: ${data.message}`;
      }
    } else if (error.request) {
      // Network error
      message += ' - No se pudo conectar con la API';
    } else {
      // Other error
      message += `: ${error.message}`;
    }

    console.error('[API] Error:', message);
    
    return {
      success: false,
      message: message,
      error: error.message
    };
  }
}

module.exports = ApiService;