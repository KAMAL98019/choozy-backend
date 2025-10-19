const { RestaurantStatus, RestaurantReg } = require('../models');

// 🟢 Create Restaurant Status
exports.createStatus = async (req, res) => {
  try {
    const { rest_id, status, reason } = req.body;

    if (!rest_id || !status) {
      return res.status(400).json({ success: false, message: 'rest_id and status are required' });
    }

    // Optional: check restaurant exists
    const restaurant = await RestaurantReg.findByPk(rest_id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const newStatus = await RestaurantStatus.create({ rest_id, status, reason });
    res.status(201).json({ success: true, data: newStatus });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🟢 Update Restaurant Status
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const restaurantStatus = await RestaurantStatus.findByPk(id);
    if (!restaurantStatus) {
      return res.status(404).json({ success: false, message: 'Status record not found' });
    }

    if (status) restaurantStatus.status = status;
    if (reason !== undefined) restaurantStatus.reason = reason;

    await restaurantStatus.save();
    res.json({ success: true, data: restaurantStatus });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
