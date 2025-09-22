# Personal Media Server

A modern, responsive media server for viewing images and videos with slideshow functionality, folder organization, and multi-format support.

## Features

- **Simple Authentication**: Access with code `2536`
- **Multi-format Support**: Images (JPG, PNG, GIF, HEIC, WebP) and Videos (MP4, AVI, MOV, WebM, MKV, etc.)
- **Folder Management**: Create folders and organize media
- **Slideshow**: Configurable timing (1-60 seconds)
- **Drag & Drop Upload**: Easy file and folder uploads
- **Responsive Design**: Works on laptops, tablets, and TV browsers
- **Database Options**: SQLite (development) and PostgreSQL (production)

## Quick Start

### Development (SQLite)

1. Install dependencies:
```bash
npm install
cd client && npm install && cd ..
```

2. Start development server:
```bash
npm run dev
```

3. Build client:
```bash
cd client && npm run build && cd ..
```

4. Access at `http://localhost:3000` with code `2536`

### Production (Docker + PostgreSQL)

1. Deploy with Docker Compose:
```bash
docker-compose up -d
```

2. Access at `http://your-vm-ip:3000` with code `2536`

## VM Deployment on Proxmox

1. Create Ubuntu/Debian VM
2. Install Docker and Docker Compose:
```bash
sudo apt update
sudo apt install docker.io docker-compose
sudo usermod -aG docker $USER
```

3. Clone/copy project files to VM
4. Run: `docker-compose up -d`
5. Configure firewall to allow port 3000

## Usage

- **Login**: Enter code `2536`
- **Upload**: Drag files to upload area or click to select
- **Navigate**: Click folders to browse, use breadcrumb to go back
- **View Media**: Click any image/video to open viewer
- **Slideshow**: Use controls in bottom-right or spacebar in viewer
- **Keyboard Shortcuts**: 
  - `←/→`: Navigate media
  - `Space`: Toggle slideshow
  - `Esc`: Close viewer

## Supported Formats

**Images**: JPG, JPEG, PNG, GIF, BMP, WebP, HEIC
**Videos**: MP4, AVI, MOV, WMV, FLV, WebM, MKV, M4V, 3GP

## Configuration

- Change access code in `server.js` (AUTH_CODE variable)
- Database settings in `.env` file
- Upload limits in `server.js` (currently 500MB per file)

## Security

- Rate limiting (100 requests per 15 minutes)
- Helmet.js security headers
- File type validation
- Path traversal protection