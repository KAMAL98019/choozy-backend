const { Cuisine } = require('../models');

exports.create = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Cuisine name is required"
      });
    }

    // Check if cuisine already exists (case-insensitive)
    const existing = await Cuisine.findOne({
      where: { name: name.trim() }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Cuisine already exists"
      });
    }

    const cuisine = await Cuisine.create({ name: name.trim() });

    return res.status(201).json({
      success: true,
      message: "Cuisine created successfully",
      data: cuisine
    });
  } catch (err) {
    console.error("Create Cuisine Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};


exports.getAll = async (req, res) => {
  try {
    const cuisines = await Cuisine.findAll();
    res.json({ success: true, data: cuisines });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const cuisine = await Cuisine.findByPk(req.params.id);
    if (!cuisine) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: cuisine });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const cuisine = await Cuisine.findByPk(req.params.id);
    if (!cuisine) return res.status(404).json({ success: false, message: 'Not found' });
    await cuisine.update({ name: req.body.name });
    res.json({ success: true, data: cuisine });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const cuisine = await Cuisine.findByPk(req.params.id);
    if (!cuisine) return res.status(404).json({ success: false, message: 'Not found' });
    await cuisine.destroy();
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
