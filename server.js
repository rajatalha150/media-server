const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mime = require('mime-types');
const { v4: uuidv4 } = require('uuid');
const Database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_CODE = '2536';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline styles for media player
}));
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Initialize database
const db = new Database();

// Ensure media directory exists
const MEDIA_DIR = path.join(__dirname, 'media');
const THUMBS_DIR = path.join(__dirname, 'thumbnails');

async function ensureDirectories() {
  try {
    await fs.mkdir(MEDIA_DIR, { recursive: true });
    await fs.mkdir(THUMBS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating directories:', error);
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const folderPath = req.body.folderPath || '';
    console.log('Upload to folder:', folderPath);
    const uploadPath = path.join(MEDIA_DIR, folderPath);
    await fs.mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(jpg|jpeg|png|gif|bmp|webp|heic|mp4|avi|mov|wmv|flv|webm|mkv|m4v|3gp)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${AUTH_CODE}`) {
    return res.status(401).json({ error: 'Invalid authentication code' });
  }
  next();
};

// Serve static files
app.use('/media', express.static(MEDIA_DIR));
app.use('/thumbnails', express.static(THUMBS_DIR));
app.use(express.static(path.join(__dirname, 'client/build')));

// Routes
app.post('/api/auth', (req, res) => {
  const { code } = req.body;
  if (code === AUTH_CODE) {
    res.json({ success: true, token: AUTH_CODE });
  } else {
    res.status(401).json({ error: 'Invalid code' });
  }
});

app.get('/api/folders', authenticate, async (req, res) => {
  try {
    const folderPath = req.query.path || '';
    const fullPath = path.join(MEDIA_DIR, folderPath);
    const items = await fs.readdir(fullPath, { withFileTypes: true });
    
    const folders = [];
    const files = [];
    
    for (const item of items) {
      if (item.isDirectory()) {
        folders.push({
          name: item.name,
          type: 'folder',
          path: path.join(folderPath, item.name).replace(/\\/g, '/')
        });
      } else {
        const filePath = path.join(folderPath, item.name).replace(/\\/g, '/');
        const mimeType = mime.lookup(item.name);
        const isVideo = mimeType && mimeType.startsWith('video/');
        const isImage = mimeType && mimeType.startsWith('image/');
        
        if (isVideo || isImage) {
          files.push({
            name: item.name,
            type: isVideo ? 'video' : 'image',
            path: filePath,
            url: `/media/${filePath}`,
            mimeType
          });
        }
      }
    }
    
    res.json({ folders, files, currentPath: folderPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/folders', authenticate, async (req, res) => {
  try {
    const { name, parentPath = '' } = req.body;
    const folderPath = path.join(MEDIA_DIR, parentPath, name);
    await fs.mkdir(folderPath, { recursive: true });
    res.json({ success: true, path: path.join(parentPath, name).replace(/\\/g, '/') });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', authenticate, upload.array('files'), async (req, res) => {
  try {
    const files = req.files.map(file => ({
      name: file.originalname,
      path: path.relative(MEDIA_DIR, file.path).replace(/\\/g, '/'),
      url: `/media/${path.relative(MEDIA_DIR, file.path).replace(/\\/g, '/')}`
    }));
    res.json({ success: true, files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete single file
app.delete('/api/files', authenticate, async (req, res) => {
  try {
    const { filePath } = req.body;
    const fullPath = path.join(MEDIA_DIR, filePath);
    await fs.unlink(fullPath);
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete multiple files
app.delete('/api/files/bulk', authenticate, async (req, res) => {
  try {
    const { filePaths } = req.body;
    const results = [];

    for (const filePath of filePaths) {
      try {
        const fullPath = path.join(MEDIA_DIR, filePath);
        await fs.unlink(fullPath);
        results.push({ path: filePath, success: true });
      } catch (error) {
        results.push({ path: filePath, success: false, error: error.message });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all files in current folder
app.delete('/api/files/all', authenticate, async (req, res) => {
  try {
    const { folderPath = '' } = req.body;
    const fullPath = path.join(MEDIA_DIR, folderPath);
    const items = await fs.readdir(fullPath, { withFileTypes: true });

    const results = [];
    for (const item of items) {
      if (item.isFile()) {
        try {
          const filePath = path.join(fullPath, item.name);
          await fs.unlink(filePath);
          results.push({ name: item.name, success: true });
        } catch (error) {
          results.push({ name: item.name, success: false, error: error.message });
        }
      }
    }

    res.json({ success: true, results, deletedCount: results.filter(r => r.success).length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Catch all handler for React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

// Start server
async function startServer() {
  await ensureDirectories();
  await db.init();
  
  app.listen(PORT, () => {
    console.log(`Media server running on port ${PORT}`);
    console.log(`Access code: ${AUTH_CODE}`);
  });
}

startServer().catch(console.error);