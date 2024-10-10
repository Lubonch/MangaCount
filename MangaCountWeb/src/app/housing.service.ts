import { Injectable } from '@angular/core';
//import {HousingLocation} from './housinglocation';
import { Manga } from './Manga';
import { Http } from '@angular/http';

@Injectable({
  providedIn: 'root'
})
export class HousingService {

  constructor(http: Http) { }

  async getAllMangas(): Promise<Manga[]> {
    debugger;
    // const data = await fetch(this.url+'GetAllMangas');
    // return (await data.json()) ?? [];

     return this.http.post(`${this.url}/GetAllMangas`)
             .map((response) => {
                 const result = response.json() as Promise<Manga[]>;
                 this.addToCache(result.Data);
                 return result;
             })
             .catch((err)=>this.handleError(err));
  }
  // async getAllHousingLocations(): Promise<HousingLocation[]> {
  //   const data = await fetch(this.url);
  //   debugger;
  //   return (await data.json()) ?? [];
  // }
  // async getHousingLocationById(id: number): Promise<HousingLocation | undefined> {
  //   const data = await fetch(`${this.url}/${id}`);
  //   return (await data.json()) ?? {};
  // }

  // submitApplication(firstName: string, lastName: string, email: string) {
  //   console.log(
  //     `Homes application received: firstName: ${firstName}, lastName: ${lastName}, email: ${email}.`,
  //   );
  // }
  readonly baseUrl = 'https://angular.dev/assets/images/tutorials/common';
  url = 'http://localhost:5123/';
}
