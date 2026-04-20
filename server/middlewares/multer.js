import multer from 'multer';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public');
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + '-' + file.originalname;
    cb(null, filename);
  }
});


const upload = multer({ storage , limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

export default upload;