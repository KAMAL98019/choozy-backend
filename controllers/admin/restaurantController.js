'use strict';
const db = require('../../models');
const { RestaurantReg, FoodItem, Cuisine, sequelize } = db;
const { Op } = require('sequelize');

/**
 * Get all restaurants with filters and pagination
 * - Filter by status, city, cuisine (via FoodItem), and search
 */
exports.getAllRestaurants = async (req, res) => {
  try {
    let { page = 1, limit = 10, status, city, cuisineName, search } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    // Main where clause for restaurants
    const whereClause = {};
    if (status) whereClause.status = status;
    if (city) whereClause.rest_address = { [Op.like]: `%${city}%` };
    if (search) {
      whereClause[Op.or] = [
        { rest_name: { [Op.like]: `%${search}%` } },
        { contact_email: { [Op.like]: `%${search}%` } },
        { contact_number: { [Op.like]: `%${search}%` } }
      ];
    }

    // Include FoodItems and Cuisines
    const include = [
      {
        model: FoodItem,
        as: 'foodItems',
        attributes: ['id', 'dishname'],
        include: [
          {
            model: Cuisine,
            as: 'cuisine',
            attributes: ['id', 'name'],
            required: false, // always left join
            ...(cuisineName ? { where: { name: cuisineName }, required: true } : {})
          }
        ]
      }
    ];

    // Fetch restaurants with pagination
    const { count, rows: restaurants } = await RestaurantReg.findAndCountAll({
      where: whereClause,
      include,
      distinct: true,
      attributes: [
        'id',
        'rest_name',
        'contact_email',
        'contact_number',
        'rest_address',
        'status',
        'createdAt'
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    // Format cuisines for frontend
    const formattedRestaurants = restaurants.map(r => {
      const cuisines = r.foodItems
        .map(f => f.cuisine?.name)
        .filter(Boolean);

      return {
        id: r.id,
        rest_name: r.rest_name,
        contact_email: r.contact_email,
        contact_number: r.contact_number,
        rest_address: r.rest_address,
        status: r.status,
        createdAt: r.createdAt,
        cuisines: [...new Set(cuisines)]
      };
    });

    res.status(200).json({
      success: true,
      message: 'Restaurants fetched successfully',
      data: {
        restaurants: formattedRestaurants,
        pagination: {
          totalRestaurants: count,
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          limit
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
 * Get single restaurant details (with FoodItems + Cuisine)
 */
exports.getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await RestaurantReg.findByPk(id, {
      include: [
        {
          model: FoodItem,
          as: 'foodItems',
          attributes: ['id', 'dishname', 'category', 'price', 'veg'],
          include: [
            { model: Cuisine, as: 'cuisine', attributes: ['id', 'name'] }
          ]
        }
      ]
    });

    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

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
    const activeRestaurants = await RestaurantReg.count({ where: { status: 'active' } });
    const pendingApproval = await RestaurantReg.count({ where: { status: 'pending' } });
    const blockedRestaurants = await RestaurantReg.count({ where: { status: 'blocked' } });
    const inactiveRestaurants = await RestaurantReg.count({ where: { status: 'inactive' } });

    res.status(200).json({
      success: true,
      message: 'Restaurant statistics fetched successfully',
      data: { totalRestaurants, activeRestaurants, pendingApproval, blockedRestaurants, inactiveRestaurants }
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
 * Update restaurant status
 */
exports.updateRestaurantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'pending', 'blocked', 'inactive'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

    const restaurant = await RestaurantReg.findByPk(id);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    restaurant.status = status;
    await restaurant.save();

    res.status(200).json({
      success: true,
      message: 'Restaurant status updated successfully',
      data: { id: restaurant.id, rest_name: restaurant.rest_name, status: restaurant.status }
    });
  } catch (error) {
    console.error('Error updating restaurant status:', error);
    res.status(500).json({ success: false, message: 'Failed to update restaurant status', error: error.message });
  }
};

/**
 * Get unique cuisine types (from FoodItems)
 */
exports.getCuisineTypes = async (req, res) => {
  try {
    const cuisines = await Cuisine.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      message: 'Cuisine types fetched successfully',
      data: cuisines
    });
  } catch (error) {
    console.error('Error fetching cuisines:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cuisines',
      error: error.message
    });
  }
};

// PUT /restaurants/:id/delivery-settings
exports.updateDeliverySettings = async (req,res)=>{
  try{
    const { id } = req.params;
    const { deliveryType, deliveryRadius, deliveryZones, restaurantLatitude, restaurantLongitude, minOrderAmount, baseDeliveryFee } = req.body;

    const restaurant = await RestaurantReg.findByPk(id);
    if(!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    await restaurant.update({
      deliveryType, deliveryRadius, deliveryZones,
      restaurantLatitude, restaurantLongitude,
      minOrderAmount, baseDeliveryFee
    });

    res.json({ message:'Delivery settings updated', data: restaurant });
  }catch(e){
    res.status(500).json({ error: "Failed to update delivery settings" });
  }
};


