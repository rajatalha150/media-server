# Personal Media Server - Complete Deployment Guide

## 📋 Overview

This media server lets you store, organize, and view photos/videos from any device. It works like a personal Netflix for your media with folder organization and slideshow features.

**What it does:**
- Stores your photos/videos in organized folders
- Plays them on any browser (laptop, tablet, TV)
- Automatic slideshow with configurable timing
- Simple login with code `2536`
- Drag & drop file uploads

---

## 🏗️ How the Application Works

### Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Client  │◄──►│   Node.js API    │◄──►│   PostgreSQL    │
│   (Frontend)    │    │   (Backend)      │    │   (Database)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         └─────────────►│  File System    │
                        │  (Media Files)  │
                        └─────────────────┘
```

### Components Explained

**1. Frontend (React)**
- `Login.js` - Simple code entry (2536)
- `MediaBrowser.js` - Main interface with folder navigation
- `MediaViewer.js` - Full-screen photo/video player
- `SlideshowControls.js` - Timer controls for slideshow

**2. Backend (Node.js)**
- `server.js` - Main API server, handles uploads/authentication
- `database.js` - Database connection (SQLite dev, PostgreSQL prod)
- File storage in `/media` folder

**3. Database**
- Tracks uploaded files and folder structure
- SQLite for testing, PostgreSQL for production

---

## 🚀 Deployment Options

## Option 1: Development Setup (Testing)

**Use this for:** Testing on your local machine

### Step 1: Install Dependencies
```bash
cd /home/raza/Desktop/media-server
npm install
cd client && npm install && cd ..
```

### Step 2: Build Frontend
```bash
cd client && npm run build && cd ..
```

### Step 3: Start Server
```bash
npm start
```

**Access:** `http://localhost:3000` with code `2536`

**What happens:**
- Uses SQLite database (creates `media.db` file)
- Stores files in local `media/` folder
- Perfect for testing before VM deployment

---

## Option 2: Production VM Deployment (Recommended)

**Use this for:** Running on your Proxmox VM permanently

### Prerequisites on VM
1. **Create Ubuntu/Debian VM in Proxmox**
   - Minimum: 2GB RAM, 20GB storage
   - Recommended: 4GB RAM, 100GB+ storage

2. **Install Docker**
```bash
sudo apt update
sudo apt install docker.io docker-compose git
sudo usermod -aG docker $USER
sudo systemctl enable docker
```

3. **Reboot VM**
```bash
sudo reboot
```

### Step 1: Transfer Files to VM
**Option A: Git Clone (if you have repository)**
```bash
git clone <your-repo-url>
cd media-server
```

**Option B: Direct Copy**
```bash
# On your local machine, copy files to VM
scp -r /home/raza/Desktop/media-server user@vm-ip:/home/user/
```

### Step 2: Deploy with Docker
```bash
cd media-server
docker-compose up -d
```

**What this does:**
- Builds the application in a container
- Starts PostgreSQL database
- Creates persistent storage volumes
- Runs on port 3000

### Step 3: Configure Firewall
```bash
sudo ufw allow 3000
sudo ufw enable
```

### Step 4: Access Your Server
- **URL:** `http://your-vm-ip:3000`
- **Login Code:** `2536`

---

## 🔧 Configuration Options

### Change Access Code
Edit `server.js`:
```javascript
const AUTH_CODE = 'your-new-code';
```

### Database Settings
Create `.env` file:
```bash
NODE_ENV=production
DB_HOST=postgres
DB_NAME=mediaserver
DB_USER=mediauser
DB_PASSWORD=your-secure-password
```

### Upload Limits
Edit `server.js`:
```javascript
limits: { fileSize: 500 * 1024 * 1024 }, // 500MB per file
```

---

## 📱 How to Use the Media Server

### 1. Login
- Open browser to `http://vm-ip:3000`
- Enter code: `2536`
- Click "Access Media Server"

### 2. Upload Media
- **Drag & Drop:** Drag files/folders to upload area
- **Click Upload:** Click upload area to select files
- **Supported:** JPG, PNG, GIF, HEIC, MP4, AVI, MOV, WebM, MKV

