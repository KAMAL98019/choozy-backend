const express = require("express");
const multer = require("multer");
const path = require("path");
const uploadController = require("../controllers/upload.controller");



const router = express.Router();

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Route: Upload Image
router.post("/upload", upload.single("image"), uploadController.uploadImage);



module.exports = router;
