'use strict';

const { DiningBooking, RestaurantReg, DiningSpace, User, sequelize,DiningEvent } = require('../../models');
const { Op } = require('sequelize');

exports.getAllBookings = async (req, res) => {
  try {
    const { status, search, dateRange, page = 1, pageSize = 20 } = req.query;

    const where = {};

    // ✅ Status filter
    if (status) {
      const statusMap = {
        Pending: "PENDING",
        Confirmed: ["ADMIN_VERIFIED", "CONFIRMED"],
        Completed: "COMPLETED",
        Cancelled: "CANCELLED",
      };
      const mappedStatus = statusMap[status];
      if (Array.isArray(mappedStatus)) {
        where.status = { [Op.in]: mappedStatus };
      } else if (mappedStatus) {
        where.status = mappedStatus;
      }
    }

    // ✅ Search filter
    if (search) {
      where[Op.or] = [
        { bookingNumber: { [Op.like]: `%${search}%` } },
        { customerName: { [Op.like]: `%${search}%` } },
        { customerPhone: { [Op.like]: `%${search}%` } },
      ];
    }

    // ✅ Date range filter
    if (dateRange) {
      const [start, end] = dateRange.split(",");
      if (start && end) {
        where.bookingDate = {
          [Op.between]: [new Date(start), new Date(end)],
        };
      }
    }

    const limit = Math.min(Number(pageSize) || 20, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const { count, rows: bookings } = await DiningBooking.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "mobile", "email"],
        },
        {
          model: RestaurantReg,
          as: "restaurant",
          attributes: ["id", "rest_name", "rest_address", "contact_number"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: {
        bookings,
        total: count,
        page: Number(page),
        pageSize: limit,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error in getAllBookings:", error);
    return res
      .status(500)
      .json({ success: false, error: error.message || "Failed to fetch bookings" });
  }
};

// Get booking details (Admin view)
exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await DiningBooking.findOne({
      where: { id },
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'mobile', 'email'] },
        { model: RestaurantReg, as: 'restaurant', attributes: ['id', 'rest_name', 'rest_address', 'contact_number', 'contact_email'] },
        { model: DiningSpace, as: 'diningArea', attributes: ['id', 'areaName', 'seatingCapacity'] }
      ]
    });

    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

    const timeline = [
      { event: 'Booking Placed', timestamp: booking.bookedAt, status: 'completed' },
      { event: 'Restaurant Confirmed', timestamp: booking.restaurantConfirmedAt, status: booking.restaurantConfirmedAt ? 'completed' : 'pending' },
      { event: 'Customer Notified', timestamp: booking.adminVerifiedAt, status: booking.adminVerifiedAt ? 'completed' : 'pending' },
      { event: 'Reminder Sent', timestamp: null, status: 'pending' },
      { event: 'Marked as Seated', timestamp: booking.seatedAt, status: booking.seatedAt ? 'completed' : 'pending' }
    ];

    return res.status(200).json({ success: true, data: { ...booking.toJSON(), timeline } });
  } catch (error) {
    console.error('Error in getBookingById:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch booking details' });
  }
};

// Verify booking (Admin)
// controllers/admin/eventController.js
exports.verifyEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await DiningEvent.findByPk(eventId);
    if (!event) 
      return res.status(404).json({ success: false, error: 'Event not found' });

    if (event.isAdminVerified) 
      return res.status(400).json({ success: false, error: 'Event already verified' });

    // ✅ Update both admin verification and active status
    await event.update({ 
      isAdminVerified: true,
      isActive: true
    });

    return res.status(200).json({
      success: true,
      message: 'Event verified and activated. Customers can now book.',
      data: event
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
};


// Modify booking (Admin)
exports.modifyBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { bookingDate, bookingTime, numberOfGuests, specialRequests, staffNotes } = req.body;
    const booking = await DiningBooking.findByPk(id);

    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

    const updateData = {};
    if (bookingDate) updateData.bookingDate = bookingDate;
    if (bookingTime) updateData.bookingTime = bookingTime;
    if (numberOfGuests) updateData.numberOfGuests = numberOfGuests;
    if (specialRequests) updateData.specialRequests = specialRequests;
    if (staffNotes) updateData.staffNotes = staffNotes;

    await booking.update(updateData);

    return res.status(200).json({ success: true, message: 'Booking modified successfully', data: booking });
  } catch (error) {
    console.error('Error in modifyBooking:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to modify booking' });
  }
};

// Cancel booking (Admin)
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const booking = await DiningBooking.findByPk(id);

    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    if (booking.status === 'CANCELLED') return res.status(400).json({ success: false, error: 'Booking is already cancelled' });

    await booking.update({ status: 'CANCELLED', cancellationReason: reason || 'Cancelled by admin', cancelledBy: 'ADMIN', cancelledAt: new Date() });

    return res.status(200).json({ success: true, message: 'Booking cancelled successfully', data: booking });
  } catch (error) {
    console.error('Error in cancelBooking:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to cancel booking' });
  }
};

// Change booking status
exports.changeBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['PENDING', 'ADMIN_VERIFIED', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED'];

    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });

    const booking = await DiningBooking.findByPk(id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

    const updateData = { status };
    if (status === 'ADMIN_VERIFIED') updateData.adminVerifiedAt = new Date();
    else if (status === 'CONFIRMED') updateData.restaurantConfirmedAt = new Date();
    else if (status === 'SEATED') updateData.seatedAt = new Date();
    else if (status === 'COMPLETED') updateData.completedAt = new Date();
    else if (status === 'CANCELLED') { updateData.cancelledAt = new Date(); updateData.cancelledBy = 'ADMIN'; }

    await booking.update(updateData);
    return res.status(200).json({ success: true, message: 'Booking status updated', data: booking });
  } catch (error) {
    console.error('Error in changeBookingStatus:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to change booking status' });
  }
};

// Booking stats for admin
exports.getBookingStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate && endDate) where.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };

    const statusCounts = await DiningBooking.findAll({
      where,
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true
    });

    const totalBookings = await DiningBooking.count({ where });

    const popularRestaurants = await DiningBooking.findAll({
      where,
      attributes: ['restaurantId', [sequelize.fn('COUNT', sequelize.col('id')), 'bookingCount']],
      include: [{ model: RestaurantReg, as: 'restaurant', attributes: ['rest_name'] }],
      group: ['restaurantId'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 10,
      raw: true
    });

    return res.status(200).json({ success: true, data: { statusCounts, totalBookings, popularRestaurants } });
  } catch (error) {
    console.error('Error in getBookingStats:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch booking statistics' });
  }
};
