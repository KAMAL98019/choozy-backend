const { Category } = require('../../models');

exports.create = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required"
      });
    }

    // Check if category already exists (case-insensitive)
    const existing = await Category.findOne({
      where: { name: name.trim() }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Category already exists"
      });
    }

    const category = await Category.create({ name: name.trim() });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category
    });
  } catch (err) {
    console.error("Create Category Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.getAll = async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Not found' });
    await category.update({ name: req.body.name });
    res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Not found' });
    await category.destroy();
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
