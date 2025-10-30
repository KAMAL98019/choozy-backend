const { FoodItem, Cuisine, Category } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Helper to build full URL
const getImageUrl = (req, filename) =>
  filename ? `${req.protocol}://${req.get('host')}${filename}` : null;

// ------------------- Create Food Item -------------------
exports.create = async (req, res) => {
  try {
    console.log("REQ.FILE:", req.file); // debug

    if (req.file) req.body.dishimage = `/uploads/food/${req.file.filename}`;

    const item = await FoodItem.create(req.body);

    const newItem = await FoodItem.findByPk(item.id, {
      include: [
        { model: Cuisine, as: 'cuisine', attributes: ['id', 'name'] },
        { model: Category, as: 'category', attributes: ['id', 'name'] },
      ],
    });

    const result = { ...newItem.toJSON(), dishimage: getImageUrl(req, newItem.dishimage) };
    res.status(201).json({ success: true, message: 'Food item created successfully', data: result });
  } catch (error) {
    console.error('Create FoodItem Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create food item', error: error.message });
  }
};

// ------------------- Update Food Item -------------------
exports.update = async (req, res) => {
  try {
    const item = await FoodItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Food item not found' });

    // Delete old image if a new one is uploaded
    if (req.file) {
      if (item.dishimage) {
        const oldPath = path.join(__dirname, '..', item.dishimage);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      req.body.dishimage = `/uploads/food/${req.file.filename}`;
    }

    await item.update(req.body);

    const updatedItem = await FoodItem.findByPk(req.params.id, {
      include: [
        { model: Cuisine, as: 'cuisine', attributes: ['id', 'name'] },
        { model: Category, as: 'category', attributes: ['id', 'name'] },
      ],
    });

    const result = { ...updatedItem.toJSON(), dishimage: getImageUrl(req, updatedItem.dishimage) };
    res.status(200).json({ success: true, message: 'Food item updated successfully', data: result });
  } catch (error) {
    console.error('Update FoodItem Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update food item', error: error.message });
  }
};


// ------------------- Get All Food Items -------------------
exports.getAll = async (req, res) => {
  try {
    const { restaurantId, cuisineId, categoryId, search, veg } = req.query;
    const condition = {};

    if (restaurantId) condition.rest_id = restaurantId;
    if (cuisineId) condition.cuisineId = cuisineId;
    if (categoryId) condition.categoryId = categoryId;
    if (veg !== undefined) condition.veg = veg === 'true';
    if (search) condition[Op.or] = [{ dishname: { [Op.like]: `%${search}%` } }];

    const items = await FoodItem.findAll({
      where: condition,
      include: [
        { model: Cuisine, as: 'cuisine', attributes: ['id', 'name'] },
        { model: Category, as: 'category', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    const results = items.map(item => ({ ...item.toJSON(), dishimage: getImageUrl(req, item.dishimage) }));

    res.status(200).json({ success: true, message: 'Food items fetched successfully', data: results });
  } catch (error) {
    console.error('GetAll FoodItems Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch food items', error: error.message });
  }
};

// ------------------- Get Food Item by ID -------------------
exports.getById = async (req, res) => {
  try {
    const item = await FoodItem.findByPk(req.params.id, {
      include: [
        { model: Cuisine, as: 'cuisine', attributes: ['id', 'name'] },
        { model: Category, as: 'category', attributes: ['id', 'name'] },
      ],
    });

    if (!item) return res.status(404).json({ success: false, message: 'Food item not found' });

    const result = { ...item.toJSON(), dishimage: getImageUrl(req, item.dishimage) };
    res.status(200).json({ success: true, message: 'Food item fetched successfully', data: result });
  } catch (error) {
    console.error('GetById FoodItem Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch food item', error: error.message });
  }
};

// ------------------- Delete Food Item -------------------
exports.remove = async (req, res) => {
  try {
    const item = await FoodItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Food item not found' });

    // Delete image from server
    if (item.dishimage) {
      const imgPath = path.join(__dirname, '..', item.dishimage);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await item.destroy();
    res.status(200).json({ success: true, message: 'Food item deleted successfully' });
  } catch (error) {
    console.error('Delete FoodItem Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete food item', error: error.message });
  }
};
