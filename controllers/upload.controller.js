const path = require("path");
const { Image } = require("../models");

// Upload Controller
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    const image = await Image.create({
      filename: req.file.filename,
      url: fileUrl
    });

    res.json({ success: true, url: image.url });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
};
