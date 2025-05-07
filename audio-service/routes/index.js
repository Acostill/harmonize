var express = require('express');
var router = express.Router();

const fs = require('fs');
const path = require('path');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

//get tracks from a directory
router.get('/list-audio/:dir', async (req, res) => {
  try {
    const dir = req.params.dir;

    // replace %20 with space
    // const urlStringToPath = path.replace(/%20/g, ' ');
    const songsDir = path.resolve(__dirname, `../resources/songs/${dir}`);
    // const songsDir = `./resources/songs/${path}`;
    const files = await fs.promises.readdir(songsDir);
    // Optional: Filter for only audio files
    const audioFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext === '.mp3' || ext === '.wav';
    });
    res.json(audioFiles);
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to list files');
  }
});

router.get('/songs', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/song/:id', async (req, res) => {
  try {
    const fileName = req.params.id;
    const songsDir = path.resolve(__dirname, '../resources/songs');
    const filePath = path.join(songsDir, fileName);
    const stat = await fs.promises.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const ext = path.extname(fileName).toLowerCase();
    const contentType = ext === '.mp3' ? 'audio/mpeg' : ext === '.wav' ? 'audio/wav' : 'application/octet-stream';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      if (start >= fileSize) {
        res.status(416).send(`Requested range not satisfiable\n${start} >= ${fileSize}`);
        return;
      }
      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error(err);
    res.status(404).send('File not found');
  }
});

router.post('/song', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/track', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
