const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 📁 Create upload folder if not exists
const uploadPath = path.join(__dirname, "../uploads/restaurants");
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

// 🧰 Storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const baseName = file.fieldname.replace(/\s+/g, "_"); // e.g. rest_logo
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

// ✅ File filter (allow only images + PDFs)
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|pdf|webp/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) cb(null, true);
  else cb(new Error("Only image or PDF files are allowed"), false);
};

// 🚀 Final multer instance
const uploadRestaurant = multer({ storage, fileFilter });

module.exports = uploadRestaurant;
