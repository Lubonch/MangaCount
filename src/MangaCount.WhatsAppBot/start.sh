#!/bin/bash

# MangaCount WhatsApp Bot Startup Script
# This script helps start both the API and WhatsApp bot in the correct order

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for API to be ready
wait_for_api() {
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for API to be ready on localhost:5000..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f http://localhost:5000/api/profiles >/dev/null 2>&1; then
            print_success "API is ready!"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts - API not ready yet..."
        sleep 2
        ((attempt++))
    done
    
    print_error "API failed to start after $max_attempts attempts (60 seconds)"
    return 1
}

# Function to start the .NET API
start_api() {
    print_status "Starting MangaCount .NET API..."
    
    # Check if API is already running
    if check_port 5000; then
        print_warning "Port 5000 is already in use. Checking if it's the MangaCount API..."
        if curl -s -f http://localhost:5000/api/profiles >/dev/null 2>&1; then
            print_success "MangaCount API is already running on port 5000"
            return 0
        else
            print_error "Something else is running on port 5000. Please free the port and try again."
            return 1
        fi
    fi
    
    # Navigate to API directory
    cd "$(dirname "$0")/../MangaCount.API"
    
    if [ ! -f "MangaCount.API.csproj" ]; then
        print_error "MangaCount.API.csproj not found. Make sure you're running the script from the correct location."
        return 1
    fi
    
    # Start API in background
    print_status "Building and starting .NET API..."
    nohup dotnet run > ../../MangaCount.WhatsAppBot/logs/api.log 2>&1 &
    API_PID=$!
    
    # Save PID for later cleanup
    echo $API_PID > ../../MangaCount.WhatsAppBot/logs/api.pid
    
    print_success "API started with PID: $API_PID"
    
    # Wait for API to be ready
    wait_for_api
}

# Function to start the WhatsApp bot
start_bot() {
    print_status "Starting MangaCount WhatsApp Bot..."
    
    # Navigate to bot directory
    cd "$(dirname "$0")"
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Make sure you're in the WhatsApp bot directory."
        return 1
    fi
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_status "node_modules not found. Installing dependencies..."
        npm install
    fi
    
    # Check environment file
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from template..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_warning "Please edit .env file with your configuration before running the bot."
        else
            print_error ".env.example not found. Please create .env manually."
            return 1
        fi
    fi
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Start the bot
    print_status "Starting WhatsApp bot..."
    print_status "A QR code will appear shortly. Scan it with WhatsApp to connect the bot."
    node index.js
}

# Function to cleanup on exit
cleanup() {
    print_status "Cleaning up..."
    
    # Kill API if we started it
    if [ -f "logs/api.pid" ]; then
        API_PID=$(cat logs/api.pid)
        if kill -0 $API_PID 2>/dev/null; then
            print_status "Stopping API (PID: $API_PID)..."
            kill $API_PID
            sleep 2
            
            # Force kill if still running
            if kill -0 $API_PID 2>/dev/null; then
                print_warning "Force stopping API..."
                kill -9 $API_PID
            fi
        fi
        rm -f logs/api.pid
    fi
    
    print_success "Cleanup completed"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
  -h, --help     Show this help message
  -a, --api-only Start only the API
  -b, --bot-only Start only the WhatsApp bot (assumes API is already running)
  --no-api       Start bot without starting API (for external API)

Examples:
  $0                 # Start both API and bot
  $0 --api-only      # Start only the API
  $0 --bot-only      # Start only the bot
  $0 --no-api        # Start bot assuming API is external

Notes:
  - The script will automatically check if the API is already running
  - Press Ctrl+C to stop both services
  - Logs are saved in the logs/ directory
  - Make sure to edit .env file with your configuration
EOF
}

# Main execution
main() {
    print_success "🚀 MangaCount WhatsApp Bot Launcher"
    echo
    
    # Parse command line arguments
    START_API=true
    START_BOT=true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -a|--api-only)
                START_BOT=false
                shift
                ;;
            -b|--bot-only)
                START_API=false
                shift
                ;;
            --no-api)
                START_API=false
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Set up cleanup trap
    trap cleanup EXIT INT TERM
    
    # Start services
    if [ "$START_API" = true ]; then
        start_api || exit 1
        echo
    fi
    
    if [ "$START_BOT" = true ]; then
        start_bot
    else
        print_success "API is running. You can now start the bot manually with: node index.js"
        print_status "Press Ctrl+C to stop the API"
        wait  # Wait indefinitely
    fi
}

# Run main function with all arguments
main "$@"