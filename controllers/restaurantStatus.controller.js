const { RestaurantStatus, RestaurantReg } = require('../models');

// 🟢 Create Restaurant Status
exports.createStatus = async (req, res) => {
  try {
    const { rest_id, status, reason } = req.body;

    // Validate input
    if (!rest_id || !status) {
      return res.status(400).json({
        success: false,
        message: 'Both rest_id and status are required.'
      });
    }

    // Allow only valid statuses
    const validStatuses = ['ONLINE', 'OFFLINE'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed values: ONLINE, OFFLINE'
      });
    }

    // Check if restaurant exists
    const restaurant = await RestaurantReg.findByPk(rest_id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found.'
      });
    }

    // Create new status record
    const newStatus = await RestaurantStatus.create({
      rest_id,
      status,
      reason: reason || null
    });

    return res.status(201).json({
      success: true,
      message: 'Restaurant status created successfully.',
      data: newStatus
    });

  } catch (err) {
    console.error('Create Status Error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create restaurant status.',
      error: err.message
    });
  }
};

// 🟡 Update Restaurant Status
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    // Find existing record
    const restaurantStatus = await RestaurantStatus.findByPk(id);
    if (!restaurantStatus) {
      return res.status(404).json({
        success: false,
        message: 'Status record not found.'
      });
    }

    // Validate status if provided
    const validStatuses = ['ONLINE', 'OFFLINE'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed values: ONLINE, OFFLINE'
      });
    }

    // Update fields
    if (status) restaurantStatus.status = status;
    if (reason !== undefined) restaurantStatus.reason = reason;

    await restaurantStatus.save();

    return res.status(200).json({
      success: true,
      message: 'Restaurant status updated successfully.',
      data: restaurantStatus
    });

  } catch (err) {
    console.error('Update Status Error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update restaurant status.',
      error: err.message
    });
  }
};
