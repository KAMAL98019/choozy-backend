const { Order, OrderItem, User, FoodItem, RestaurantReg, Partner, Earnings } = require("../../models");

exports.getDeliverySummary = async (req, res) => {
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
          model: OrderItem,
          as: "items",
          include: [
            {
              model: FoodItem,
              as: "food",
              attributes: ["id", "dishname", "price", "category"],
              include: [
                {
                  model: RestaurantReg,
                  as: "restaurant",
                  attributes: ["id", "rest_name", "rest_address", "rest_logo"]
                }
              ]
            }
          ]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Fetch Partner & Earnings
    const earnings = await Earnings.findOne({
      where: { orderId },
      include: [
        {
          model: Partner,
          attributes: ["id", "name", "mobile", "vehicleNumber"]
        }
      ]
    });

    res.json({
      orderId: order.id,
      status: order.status,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      customer: order.user,
      restaurant: order.items.length > 0 ? order.items[0].food.restaurant : null,
      items: order.items.map(item => ({
        dishname: item.food.dishname,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice
      })),
      partner: earnings ? earnings.Partner : null,
      earnings: earnings ? earnings.amount : 0
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
