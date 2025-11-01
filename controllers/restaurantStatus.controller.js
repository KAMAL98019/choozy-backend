const { RestaurantStatus, RestaurantReg } = require('../models');

exports.upsertStatus = async (req, res) => {
  try {
    const { rest_id, status } = req.body;

    if (!rest_id || !status) {
      return res.status(400).json({
        success: false,
        message: 'Both rest_id and status are required.'
      });
    }

    const validStatuses = ['ONLINE', 'OFFLINE'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed values: ONLINE, OFFLINE'
      });
    }

    const restaurant = await RestaurantReg.findByPk(rest_id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found.'
      });
    }

    // Upsert: update if exists, create if not
    let restaurantStatus = await RestaurantStatus.findOne({ where: { rest_id } });

    if (restaurantStatus) {
      restaurantStatus.status = status;
      await restaurantStatus.save();
    } else {
      restaurantStatus = await RestaurantStatus.create({ rest_id, status });
    }

    return res.status(200).json({
      success: true,
      message: 'Restaurant status saved successfully.',
      data: restaurantStatus
    });

  } catch (err) {
    console.error('Upsert Status Error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to save restaurant status.',
      error: err.message
    });
  }
};
