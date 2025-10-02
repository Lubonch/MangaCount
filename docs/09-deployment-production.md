# Deployment & Production Setup Guide

## Overview
This document provides comprehensive instructions for deploying the Angular MangaCount application to production, including build optimization, environment configuration, CI/CD pipeline setup, and monitoring implementation.

## Table of Contents
1. [Production Build Configuration](#production-build-configuration)
2. [Environment Management](#environment-management)
3. [CI/CD Pipeline Setup](#cicd-pipeline-setup)
4. [Docker Containerization](#docker-containerization)
5. [Cloud Deployment Options](#cloud-deployment-options)
6. [Monitoring & Logging](#monitoring--logging)
7. [Security Considerations](#security-considerations)
8. [Performance Monitoring](#performance-monitoring)

---

## Production Build Configuration

### Angular Build Optimization
```json
// angular.json - Production configuration
{
  "projects": {
    "mangacount-angular": {
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:browser",
          "options": {
            "outputPath": "dist/mangacount-angular",
            "index": "src/index.html",
            "main": "src/main.ts",
            "polyfills": "src/polyfills.ts",
            "tsConfig": "tsconfig.app.json",
            "assets": [
              "src/favicon.ico",
              "src/assets",
              "src/manifest.json"
            ],
            "styles": ["src/styles.scss"],
            "scripts": []
          },
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "2mb",
                  "maximumError": "5mb"
                },
                {
                  "type": "anyComponentStyle",
                  "maximumWarning": "6kb",
                  "maximumError": "10kb"
                }
              ],
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.prod.ts"
                }
              ],
              "outputHashing": "all",
              "sourceMap": false,
              "extractCss": true,
              "namedChunks": false,
              "extractLicenses": true,
              "vendorChunk": false,
              "buildOptimizer": true,
              "optimization": true,
              "aot": true,
              "serviceWorker": true,
              "ngswConfigPath": "ngsw-config.json"
            },
            "staging": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "3mb",
                  "maximumError": "6mb"
                }
              ],
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.staging.ts"
                }
              ],
              "optimization": true,
              "outputHashing": "all",
              "sourceMap": true,
              "extractCss": true,
              "namedChunks": true,
              "extractLicenses": true,
              "vendorChunk": true,
              "buildOptimizer": true,
              "aot": true
            }
          }
        }
      }
    }
  }
}
```

### Service Worker Configuration
```json
// ngsw-config.json
{
  "$schema": "./node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": [
          "/favicon.ico",
          "/index.html",
          "/manifest.json",
          "/*.css",
          "/*.js"
        ]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": [
          "/assets/**",
          "/*.(eot|svg|cur|jpg|png|webp|gif|otf|ttf|woff|woff2|ani)"
        ]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "api-performance",
      "urls": [
        "/api/profile",
        "/api/manga",
        "/api/publisher",
        "/api/format"
      ],
      "cacheConfig": {
        "strategy": "performance",
        "maxSize": 100,
        "maxAge": "1h"
      }
    },
    {
      "name": "api-freshness",
      "urls": [
        "/api/entry**"
      ],
      "cacheConfig": {
        "strategy": "freshness",
        "maxSize": 100,
        "maxAge": "10m"
      }
    }
  ]
}
```

### Build Scripts
```json
// package.json - Build scripts
{
  "scripts": {
    "build": "ng build",
    "build:prod": "ng build --configuration=production",
    "build:staging": "ng build --configuration=staging",
    "build:analyze": "ng build --configuration=production --stats-json && npx webpack-bundle-analyzer dist/mangacount-angular/stats.json",
    "prebuild:prod": "npm run lint && npm run test:ci",
    "postbuild:prod": "npm run bundle:analyze",
    "bundle:analyze": "npx webpack-bundle-analyzer dist/mangacount-angular/stats.json --mode=static --report=dist/bundle-report.html --open=false"
  }
}
```

---

## Environment Management

### Environment Configuration Files
```typescript
// src/environments/environment.ts (Development)
export const environment = {
  production: false,
  environmentName: 'development',
  apiUrl: 'http://localhost:5000/api',
  version: '2.0.0-dev',
  enableDevTools: true,
  enableAnalytics: false,
  enableErrorReporting: false,
  logLevel: 'debug',
  features: {
    enableOfflineMode: false,
    enablePushNotifications: false,
    enableAdvancedFilters: true,
    enableBulkOperations: true
  },
  cache: {
    defaultTtl: 300000, // 5 minutes
    maxSize: 100
  }
};

// src/environments/environment.staging.ts
export const environment = {
  production: false,
  environmentName: 'staging',
  apiUrl: 'https://staging-api.mangacount.com/api',
  version: '2.0.0-staging',
  enableDevTools: true,
  enableAnalytics: true,
  enableErrorReporting: true,
  logLevel: 'info',
  features: {
    enableOfflineMode: true,
    enablePushNotifications: false,
    enableAdvancedFilters: true,
    enableBulkOperations: true
  },
  cache: {
    defaultTtl: 600000, // 10 minutes
    maxSize: 200
  }
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  environmentName: 'production',
  apiUrl: 'https://api.mangacount.com/api',
  version: '2.0.0',
  enableDevTools: false,
  enableAnalytics: true,
  enableErrorReporting: true,
  logLevel: 'error',
  features: {
    enableOfflineMode: true,
    enablePushNotifications: true,
    enableAdvancedFilters: true,
    enableBulkOperations: true
  },
  cache: {
    defaultTtl: 1800000, // 30 minutes
    maxSize: 500
  }
};
```

### Runtime Configuration Service
```typescript
// src/app/core/services/config.service.ts
import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppConfig {
  apiUrl: string;
  features: {
    enableOfflineMode: boolean;
    enablePushNotifications: boolean;
    enableAdvancedFilters: boolean;
    enableBulkOperations: boolean;
  };
  cache: {
    defaultTtl: number;
    maxSize: number;
  };
  version: string;
  maintenance: {
    enabled: boolean;
    message?: string;
    estimatedEndTime?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private configSubject = new BehaviorSubject<AppConfig | null>(null);
  public config$ = this.configSubject.asObservable();

  constructor(private http: HttpClient) {}

  async loadConfig(): Promise<AppConfig> {
    try {
      // Try to load runtime configuration from server
      const serverConfig = await this.http.get<Partial<AppConfig>>('/api/config').toPromise();
      
      const config: AppConfig = {
        ...environment,
        ...serverConfig,
        features: {
          ...environment.features,
          ...serverConfig?.features
        },
        cache: {
          ...environment.cache,
          ...serverConfig?.cache
        }
      };

      this.configSubject.next(config);
      return config;
    } catch (error) {
      console.warn('Failed to load server config, using environment config:', error);
      
      const config: AppConfig = {
        ...environment,
        maintenance: { enabled: false }
      };
      
      this.configSubject.next(config);
      return config;
    }
  }

  get currentConfig(): AppConfig | null {
    return this.configSubject.value;
  }

  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    const config = this.currentConfig;
    return config?.features[feature] ?? false;
  }

  isMaintenanceMode(): boolean {
    const config = this.currentConfig;
    return config?.maintenance?.enabled ?? false;
  }
}
```

---

## CI/CD Pipeline Setup

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'
  DOCKER_REGISTRY: ghcr.io
  IMAGE_NAME: mangacount-angular

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run unit tests
      run: npm run test:ci
    
    - name: Run e2e tests
      run: npm run e2e:ci
    
    - name: Upload test coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    needs: test
    
    strategy:
      matrix:
        environment: [staging, production]
        include:
          - environment: staging
            branch: develop
          - environment: production
            branch: main
    
    if: github.ref == format('refs/heads/{0}', matrix.branch)
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build:${{ matrix.environment }}
    
    - name: Generate bundle analysis
      run: npm run bundle:analyze
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: dist-${{ matrix.environment }}
        path: dist/
        retention-days: 30
    
    - name: Build Docker image
      run: |
        docker build -t ${{ env.DOCKER_REGISTRY }}/${{ github.repository_owner }}/${{ env.IMAGE_NAME }}:${{ matrix.environment }}-${{ github.sha }} .
        docker tag ${{ env.DOCKER_REGISTRY }}/${{ github.repository_owner }}/${{ env.IMAGE_NAME }}:${{ matrix.environment }}-${{ github.sha }} ${{ env.DOCKER_REGISTRY }}/${{ github.repository_owner }}/${{ env.IMAGE_NAME }}:${{ matrix.environment }}-latest
    
    - name: Login to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.DOCKER_REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Push Docker image
      run: |
        docker push ${{ env.DOCKER_REGISTRY }}/${{ github.repository_owner }}/${{ env.IMAGE_NAME }}:${{ matrix.environment }}-${{ github.sha }}
        docker push ${{ env.DOCKER_REGISTRY }}/${{ github.repository_owner }}/${{ env.IMAGE_NAME }}:${{ matrix.environment }}-latest

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: staging
    
    steps:
    - name: Deploy to staging
      run: |
        echo "Deploying to staging environment..."
        # Add your staging deployment commands here
        # Example: kubectl, terraform, or cloud-specific CLI commands

  deploy-production:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
    - name: Deploy to production
      run: |
        echo "Deploying to production environment..."
        # Add your production deployment commands here
```

### GitLab CI/CD Configuration
```yaml
# .gitlab-ci.yml
image: node:18

stages:
  - test
  - build
  - deploy

cache:
  paths:
    - node_modules/

variables:
  DOCKER_REGISTRY: $CI_REGISTRY
  IMAGE_NAME: $CI_PROJECT_PATH

test:
  stage: test
  script:
    - npm ci
    - npm run lint
    - npm run test:ci
    - npm run e2e:ci
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/
    expire_in: 1 week

build-staging:
  stage: build
  only:
    - develop
  script:
    - npm ci
    - npm run build:staging
    - docker build -t $DOCKER_REGISTRY/$IMAGE_NAME:staging-$CI_COMMIT_SHA .
    - docker push $DOCKER_REGISTRY/$IMAGE_NAME:staging-$CI_COMMIT_SHA
  artifacts:
    paths:
      - dist/
    expire_in: 1 week

build-production:
  stage: build
  only:
    - main
  script:
    - npm ci
    - npm run build:prod
    - docker build -t $DOCKER_REGISTRY/$IMAGE_NAME:production-$CI_COMMIT_SHA .
    - docker push $DOCKER_REGISTRY/$IMAGE_NAME:production-$CI_COMMIT_SHA
  artifacts:
    paths:
      - dist/
    expire_in: 1 month

deploy-staging:
  stage: deploy
  only:
    - develop
  environment:
    name: staging
    url: https://staging.mangacount.com
  script:
    - echo "Deploying to staging..."
    # Add deployment commands

deploy-production:
  stage: deploy
  only:
    - main
  when: manual
  environment:
    name: production
    url: https://mangacount.com
  script:
    - echo "Deploying to production..."
    # Add deployment commands
```

---

## Docker Containerization

### Multi-stage Dockerfile
```dockerfile
# Dockerfile
# Stage 1: Build the Angular application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
ARG BUILD_CONFIGURATION=production
RUN npm run build:${BUILD_CONFIGURATION}

# Stage 2: Serve the application with nginx
FROM nginx:1.25-alpine AS production

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application from builder stage
COPY --from=builder /app/dist/mangacount-angular /usr/share/nginx/html

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1

# Expose port
EXPOSE 80

# Add metadata
LABEL maintainer="MangaCount Team"
LABEL version="2.0.0"
LABEL description="MangaCount Angular Application"

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # Performance settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        image/svg+xml;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;
        
        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
        
        # Handle Angular routing
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # Cache static assets
        location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Cache HTML files for short time
        location ~* \.(html)$ {
            expires 1h;
            add_header Cache-Control "public";
        }
        
        # Proxy API requests to backend
        location /api/ {
            proxy_pass http://backend-service:5000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
    }
}
```

### Docker Compose for Development
```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build:
      context: .
      args:
        BUILD_CONFIGURATION: staging
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    depends_on:
      - backend
    networks:
      - mangacount-network
    restart: unless-stopped
    
  backend:
    image: mangacount-server:latest
    ports:
      - "5000:5000"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=${DB_CONNECTION_STRING}
    depends_on:
      - database
    networks:
      - mangacount-network
    restart: unless-stopped
    
  database:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=${DB_PASSWORD}
    ports:
      - "1433:1433"
    volumes:
      - db_data:/var/opt/mssql
    networks:
      - mangacount-network
    restart: unless-stopped

networks:
  mangacount-network:
    driver: bridge

volumes:
  db_data:
```

---

## Cloud Deployment Options

### Azure Static Web Apps
```yaml
# .github/workflows/azure-static-web-apps.yml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy_job:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install and Build
        run: |
          npm ci
          npm run build:prod
      
      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          api_location: ""
          output_location: "dist/mangacount-angular"

  close_pull_request_job:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    name: Close Pull Request Job
    steps:
      - name: Close Pull Request
        id: closepullrequest
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: "close"
```

### AWS S3 + CloudFront Deployment
```typescript
// deploy/aws-deploy.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';

interface DeploymentConfig {
  bucketName: string;
  distributionId: string;
  region: string;
  distPath: string;
}

class AWSDeployer {
  private s3Client: S3Client;
  private cloudFrontClient: CloudFrontClient;

  constructor(private config: DeploymentConfig) {
    this.s3Client = new S3Client({ region: config.region });
    this.cloudFrontClient = new CloudFrontClient({ region: config.region });
  }

  async deploy(): Promise<void> {
    console.log('Starting deployment to AWS...');
    
    await this.uploadFiles();
    await this.invalidateCloudFront();
    
    console.log('Deployment completed successfully!');
  }

  private async uploadFiles(): Promise<void> {
    const files = this.getAllFiles(this.config.distPath);
    
    for (const file of files) {
      const key = path.relative(this.config.distPath, file).replace(/\\/g, '/');
      const body = fs.readFileSync(file);
      const contentType = mime.lookup(file) || 'application/octet-stream';
      
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: this.getCacheControl(file)
      });
      
      await this.s3Client.send(command);
      console.log(`Uploaded: ${key}`);
    }
  }

  private async invalidateCloudFront(): Promise<void> {
    const command = new CreateInvalidationCommand({
      DistributionId: this.config.distributionId,
      InvalidationBatch: {
        Paths: {
          Quantity: 1,
          Items: ['/*']
        },
        CallerReference: Date.now().toString()
      }
    });
    
    await this.cloudFrontClient.send(command);
    console.log('CloudFront invalidation created');
  }

  private getAllFiles(dir: string): string[] {
    const files: string[] = [];
    
    function traverse(currentDir: string) {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    }
    
    traverse(dir);
    return files;
  }

  private getCacheControl(filePath: string): string {
    const ext = path.extname(filePath);
    
    if (['.html'].includes(ext)) {
      return 'no-cache';
    } else if (['.js', '.css', '.png', '.jpg', '.gif', '.ico', '.svg'].includes(ext)) {
      return 'max-age=31536000'; // 1 year
    }
    
    return 'max-age=86400'; // 1 day
  }
}

// Usage
const config: DeploymentConfig = {
  bucketName: process.env.AWS_S3_BUCKET!,
  distributionId: process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID!,
  region: process.env.AWS_REGION || 'us-east-1',
  distPath: 'dist/mangacount-angular'
};

new AWSDeployer(config).deploy().catch(console.error);
```

---

## Monitoring & Logging

### Application Performance Monitoring
```typescript
// src/app/core/services/monitoring.service.ts
import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MonitoringService {
  private sessionId: string;
  private userId?: string;

  constructor(private router: Router) {
    this.sessionId = this.generateSessionId();
    this.setupRouteTracking();
    this.setupErrorHandling();
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  trackEvent(event: string, properties?: any): void {
    if (!environment.enableAnalytics) return;

    const eventData = {
      event,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        userId: this.userId,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    };

    this.sendToAnalytics(eventData);
  }

  trackError(error: Error | HttpErrorResponse, context?: string): void {
    if (!environment.enableErrorReporting) return;

    const errorData = {
      error: {
        message: error.message,
        stack: error instanceof Error ? error.stack : undefined,
        context,
        sessionId: this.sessionId,
        userId: this.userId,
        timestamp: new Date().toISOString(),
        url: window.location.href
      }
    };

    this.sendToErrorReporting(errorData);
  }

  trackPerformance(metric: string, value: number, unit: string = 'ms'): void {
    const performanceData = {
      metric,
      value,
      unit,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    this.sendToAnalytics({ event: 'performance', properties: performanceData });
  }

  private setupRouteTracking(): void {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.trackEvent('page_view', {
          page: event.urlAfterRedirects,
          title: document.title
        });
      }
    });
  }

  private setupErrorHandling(): void {
    window.addEventListener('error', (event) => {
      this.trackError(new Error(event.message), 'window.error');
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(new Error(event.reason), 'unhandled_promise_rejection');
    });
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private sendToAnalytics(data: any): void {
    // Send to Google Analytics, Mixpanel, or custom analytics service
    if (typeof gtag !== 'undefined') {
      gtag('event', data.event, data.properties);
    }

    // Send to custom analytics endpoint
    fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).catch(console.error);
  }

  private sendToErrorReporting(data: any): void {
    // Send to Sentry, Bugsnag, or custom error reporting service
    fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).catch(console.error);
  }
}
```

### Structured Logging
```typescript
// src/app/core/services/logger.service.ts
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private readonly logLevel: LogLevel;

  constructor() {
    this.logLevel = this.getLogLevel(environment.logLevel);
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.Debug, message, args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.Info, message, args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.Warn, message, args);
  }

  error(message: string, error?: Error, ...args: any[]): void {
    this.log(LogLevel.Error, message, [error, ...args]);
  }

  private log(level: LogLevel, message: string, args: any[]): void {
    if (level < this.logLevel) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      args,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Console logging
    const consoleMethod = this.getConsoleMethod(level);
    consoleMethod(`[${logEntry.timestamp}] [${logEntry.level}] ${message}`, ...args);

    // Send to remote logging service in production
    if (environment.production) {
      this.sendToRemoteLogger(logEntry);
    }
  }

  private getLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug': return LogLevel.Debug;
      case 'info': return LogLevel.Info;
      case 'warn': return LogLevel.Warn;
      case 'error': return LogLevel.Error;
      default: return LogLevel.Info;
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.Debug: return console.debug;
      case LogLevel.Info: return console.info;
      case LogLevel.Warn: return console.warn;
      case LogLevel.Error: return console.error;
    }
  }

  private sendToRemoteLogger(logEntry: any): void {
    fetch('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logEntry)
    }).catch(() => {
      // Fail silently to avoid infinite loops
    });
  }
}
```

---

## Security Considerations

### Content Security Policy
```typescript
// src/app/core/services/security.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  constructor() {
    this.setupCSP();
    this.setupSecurityHeaders();
  }

  private setupCSP(): void {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.mangacount.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');

    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = csp;
    document.head.appendChild(meta);
  }

  private setupSecurityHeaders(): void {
    // These should ideally be set by the server, but we can add some client-side
    document.addEventListener('DOMContentLoaded', () => {
      // Prevent clickjacking
      if (window.top !== window.self) {
        window.top!.location = window.self.location;
      }
    });
  }

  sanitizeInput(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  validateFileUpload(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'text/tab-separated-values'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    if (file.size > maxSize) {
      throw new Error(`File size ${file.size} exceeds maximum allowed size`);
    }

    return true;
  }
}
```

This comprehensive deployment guide ensures that the Angular MangaCount application can be successfully deployed to various environments with proper monitoring, security, and performance optimization in place.