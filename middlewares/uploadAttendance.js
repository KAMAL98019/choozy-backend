const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Upload folder
const uploadPath = path.join(__dirname, "../uploads/attendance");
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

// Optional file filter (image only)
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};

const uploadAttendance = multer({ storage, fileFilter });

module.exports = uploadAttendance;
