const { FoodItem, Cuisine, Category } = require('../models');
const { Op } = require('sequelize');

// 🧩 Create Food Item
exports.create = async (req, res) => {
  try {
    // If an image was uploaded, attach full URL
    if (req.file) {
      req.body.dishimage = `${req.protocol}://${req.get('host')}/uploads/food/${req.file.filename}`;
    }

    const item = await FoodItem.create(req.body);

    const newItem = await FoodItem.findByPk(item.id, {
      include: [
        { model: Cuisine, as: 'cuisine', attributes: ['id', 'name'] },
        { model: Category, as: 'category', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    console.error('Create FoodItem Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🧩 Get All Food Items
exports.getAll = async (req, res) => {
  try {
    const { restaurantId, cuisineId, categoryId, search, veg } = req.query;
    const condition = {};

    if (restaurantId) condition.rest_id = restaurantId;
    if (cuisineId) condition.cuisineId = cuisineId;
    if (categoryId) condition.categoryId = categoryId;
    if (veg !== undefined) condition.veg = veg === 'true';
    if (search) {
      condition[Op.or] = [{ dishname: { [Op.like]: `%${search}%` } }];
    }

    const items = await FoodItem.findAll({
      where: condition,
      include: [
        { model: Cuisine, as: 'cuisine', attributes: ['id', 'name'] },
        { model: Category, as: 'category', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error('GetAll FoodItems Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🧩 Get Food Item by ID
exports.getById = async (req, res) => {
  try {
    const item = await FoodItem.findByPk(req.params.id, {
      include: [
        { model: Cuisine, as: 'cuisine', attributes: ['id', 'name'] },
        { model: Category, as: 'category', attributes: ['id', 'name'] }
      ]
    });

    if (!item) return res.status(404).json({ success: false, message: 'Food item not found' });

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error('GetById FoodItem Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🧩 Update Food Item
exports.update = async (req, res) => {
  try {
    if (req.file) {
      req.body.dishimage = `${req.protocol}://${req.get('host')}/uploads/food/${req.file.filename}`;
    }

    const [updated] = await FoodItem.update(req.body, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, message: 'Food item not found' });

    const updatedItem = await FoodItem.findByPk(req.params.id, {
      include: [
        { model: Cuisine, as: 'cuisine', attributes: ['id', 'name'] },
        { model: Category, as: 'category', attributes: ['id', 'name'] }
      ]
    });

    res.status(200).json({ success: true, data: updatedItem });
  } catch (error) {
    console.error('Update FoodItem Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🧩 Delete Food Item
exports.remove = async (req, res) => {
  try {
    const deleted = await FoodItem.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ success: false, message: 'Food item not found' });

    res.status(200).json({ success: true, message: 'Food item deleted successfully' });
  } catch (error) {
    console.error('Delete FoodItem Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
