import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

interface WeatherForecast {
  date: string;
  temperatureC: number;
  temperatureF: number;
  summary: string;
}
interface Manga {
  id: number;
  name: string;
  volumes: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  public forecasts: Manga[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.getForecasts();
  }

  getForecasts() {
    this.http.get<Manga[]>('/weatherforecast').subscribe(
      (result) => {
        this.forecasts = result;
        console.log(result);
        console.log(this.forecasts);
      },
      (error) => {
        console.error(error);
      }
    );
  }

  title = 'mangacount.client';
}
