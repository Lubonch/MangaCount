export interface Manga {
  id: number;
  name: string;
  volumes: number | null;
  formatId: number;
  format?: Format;
  publisherId: number;
  publisher?: Publisher;
}

export interface MangaCreateDto {
  id?: number;
  name: string;
  volumes: number | null;
  formatId: number;
  publisherId: number;
}

export interface Format {
  id: number;
  name: string;
}

export interface Publisher {
  id: number;
  name: string;
}
