export interface Profile {
  id: number;
  name: string;
  profilePicture: string | null;
  createdDate: Date;
  isActive: boolean;
}

export interface ProfileCreateDto {
  id?: number;
  name: string;
  profilePicture?: string;
}
