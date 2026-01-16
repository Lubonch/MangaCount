import { Manga } from './manga.model';

export interface Entry {
  id: number;
  mangaId: number;
  manga: Manga;
  profileId: number;
  quantity: number;
  pending: string | null;
  priority: boolean;
}

export interface EntryCreateDto {
  id?: number;
  mangaId: number;
  profileId: number;
  quantity: number;
  pending?: string;
  priority: boolean;
}
