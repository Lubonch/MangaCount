# MangaCount - Manga Collection Manager

A modern web application for managing your manga collection, built with .NET 8 and React. Track your reading progress, organize your collection, and manage multiple user profiles.

![Build Status](https://github.com/Lubonch/MangaCount/actions/workflows/ci-with-coverage.yml/badge.svg)

## Features

- **Manga Collection Management** - Add, edit, and organize your manga library
- **Multi-Profile Support** - Create and switch between different user profiles  
- **Reading Progress Tracking** - Keep track of volumes read and reading status
- **Modern UI** - Clean, responsive React interface with theme support
- **Robust Architecture** - .NET 8 backend with Dapper ORM
- **Full Test Coverage** - Comprehensive testing with automated CI/CD

## Technology Stack

- **Backend**: ASP.NET Core 8.0 Web API
- **Frontend**: React 19 with Vite
- **Database**: SQL Server with Dapper ORM
- **Testing**: xUnit (.NET) + Vitest (React)
- **CI/CD**: GitHub Actions with automated testing and coverage reports

## Prerequisites

### Required Software
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 20+](https://nodejs.org/) (with npm)
- [SQL Server](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) (Express/LocalDB recommended)
- [Visual Studio 2022](https://visualstudio.microsoft.com/) or [VS Code](https://code.visualstudio.com/)

### Development Tools (Optional)
- [SQL Server Management Studio (SSMS)](https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms)
- [Postman](https://www.postman.com/) for API testing

## Database Setup

### Database Configuration
- **Server**: `localhost` (local SQL Server instance)
- **Database Name**: `MangaCount`
- **Authentication**: Windows Integrated Security

### Restore from Backup
A pre-configured database backup is included in the repository at `databasebackup/backup.bak`.

#### Using SQL Server Management Studio (SSMS):
1. Open SSMS and connect to your local SQL Server instance
2. Right-click "Databases" → "Restore Database..."
3. Select "Device" and click the "..." button
4. Click "Add" and navigate to `[repo-root]/databasebackup/backup.bak`
5. Click "OK" to restore
6. Verify the database name is set to "MangaCount"

#### Using T-SQL Command:
Open a new query window in SSMS and execute:

```
RESTORE DATABASE [MangaCount] FROM DISK = 'C:\path\to\your\repo\databasebackup\backup.bak' WITH REPLACE;
```

Replace `C:\path\to\your\repo` with the actual path to your repository folder.

## Getting Started

### 1. Clone the Repository

```
git clone https://github.com/Lubonch/MangaCount.git
cd MangaCount
```

### 2. Backend Setup

Navigate to the server project
```
cd MangaCount.Server
```
Restore .NET packages
```
dotnet restore
```
Build the project
```
dotnet build
```

### 3. Frontend Setup

Navigate to the client project
```
cd mangacount.client
```
Install npm packages
```
npm install
```

## Running the Application

### Using Visual Studio (Recommended)
1. Open `MangaCount.sln` in Visual Studio 2022
2. Set `MangaCount.Server` as the startup project (right-click → "Set as Startup Project")
3. Press `F5` or click "Start"
4. The application will automatically start both backend and frontend

### Using Command Line

Terminal 1: Start the backend
```
cd MangaCount.Server
dotnet run
```
Terminal 2: Start the frontend
```
cd mangacount.client npm run dev
```

## Application URLs

- **Frontend**: https://localhost:63920
- **Backend API**: https://localhost:7253  
- **Swagger Documentation**: https://localhost:7253/swagger (Development only)

## API Documentation

### Main Endpoints
- `GET /api/manga` - Get all manga
- `POST /api/manga` - Create new manga
- `PUT /api/manga/{id}` - Update manga
- `GET /api/profile` - Get all profiles
- `POST /api/profile` - Create new profile
- `GET /api/entry` - Get reading entries
- `POST /api/entry` - Create new entry

### Swagger Documentation
Available at `https://localhost:7253/swagger` during development.

## Troubleshooting

### Common Issues

#### Database Connection Issues
- Verify SQL Server is running and accessible
- Check connection string in `appsettings.json`
- Test connection with SSMS using the same credentials

#### "Unable to start debugging" Error
- Set `MangaCount.Server` as the startup project in Visual Studio

#### Frontend Build Issues
```
cd mangacount.client
rm -rf node_modules package-lock.json
npm install
```

#### HTTPS Certificate Issues
```
dotnet dev-certs https --trust
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`dotnet test && cd mangacount.client && npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

Please review our [Security Policy](SECURITY.md) for security best practices and vulnerability reporting.

## Security

We take security seriously. If you discover a security vulnerability, please review our [Security Policy](SECURITY.md) for information on how to report it responsibly.

## License

This project is licensed under the MIT License.

