### 3. Organize with Folders
- Click "New Folder" button
- Enter folder name
- Upload files to specific folders

### 4. Navigate
- **Click folders** to browse inside
- **Breadcrumb navigation** at top to go back
- **Back button** to go up one level

### 5. View Media
- **Click any photo/video** to open full-screen viewer
- **Arrow keys** (←/→) to navigate between files
- **Spacebar** to start/stop slideshow
- **Escape** to close viewer

### 6. Slideshow Features
- **Bottom-right controls** to start slideshow
- **Adjust timing** from 1-60 seconds
- **Works in viewer** and main interface
- **Auto-advances** through photos (pauses on videos)

---

## 🛠️ Troubleshooting

### Server Won't Start
```bash
# Check if port 3000 is in use
sudo netstat -tlnp | grep 3000

# Kill process if needed
sudo kill -9 <process-id>
```

### Can't Access from Other Devices
```bash
# Check firewall
sudo ufw status

# Allow port 3000
sudo ufw allow 3000
```

### Database Connection Issues
```bash
# Check Docker containers
docker-compose ps

# View logs
docker-compose logs media-server
docker-compose logs postgres
```

### Upload Fails
- Check file size (max 500MB per file)
- Verify file format is supported
- Check disk space: `df -h`

### Performance Issues
```bash
# Check system resources
htop

# Restart services
docker-compose restart
```

---

## 🔒 Security Features

### Built-in Protection
- **Rate limiting:** 100 requests per 15 minutes
- **File validation:** Only allows media files
- **Path protection:** Prevents directory traversal
- **Helmet.js:** Security headers

### Additional Security (Optional)
```bash
# Change default SSH port
sudo nano /etc/ssh/sshd_config
# Port 2222

# Setup fail2ban
sudo apt install fail2ban

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 3000
```

---

## 📊 Monitoring & Maintenance

### Check Status
```bash
# Container status
docker-compose ps

# View logs
docker-compose logs -f media-server

# Database size
docker exec -it media-server_postgres_1 psql -U mediauser -d mediaserver -c "SELECT pg_size_pretty(pg_database_size('mediaserver'));"
```

### Backup Data
```bash
# Backup media files
tar -czf media-backup-$(date +%Y%m%d).tar.gz media/

# Backup database
docker exec media-server_postgres_1 pg_dump -U mediauser mediaserver > backup-$(date +%Y%m%d).sql
```

### Updates
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

---

## 🎯 Performance Tips

### For Large Media Libraries
1. **Increase VM resources:** 4GB+ RAM, SSD storage
2. **Optimize PostgreSQL:**
```bash
# Edit docker-compose.yml, add to postgres environment:
- POSTGRES_SHARED_BUFFERS=256MB
- POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
```

### For TV Viewing
- Use Chrome/Firefox on TV browser
- Enable full-screen mode (F11)
- Use wireless keyboard for navigation

### Network Optimization
- Use wired connection for VM
- Consider CDN for remote access
- Enable gzip compression (already included)

---

## 📞 Quick Reference

### Important Files
- `server.js` - Main server configuration
- `docker-compose.yml` - Production deployment
- `client/src/` - Frontend React code
- `media/` - Your uploaded files
- `.env` - Environment configuration

### Default Settings
- **Port:** 3000
- **Login Code:** 2536
- **Upload Limit:** 500MB per file
- **Database:** PostgreSQL (production), SQLite (development)

### Useful Commands
```bash
# Start development
npm run dev

# Production deployment
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart
```

---

## ✅ Success Checklist

After deployment, verify:
- [ ] Can access `http://vm-ip:3000`
- [ ] Login with code `2536` works
- [ ] Can upload photos and videos
- [ ] Can create folders
- [ ] Slideshow works with configurable timing
- [ ] Media viewer opens and navigates properly
- [ ] Works on different devices (laptop, tablet, TV)

**🎉 Your personal media server is now ready!**