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
      delivery.lat = lat;
      delivery.lng = lng;
    }

    await delivery.save();
    res.json({ message: 'Delivery updated', delivery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------- Partner: Complete Delivery with Photo & Notes --------------------
exports.completeDelivery = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { notes } = req.body;

    const delivery = await DeliveryOrder.findByPk(assignmentId, {
      include: [
        { model: Order, as: "order" },
        { model: Partner, as: "partner" }
      ]
    });

    if (!delivery) {
      return res.status(404).json({ message: "Delivery assignment not found" });
    }

    // Update status
    delivery.status = "delivered";

    // Optional notes (only if column exists in DB)
    if (notes && delivery.notes !== undefined) {
      delivery.notes = notes;
    }

    // Proof photo
    if (req.file) {
      delivery.proofUrl = `/uploads/${req.file.filename}`;
    }

    // Calculate distance & earnings (only if columns exist in DB)
    if (
      delivery.pickupLatitude &&
      delivery.pickupLongitude &&
      delivery.deliveryLatitude &&
      delivery.deliveryLongitude
    ) {
      const distance = calculateDistance(
        delivery.pickupLatitude,
        delivery.pickupLongitude,
        delivery.deliveryLatitude,
        delivery.deliveryLongitude
      );

      if (delivery.distanceKm !== undefined) {
        delivery.distanceKm = distance;
      }

      if (delivery.earnings !== undefined) {
        delivery.earnings = distance * 10; // ₹10 per km
      }
    }

    await delivery.save();

    // Update order status
    if (delivery.order) {
      delivery.order.status = "delivered";
      await delivery.order.save();
    }

    res.json({
      message: "Delivery completed successfully",
      delivery,
      order: delivery.order
    });
  } catch (err) {
    console.error("❌ Error in completeDelivery:", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- Helper: Haversine Distance --------------------
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
