const { User, Address, Order, ReviewDeliveryToCustomer, Partner } = require('../../models');
const { Op } = require('sequelize');

/**
 * Get all customers with pagination, search, sort, and status filter
 */
exports.getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, sortBy } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    // ✅ Filter by status
    if (status && status !== "All") {
      whereClause.status = status;
    }

    // ✅ Search by name, email, mobile, or customerId
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { mobile: { [Op.like]: `%${search}%` } },
        { customerId: { [Op.like]: `%${search}%` } },
      ];
    }

    // ✅ Handle dynamic sorting (from frontend)
    let order = [["createdAt", "DESC"]]; // default

    if (sortBy) {
      const [field, direction] = sortBy.split("_");
      const validFields = ["name", "createdAt", "customerId"]; // ✅ allowed fields
      const validDirections = ["ASC", "DESC"];

      if (validFields.includes(field) && validDirections.includes(direction.toUpperCase())) {
        order = [[field, direction.toUpperCase()]];
      }
    }

    // ✅ Query users
    const { count, rows: customers } = await User.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "customerId",
        "name",
        "email",
        "mobile",
        "status",
        "createdAt",
      ],
      include: [
        {
          model: Order,
          as: "orders",
          attributes: ["id", "totalAmount", "status", "createdAt"],
          separate: true,
          limit: 1,
          order: [["createdAt", "DESC"]],
        },
      ],
      order, // ✅ dynamic sorting applied here
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // ✅ Compute order stats
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const totalOrders = await Order.count({ where: { userId: customer.id } });
        const totalSpent =
          (await Order.sum("totalAmount", { where: { userId: customer.id } })) || 0;
        const lastOrder = customer.orders[0];

        return {
          id: customer.id,
          customerId: customer.customerId,
          name: customer.name,
          email: customer.email,
          mobile: customer.mobile,
          status: customer.status,
          createdAt: customer.createdAt,
          totalOrders,
          totalSpent,
          lastOrderDate: lastOrder ? lastOrder.createdAt : null,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "Customers fetched successfully",
      data: {
        customers: customersWithStats,
        pagination: {
          totalCustomers: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
};



/**
 * Get single customer details with all information
 */
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get customer basic info
    const customer = await User.findByPk(id, {
      attributes: [
        'id',
        'customerId',
        'name',
        'email',
        'mobile',
        'birthday',
        'anniversary',
        'status',
        'createdAt',
      ],
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // ✅ Generate a custom Customer ID (e.g. CUS1001)
    const customerId = `CUS${String(customer.id).padStart(4, '0')}`;

    // 🧾 Get order summary
    const totalOrders = await Order.count({ where: { userId: id } });
    const totalSpent =
      (await Order.sum('totalAmount', { where: { userId: id } })) || 0;

    const lastOrder = await Order.findOne({
      where: { userId: id },
      order: [['createdAt', 'DESC']],
      attributes: ['createdAt'],
    });

    // 🕒 Get recent orders (using orderNumber instead of id)
    const recentOrders = await Order.findAll({
      where: { userId: id },
      attributes: ['id','orderNumber', 'totalAmount', 'status', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    // 📍 Get saved addresses
    const addresses = await Address.findAll({
      where: { userId: id },
      attributes: ['id','street', 'city', 'state', 'pincode', 'isDefault'],
      order: [
        ['isDefault', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });

    // ⭐ Get reviews & feedback
    const reviews = await ReviewDeliveryToCustomer.findAll({
      where: { userId: id },
      attributes: ['id', 'rating', 'comment', 'createdAt'],
      include: [
        {
          model: Partner,
          attributes: ['fullName'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    // ⭐ Calculate average rating
    const avgRating =
      reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : 0;

    // ✅ Send formatted response
    res.status(200).json({
      success: true,
      message: 'Customer details fetched successfully',
      data: {
        // Personal Information
        personalInfo: {
          id:customer.customerId, // ✅ Added custom customer ID
          name: customer.name,
          email: customer.email,
          mobile: customer.mobile,
          birthday: customer.birthday,
          anniversary: customer.anniversary,
          status: customer.status,
          memberSince: customer.createdAt,
        },

        // Account Activity
        accountActivity: {
          orderSummary: {
            totalOrders,
            totalSpent,
            lastOrderDate: lastOrder ? lastOrder.createdAt : null,
          },
          recentOrders: recentOrders.map((order) => ({
            orderId: order.orderNumber, // ✅ Changed from id → orderNumber
            amount: order.totalAmount,
            status: order.status,
            date: order.createdAt,
          })),
        },

        // Reviews & Feedback
        reviewsAndFeedback: {
          averageRating: parseFloat(avgRating),
          totalReviews: reviews.length,
          recentReviews: reviews.map((review) => ({
            rating: review.rating,
            comment: review.comment,
            restaurantName: review.Partner?.fullName || null,
            date: review.createdAt,
          })),
        },

        // Saved Addresses
        savedAddresses: addresses.map((addr) => ({
          id: addr.id,
          type: addr.isDefault ? 'Home (Default)' : 'Other',
          fullAddress: `${addr.street}, ${addr.city}, ${addr.state} - ${addr.pincode}`,
          isDefault: addr.isDefault,
        })),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching customer details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer details',
      error: error.message,
    });
  }
};


/**
 * Get customer statistics (for dashboard)
 */
exports.getCustomerStats = async (req, res) => {
  try {
    const totalCustomers = await User.count();
    const activeCustomers = await User.count({ where: { status: 'active' } });
    const blockedCustomers = await User.count({ where: { status: 'blocked' } });
    
    // New customers this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newCustomersThisMonth = await User.count({
      where: {
        createdAt: { [Op.gte]: startOfMonth }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Customer statistics fetched successfully',
      data: {
        totalCustomers,
        activeCustomers,
        blockedCustomers,
        newCustomersThisMonth
      }
    });
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer statistics',
      error: error.message
    });
  }
};

/**
 * Block/Unblock customer
 */
exports.updateCustomerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' or 'blocked'

    if (!['active', 'blocked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "active" or "blocked"'
      });
    }

    const customer = await User.findByPk(id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    customer.status = status;
    await customer.save();

    res.status(200).json({
      success: true,
      message: `Customer ${status === 'blocked' ? 'blocked' : 'unblocked'} successfully`,
      data: {
        id: customer.id,
        status: customer.status
      }
    });
  } catch (error) {
    console.error('Error updating customer status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer status',
      error: error.message
    });
  }
};