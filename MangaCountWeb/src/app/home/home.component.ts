import {Component, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HousingLocationComponent} from '../housing-location/housing-location.component';
//import {HousingLocation} from '../housinglocation';
import {HousingService} from '../housing.service';
import {Routes} from '@angular/router';
import { Manga } from '../Manga';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HousingLocationComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {

  housingService: HousingService = inject(HousingService);
  housingLocationList: Manga[] = [];
  filteredLocationList: Manga[] = [];

  constructor() {
    this.housingService.getAllMangas().then((housingLocationList: Manga[]) => {
      debugger;
      this.housingLocationList = housingLocationList;
      this.filteredLocationList = housingLocationList;
    });
  }

  // filterResults(text: string) {
  //   if (!text) {
  //     this.filteredLocationList = this.housingLocationList;
  //     return;
  //   }
  //   this.filteredLocationList = this.housingLocationList.filter((housingLocation) =>
  //     housingLocation?.city.toLowerCase().includes(text.toLowerCase()),
  //   );
  // }
  
}