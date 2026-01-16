import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { Profile, ProfileCreateDto } from '../../../models/profile.model';

@Component({
  selector: 'app-profile-selection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-selection.component.html',
  styleUrls: ['./profile-selection.component.css']
})
export class ProfileSelectionComponent implements OnInit {
  profiles: Profile[] = [];
  showCreateModal = false;
  newProfile: ProfileCreateDto = { name: '' };
  selectedFile: File | null = null;
  loading = true;

  constructor(
    private profileService: ProfileService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProfiles();
  }

  loadProfiles(): void {
    this.profileService.getAllProfiles().subscribe({
      next: (profiles) => {
        this.profiles = profiles;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading profiles', error);
        this.loading = false;
      }
    });
  }

  selectProfile(profile: Profile): void {
    this.profileService.selectProfile(profile);
    this.router.navigate(['/collection']);
  }

  createProfile(): void {
    this.profileService.createOrUpdateProfile(this.newProfile).subscribe({
      next: (response) => {
        if (this.selectedFile) {
          // Upload picture if selected
          this.profileService.uploadProfilePicture(response.id, this.selectedFile).subscribe();
        }
        this.loadProfiles();
        this.closeCreateModal();
      },
      error: (error) => console.error('Error creating profile', error)
    });
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.newProfile = { name: '' };
    this.selectedFile = null;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  deleteProfile(profile: Profile, event: Event): void {
    event.stopPropagation();
    if (confirm(`¿Eliminar perfil "${profile.name}"?`)) {
      this.profileService.deleteProfile(profile.id).subscribe({
        next: () => this.loadProfiles(),
        error: (error) => console.error('Error deleting profile', error)
      });
    }
  }
}
