'use strict';
const db = require('../../models');
const { RestaurantReg, FoodItem, Cuisine, Category } = db;
const { Op } = require('sequelize');

/**
 * Get all restaurants with filters and pagination
 * (City filter removed)
 */
exports.getAllRestaurants = async (req, res) => {
  try {
    let { page = 1, limit = 10, status, cuisineName, search } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    // Main where clause for restaurants
    const whereClause = {};
    if (status) whereClause.status = status;
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
            required: false,
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

    const formattedRestaurants = restaurants.map(r => {
      const cuisines = r.foodItems.map(f => f.cuisine?.name).filter(Boolean);
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


exports.getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;

    const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

    // Fetch restaurant + associations
    const restaurant = await RestaurantReg.findByPk(id, {
      include: [
        {
          model: FoodItem,
          as: "foodItems",
          attributes: ["id", "dishname", "price", "veg"],
          include: [
            { model: Cuisine, as: "cuisine", attributes: ["id", "name"] },
            { model: Category, as: "category", attributes: ["id", "name"] },
          ],
        },
      ],
    });

    if (!restaurant)
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });

    // ✅ Fix logo full path
    let rest_logo = restaurant.rest_logo
      ? restaurant.rest_logo.startsWith("http")
        ? restaurant.rest_logo
        : `${BASE_URL}${restaurant.rest_logo}`
      : null;

    // ✅ Fix operational hours
    let operationalHours = [];
    if (restaurant.operational_hours && typeof restaurant.operational_hours === "object") {
      operationalHours = Object.keys(restaurant.operational_hours).map((day) => {
        const d = restaurant.operational_hours[day] || {};
        return {
          day,
          enabled: !!d.enabled,
          from: d.from || "",
          to: d.to || "",
        };
      });
    }

    // ✅ Fix document URLs
    const fssaiUrl = restaurant.fssai_certificate
      ? `${BASE_URL}${restaurant.fssai_certificate}`
      : null;
    const gstUrl = restaurant.gst_certificate
      ? `${BASE_URL}${restaurant.gst_certificate}`
      : null;

    const documents = [
      {
        name: "FSSAI License",
        status: fssaiUrl ? "Verified" : "Pending",
        date: "-",
        file: fssaiUrl,
      },
      {
        name: "GST Certificate",
        status: gstUrl ? "Verified" : "Pending",
        date: "-",
        file: gstUrl,
      },
    ];

    const responseData = {
      id: restaurant.id,
      restaurant_code: restaurant.restaurant_code,
      rest_name: restaurant.rest_name,
      rest_logo,
      rest_address: restaurant.rest_address,
      contact_number: restaurant.contact_number,
      contact_email: restaurant.contact_email,
      bankAccountName: restaurant.bank_account_name,
      bankAccountNumber: restaurant.account_number,
      ifscCode: restaurant.ifsc_code,
      deliveryRadius: restaurant.deliveryRadius,
      deliveryZones: restaurant.deliveryZones || [],
      operationalHours,
      status: restaurant.status,
      rating: restaurant.rating || 4.5,
      reviewCount: restaurant.reviewCount || 0,
      commissionRate: restaurant.commissionRate || "15%",
      totalPayouts: restaurant.totalPayouts || "₹0",
      totalOrders: restaurant.totalOrders || 0,
      totalBookings: restaurant.totalBookings || 0,
      avgPrepTime: restaurant.avgPrepTime || "-",
      orderAcceptanceRate: restaurant.orderAcceptanceRate || "-",
      customerComplaints: restaurant.customerComplaints || 0,
      foodItems: restaurant.foodItems,
      documents,
    };

    res.status(200).json({
      success: true,
      message: "Restaurant details fetched successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Error fetching restaurant details:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


/**
 * Restaurant stats (inactive removed)
 */
exports.getRestaurantStats = async (req, res) => {
  try {
    const totalRestaurants = await RestaurantReg.count();
    const activeRestaurants = await RestaurantReg.count({ where: { status: 'active' } });
    const pendingApproval = await RestaurantReg.count({ where: { status: 'pending' } });
    const blockedRestaurants = await RestaurantReg.count({ where: { status: 'blocked' } });

    res.status(200).json({
      success: true,
      message: 'Restaurant statistics fetched successfully',
      data: { totalRestaurants, activeRestaurants, pendingApproval, blockedRestaurants }
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
 * ✅ Block / Unblock restaurant (like Customers)
 */
exports.updateRestaurantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body;

    // Support block/unblock keywords
    if (status === 'block') status = 'blocked';
    if (status === 'unblock') status = 'active';

    const validStatuses = ['active', 'pending', 'blocked'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const restaurant = await RestaurantReg.findByPk(id);
    if (!restaurant)
      return res.status(404).json({ success: false, message: 'Restaurant not found' });

    restaurant.status = status;
    await restaurant.save();

    res.status(200).json({
      success: true,
      message: `Restaurant ${status === 'blocked' ? 'blocked' : 'unblocked'} successfully`,
      data: { id: restaurant.id, rest_name: restaurant.rest_name, status: restaurant.status }
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
 * Get cuisine list
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

