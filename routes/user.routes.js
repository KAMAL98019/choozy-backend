const express = require("express");
const router = express.Router();
const userCtrl = require("../controllers/user.controller");
const upload = require("../middlewares/upload"); // multer config file

// 👇 Create User — NO photo upload
router.post("/", userCtrl.createUser);

// Get all users
router.get("/", userCtrl.getUsers);

// Get user by ID
router.get("/:id", userCtrl.getUserById);

// 👇 Update User — photo upload allowed here only
router.put("/:id", upload.single("profilePhoto"), userCtrl.updateUser);

// Delete user
router.delete("/:id", userCtrl.deleteUser);

module.exports = router;
