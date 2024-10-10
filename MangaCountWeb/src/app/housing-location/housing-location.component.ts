import {Component, Input} from '@angular/core';
import {CommonModule} from '@angular/common';
//import {HousingLocation} from '../housinglocation';
import { RouterModule } from '@angular/router';
import { Manga } from '../Manga';

@Component({
  selector: 'app-housing-location',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './housing-location.component.html',
  styleUrls: ['./housing-location.component.css'],
})
export class HousingLocationComponent {
  @Input() housingLocation!: Manga;
}
