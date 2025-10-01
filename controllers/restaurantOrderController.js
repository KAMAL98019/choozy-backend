// controllers/restaurantOrderController.js
const db = require("../models");
const { Order, User, CartItem, Partner, FoodItem, Cart } = db;
const RestaurantStatus = db.RestaurantStatus;



// -------------------- Set or Update Restaurant Status --------------------
exports.setStatus = async (req, res) => {
  const { rest_id, status, reason } = req.body;

  if (!rest_id|| !status) {
    return res.status(400).json({ message: 'restaurantId and status are required' });
  }

  try {
    // Use restaurantId from request body
    const existingStatus = await RestaurantStatus.findOne({ where: { rest_id } });

    if (existingStatus) {
      existingStatus.status = status;
      existingStatus.reason = reason || null;
      await existingStatus.save();
      return res.status(200).json({ message: 'Restaurant status updated successfully' });
    }

    await RestaurantStatus.create({ rest_id, status, reason });
    res.status(201).json({ message: 'Restaurant status set successfully' });
  } catch (err) {
    console.error('❌ Error setting restaurant status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// -------------------- Get Detailed Order Information --------------------
exports.getOrderDetails = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findOne({
  where: { id: orderId },
  include: [
    { model: User, as: "user", attributes: ["name", "mobile"] },
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
        }
      ]
    },
    { model: Partner, as: "partner", attributes: ['id',"fullName", "mobile"] },
  ],
});

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order);
  } catch (err) {
    console.error("❌ Error fetching order details:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
