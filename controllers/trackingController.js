const { Order, DeliveryOrder, Partner } = require('../models');
const fs = require('fs');
const path = require('path');

// -------------------- Customer: Track Order --------------------
exports.trackOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findByPk(orderId, {
      include: ['items', 'cart']
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Include delivery assignment if exists
    const delivery = await DeliveryOrder.findOne({ where: { orderId } });
    res.json({ order, delivery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------- Partner: Update Status/Location --------------------
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { status, lat, lng } = req.body;

    const delivery = await DeliveryOrder.findByPk(assignmentId);
    if (!delivery) return res.status(404).json({ message: 'Delivery assignment not found' });

    if (status) delivery.status = status;
    if (lat && lng) {
      delivery.currentLatitude = lat;
      delivery.currentLongitude = lng;
    }


    await delivery.save();
    res.json({ message: 'Delivery updated', delivery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------- Partner: Complete Delivery with Photo & Notes --------------------
// -------------------- Partner: Complete Delivery with Photo & Notes --------------------
exports.completeDelivery = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { notes } = req.body;

    const delivery = await DeliveryOrder.findByPk(assignmentId, {
      include: [
        {
          model: Order,
          as: "order",
          attributes: ["id", "status"]
        }
      ]
    });

    if (!delivery) {
      return res.status(404).json({ message: "Delivery assignment not found" });
    }

    // ✅ Update delivery status
    delivery.status = "DELIVERED";
    if (notes) delivery.notes = notes;

    // ✅ Proof photo
    if (req.file) {
      delivery.deliveryPhoto = `/uploads/${req.file.filename}`;
    }

    // ✅ Calculate distance & earnings (from DeliveryOrder coords, not Order)
    let distance = null;
    let earnings = null;

    if (
      delivery.pickupLatitude &&
      delivery.pickupLongitude &&
      delivery.deliveryLatitude &&
      delivery.deliveryLongitude
    ) {
      distance = calculateDistance(
        delivery.pickupLatitude,
        delivery.pickupLongitude,
        delivery.deliveryLatitude,
        delivery.deliveryLongitude
      );

      delivery.distanceKm = distance;
      delivery.earnings = distance * 10; // ₹10/km
      earnings = delivery.earnings;
    }

    await delivery.save();

    // ✅ Update Order status
    if (delivery.order) {
      delivery.order.status = "DELIVERED";
      delivery.order.deliveredAt = new Date();
      await delivery.order.save();
    }

    // ✅ Clean Response
    res.json({
      message: "Delivery completed successfully",
      delivery: {
        id: delivery.id,
        status: delivery.status,
        notes: delivery.notes || null,
        deliveryPhoto: delivery.deliveryPhoto || null,
        distanceKm: delivery.distanceKm || null,
        earnings: earnings || null
      },
      order: {
        id: delivery.order?.id,
        status: delivery.order?.status
      }
    });
  } catch (err) {
    console.error("❌ Error in completeDelivery:", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- Helper --------------------
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return +(R * c).toFixed(2); // 2 decimal points
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
