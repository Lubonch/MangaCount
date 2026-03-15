import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, tap, map } from 'rxjs';

interface JikanMangaSearchResponse {
  data: Array<{
    mal_id: number;
    title: string;
    images: {
      jpg: {
        image_url: string;
        small_image_url: string;
        large_image_url: string;
      };
    };
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private readonly jikanBaseUrl = 'https://api.jikan.moe/v4';
  private readonly imageCache = new Map<string, string>();

  constructor(private http: HttpClient) {}

  searchMangaImage(title: string): Observable<string | null> {
    // Check cache first
    const cacheKey = title.toLowerCase().trim();
    if (this.imageCache.has(cacheKey)) {
      return of(this.imageCache.get(cacheKey) || null);
    }

    // Search using Jikan API (MyAnimeList data)
    const searchUrl = `${this.jikanBaseUrl}/manga?q=${encodeURIComponent(title)}&limit=1`;
    
    return this.http.get<JikanMangaSearchResponse>(searchUrl).pipe(
      map(response => {
        if (response.data && response.data.length > 0) {
          const imageUrl = response.data[0].images.jpg.image_url;
          this.imageCache.set(cacheKey, imageUrl);
          return imageUrl;
        } else {
          this.imageCache.set(cacheKey, '');
          return null;
        }
      }),
      catchError(error => {
        console.warn(`Failed to fetch image for "${title}":`, error);
        this.imageCache.set(cacheKey, '');
        return of(null);
      })
    );
  }

  generatePlaceholderDataUrl(title: string): string {
    // Create a simple placeholder with the manga title
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return 'data:image/svg+xml,' + encodeURIComponent(this.getDefaultPlaceholderSvg(title));
    }

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 200, 300);

    // Add book icon
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(40, 60, 120, 160);
    ctx.fillRect(50, 70, 100, 140);
    
    // Add title text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    
    const lines = this.wrapText(title, 16);
    lines.forEach((line, index) => {
      ctx.fillText(line, 100, 240 + (index * 18));
    });

    return canvas.toDataURL();
  }

  private getDefaultPlaceholderSvg(title: string): string {
    const shortTitle = title.length > 20 ? title.substring(0, 17) + '...' : title;
    return `
      <svg width="200" height="300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="200" height="300" fill="url(#grad)"/>
        <rect x="40" y="60" width="120" height="160" fill="rgba(255,255,255,0.2)" rx="5"/>
        <rect x="50" y="70" width="100" height="140" fill="rgba(255,255,255,0.1)" rx="3"/>
        <text x="100" y="240" font-family="Arial, sans-serif" font-size="12" font-weight="bold" 
              fill="white" text-anchor="middle">${shortTitle}</text>
      </svg>
    `;
  }

  private wrapText(text: string, maxLength: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + word).length <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines.slice(0, 3); // Max 3 lines
  }

  clearCache(): void {
    this.imageCache.clear();
  }
}