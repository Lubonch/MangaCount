export interface Profile {
  id: number;
  name: string;
  createdDate: string;
  isActive: boolean;
}

export interface Manga {
  id: number;
  profileId: number;
  title: string;
  purchased: number;
  total: string;
  pending: string;
  complete: boolean;
  priority: boolean;
  format: string;
  publisher: string;
  imageUrl?: string;
  createdDate: string;
  updatedDate?: string;
}

export interface CreateMangaRequest {
  profileId: number;
  title: string;
  purchased: number;
  total: string;
  pending?: string;
  complete: boolean;
  priority: boolean;
  format?: string;
  publisher?: string;
  imageUrl?: string;
}

export interface UpdateMangaRequest {
  title: string;
  purchased: number;
  total: string;
  pending?: string;
  complete: boolean;
  priority: boolean;
  format?: string;
  publisher?: string;
  imageUrl?: string;
}

export interface CollectionStats {
  totalSeries: number;
  completeSeries: number;
  incompleteSeries: number;
  totalVolumes: number;
  highPrioritySeries: number;
  uniquePublishers: number;
  formatDistribution: { [key: string]: number };
}

export interface ImportResult {
  importedCount: number;
  errors: string[];
  success: boolean;
}
