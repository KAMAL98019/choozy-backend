const { Order, User, Partner, Cart, CartItem, FoodItem, RestaurantReg } = require('../../models');
const { Op } = require('sequelize');

/**
 * Get all orders with filters and pagination (Admin)
 */
exports.getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      startDate,
      endDate
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (status) whereClause.status = status;

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
    }

    if (search) {
      whereClause[Op.or] = [
        { id: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'mobile']
        },
        {
          model: Partner,
          as: 'partner',
          attributes: ['id', 'fullName', 'mobile']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      message: 'Orders fetched successfully',
      data: {
        orders,
        pagination: {
          totalOrders: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

/**
 * Get single order details with complete information (Admin)
 */
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({
      where: { id: orderId },
      include: [
        { 
          model: User, 
          as: "user", 
          attributes: ["id", "name", "mobile", "email"] 
        },
        {
          model: Cart,
          as: "cart",
          include: [
            {
              model: CartItem,
              as: "items",
              attributes: ["quantity", "unitPrice", "selectedAddOns"],
              include: [
                {
                  model: FoodItem,
                  as: "food",
                  attributes: ["dishname"]
                }
              ]
            },
            {
              model: RestaurantReg,
              as: "restaurant",
              attributes: ["rest_name", "contact_email", "contact_number", "rest_address"]
            }
          ]
        },
        { 
          model: Partner, 
          as: "partner", 
          attributes: ['id', "fullName", "mobile", "vehicleType", "licensePlate"] 
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: "Order not found" 
      });
    }

    // Calculate delivery time
    const orderPlacedTime = new Date(order.createdAt);
    const currentTime = new Date();
    const deliveryTimeMinutes = Math.floor((currentTime - orderPlacedTime) / (1000 * 60));

    // Format response matching the screenshot
    res.status(200).json({
      success: true,
      message: "Order details fetched successfully",
      data: {
        orderId: order.id,
        status: order.status,
        lastUpdated: order.updatedAt,
        deliveryTime: `${deliveryTimeMinutes} minutes`,
        paymentMethod: order.paymentMethod,
        
        orderSummary: {
          orderPlacement: order.createdAt,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          discountApplied: order.discount || null
        },

        customerInformation: {
          name: order.user.name,
          customerId: order.user.id,
          email: order.user.email,
          mobile: order.user.mobile,
          deliveryAddress: order.address
        },

        restaurantInformation: {
          name: order.cart?.restaurant?.rest_name || "N/A",
          email: order.cart?.restaurant?.contact_email || "N/A",
          mobile: order.cart?.restaurant?.contact_number || "N/A",
          address: order.cart?.restaurant?.rest_address || "N/A"
        },

        deliveryPartnerInformation: order.partner ? {
          name: order.partner.fullName,
          partnerId: order.partner.id,
          mobile: order.partner.mobile,
          vehicleType: order.partner.vehicleType,
          vehicleNumber: order.partner.licensePlate
        } : null,

        itemsOrdered: order.cart?.items?.map(item => ({
          quantity: item.quantity,
          name: item.food?.dishname || "Unknown Item",
          addOns: item.selectedAddOns,
          price: item.unitPrice * item.quantity
        })) || [],

        priceSummary: {
          subtotal: order.subtotal,
          tax: order.tax,
          deliveryFee: order.deliveryFee,
          discount: order.discount || 0,
          total: order.totalAmount
        },

        orderTimeline: [
          {
            status: "Order Placed",
            timestamp: order.createdAt,
            message: "Customer placed the order."
          },
          {
            status: "Restaurant Accepted",
            timestamp: order.status === 'CONFIRMED' || order.status === 'PREPARING' || order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED' ? order.updatedAt : null,
            message: "Restaurant has accepted the order and started preparation."
          },
          {
            status: "Order Prepared",
            timestamp: order.status === 'PREPARING' || order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED' ? order.updatedAt : null,
            message: "Restaurant has prepared and packaged the order."
          },
          {
            status: "Out for Delivery",
            timestamp: order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED' ? order.updatedAt : null,
            message: order.partner ? `${order.partner.fullName} has picked up the order and is on the way to delivery.` : null
          },
          {
            status: "Order Delivered",
            timestamp: order.status === 'DELIVERED' ? order.updatedAt : null,
            message: "Order successfully delivered to customer."
          }
        ].filter(item => item.timestamp !== null)
      }
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch order details",
      error: error.message
    });
  }
};

/**
 * Update order status (Admin)
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = await Order.findByPk(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        orderId: order.id,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

/**
 * Get order statistics
 */
exports.getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.count();
    const activeOrders = await Order.count({
      where: {
        status: {
          [Op.in]: ['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY']
        }
      }
    });
    const pendingOrders = await Order.count({ where: { status: 'PENDING' } });
    const deliveredOrders = await Order.count({ where: { status: 'DELIVERED' } });
    const cancelledOrders = await Order.count({ where: { status: 'CANCELLED' } });

    res.status(200).json({
      success: true,
      message: 'Order statistics fetched successfully',
      data: {
        totalOrders,
        activeOrders,
        pendingOrders,
        deliveredOrders,
        cancelledOrders
      }
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order statistics',
      error: error.message
    });
  }
};