import { Routes } from '@angular/router';
import { ProfileSelectedGuard } from './core/guards/profile-selected.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/profiles',
    pathMatch: 'full'
  },
  {
    path: 'profiles',
    loadComponent: () => import('./features/profile/profile-selection/profile-selection.component')
      .then(m => m.ProfileSelectionComponent)
  },
  {
    path: 'collection',
    loadComponent: () => import('./features/collection/collection-view/collection-view.component')
      .then(m => m.CollectionViewComponent),
    canActivate: [ProfileSelectedGuard]
  },
  {
    path: '**',
    redirectTo: '/profiles'
  }
];
