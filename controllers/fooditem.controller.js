const { FoodItem } = require('../models');
const { Op } = require('sequelize');

exports.create = async (req, res) => {
  try {
    const item = await FoodItem.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { search } = req.query;
    let condition = {};
    if (search) {
      condition = {
        [Op.or]: [
          { dishname: { [Op.like]: `%${search}%` } },
          { category: { [Op.like]: `%${search}%` } }
        ]
      };
    }
    const items = await FoodItem.findAll({ where: condition });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await FoodItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Food item not found' });
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const [updated] = await FoodItem.update(req.body, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, message: 'Food item not found' });
    const item = await FoodItem.findByPk(req.params.id);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await FoodItem.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ success: false, message: 'Food item not found' });
    res.status(200).json({ success: true, message: 'Food item deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
