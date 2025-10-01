const db = require('../../models');
const { RestaurantReg, sequelize } = db;  // ✅ sequelize here
const { Op } = require('sequelize');


/**
 * Get all restaurants with filters and pagination
 */
exports.getAllRestaurants = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      cuisineType,
      city,
      search
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Filter by cuisine type
    if (cuisineType) {
      whereClause.cuisine_type = { [Op.like]: `%${cuisineType}%` };
    }

    // Filter by city (from address)
    if (city) {
      whereClause.rest_address = { [Op.like]: `%${city}%` };
    }

    // Search by restaurant name, email, or contact number
    if (search) {
      whereClause[Op.or] = [
        { rest_name: { [Op.like]: `%${search}%` } },
        { contact_email: { [Op.like]: `%${search}%` } },
        { contact_number: { [Op.like]: `%${search}%` } }
      ];
    }

    // Fetch restaurants
    const { count, rows: restaurants } = await RestaurantReg.findAndCountAll({
      where: whereClause,
      attributes: [
        'id',
        'rest_name',
        'contact_email',
        'contact_number',
        'cuisine_type',
        'rest_address',
        'status',
        'createdAt'
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      message: 'Restaurants fetched successfully',
      data: {
        restaurants,
        pagination: {
          totalRestaurants: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurants',
      error: error.message
    });
  }
};

/**
 * Get single restaurant details
 */
exports.getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await RestaurantReg.findByPk(id, {
      attributes: [
        'id',
        'rest_name',
        'rest_address',
        'cuisine_type',
        'avg_cost_two',
        'rest_logo',
        'contact_person_name',
        'contact_email',
        'contact_number',
        'operational_hours',
        'fssai_certificate',
        'gst_certificate',
        'bank_account_name',
        'account_number',
        'ifsc_code',
        'status',
        'createdAt'
      ]
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Restaurant details fetched successfully',
      data: restaurant
    });
  } catch (error) {
    console.error('Error fetching restaurant details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurant details',
      error: error.message
    });
  }
};

/**
 * Get restaurant statistics
 */
exports.getRestaurantStats = async (req, res) => {
  try {
    const totalRestaurants = await RestaurantReg.count();
    const activeRestaurants = await RestaurantReg.count({ 
      where: { status: 'active' } 
    });
    const pendingApproval = await RestaurantReg.count({ 
      where: { status: 'pending' } 
    });
    const blockedRestaurants = await RestaurantReg.count({ 
      where: { status: 'blocked' } 
    });
    const inactiveRestaurants = await RestaurantReg.count({ 
      where: { status: 'inactive' } 
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant statistics fetched successfully',
      data: {
        totalRestaurants,
        activeRestaurants,
        pendingApproval,
        blockedRestaurants,
        inactiveRestaurants
      }
    });
  } catch (error) {
    console.error('Error fetching restaurant stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurant statistics',
      error: error.message
    });
  }
};

/**
 * Update restaurant status (Approve/Reject/Block/Unblock/Activate)
 */
exports.updateRestaurantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['active', 'pending', 'blocked', 'inactive'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: active, pending, blocked, inactive'
      });
    }

    const restaurant = await RestaurantReg.findByPk(id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Update status
    restaurant.status = status;
    await restaurant.save();

    // Set appropriate message
    let message = 'Restaurant status updated successfully';
    if (status === 'active') {
      message = 'Restaurant approved and activated successfully';
    } else if (status === 'blocked') {
      message = 'Restaurant blocked successfully';
    } else if (status === 'inactive') {
      message = 'Restaurant deactivated successfully';
    }

    res.status(200).json({
      success: true,
      message,
      data: {
        id: restaurant.id,
        rest_name: restaurant.rest_name,
        status: restaurant.status
      }
    });
  } catch (error) {
    console.error('Error updating restaurant status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update restaurant status',
      error: error.message
    });
  }
};

/**
 * Get unique cuisine types (for filter dropdown)
 */
exports.getCuisineTypes = async (req, res) => {
  try {
    const cuisines = await RestaurantReg.findAll({
      attributes: [
        [sequelize.fn('DISTINCT', sequelize.col('cuisine_type')), 'cuisine_type']
      ],
      raw: true
    });

    const cuisineList = cuisines.map(c => c.cuisine_type).filter(Boolean);

    res.status(200).json({
      success: true,
      message: 'Cuisine types fetched successfully',
      data: cuisineList
    });
  } catch (error) {
    console.error('Error fetching cuisine types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cuisine types',
      error: error.message
    });
  }
};
