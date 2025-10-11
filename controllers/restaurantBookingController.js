'use strict';

// controllers/restaurantBookingController.js
const { DiningBooking, User, DiningSpace, RestaurantReg,DiningEvent  } = require('../models');
const { Op } = require('sequelize');

// ===================== Get all bookings for a restaurant =====================
exports.getRestaurantBookings = async (req, res) => {
  try {
    const { restaurantId, status, date, sortBy = 'createdAt' } = req.query;

    if (!restaurantId) {
      return res.status(400).json({ success: false, error: 'restaurantId is required' });
    }

    // Validate restaurant
    const restaurant = await RestaurantReg.findOne({
      where: { id: restaurantId, status: 'active' }
    });
    if (!restaurant) {
      return res.status(404).json({ success: false, error: 'Restaurant not found or inactive' });
    }

    // Build where clause
    const where = { rest_id: restaurantId };
    if (date) where.bookingDate = date;
    if (status) {
      const statusMap = {
        Pending: 'PENDING',
        Verified: 'ADMIN_VERIFIED',
        Confirmed: 'CONFIRMED',
        Seated: 'SEATED',
        Completed: 'COMPLETED',
        Cancelled: 'CANCELLED'
      };
      where.status = statusMap[status] || status;
    }

    // Fetch bookings
    const bookings = await DiningBooking.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'mobile', 'email'] },
        { model: DiningSpace, as: 'diningArea', attributes: ['id', 'areaName', 'seatingCapacity'] },
       
      ],
      order: [[sortBy, 'DESC']]
    });

    // Status counts (for all bookings, optionally filtered by date)
    const allBookings = await DiningBooking.findAll({
      where: { rest_id: restaurantId, ...(date && { bookingDate: date }) },
      attributes: ['status']
    });

    const statusCounts = allBookings.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {});

    const mappedCounts = {
      Pending: statusCounts['PENDING'] || 0,
      Verified: statusCounts['ADMIN_VERIFIED'] || 0,
      Confirmed: statusCounts['CONFIRMED'] || 0,
      Seated: statusCounts['SEATED'] || 0,
      Completed: statusCounts['COMPLETED'] || 0,
      Cancelled: statusCounts['CANCELLED'] || 0
    };

    return res.status(200).json({
      success: true,
      data: {
        bookings,
        statusCounts: mappedCounts,
        date: date || null,
        total: bookings.length
      }
    });

  } catch (error) {
    console.error('getRestaurantBookings error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};


// ===================== Get booking details =====================
exports.getBookingDetails = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    const { id } = req.params;

    if (!restaurantId) return res.status(400).json({ success: false, error: 'restaurantId is required' });

    const booking = await DiningBooking.findOne({
      where: { id, rest_id: restaurantId },
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'mobile', 'email'] },
        { model: DiningSpace, as: 'diningArea', attributes: ['id', 'areaName', 'seatingCapacity'] },
      ]
    });

    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

    const timeline = [
      { event: 'Booking created', timestamp: booking.bookedAt, completed: true },
      { event: 'Confirmation email sent', timestamp: booking.adminVerifiedAt, completed: !!booking.adminVerifiedAt },
      { event: 'Reminder SMS sent', timestamp: booking.restaurantConfirmedAt, completed: !!booking.restaurantConfirmedAt }
    ];

    return res.status(200).json({ success: true, data: { ...booking.toJSON(), timeline } });
  } catch (error) {
    console.error('getBookingDetails error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Accept booking
exports.acceptBooking = async (req, res) => {
  try {
    const { restaurantId, tableNumber, staffNotes } = req.body;
    const { id } = req.params;

    if (!restaurantId) return res.status(400).json({ success: false, error: 'restaurantId is required' });

    const booking = await DiningBooking.findOne({ where: { id, rest_id: restaurantId } });
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

    // Only allow accepting bookings that are still pending from customer
    if (booking.status !== 'CONFIRMED') {
      return res.status(400).json({ success: false, error: `Booking status is ${booking.status}. Cannot accept.` });
    }

    await booking.update({ status: 'SEATED', tableNumber, staffNotes, restaurantConfirmedAt: new Date() });

    return res.status(200).json({ success: true, message: 'Booking accepted by restaurant', data: booking });

  } catch (error) {
    console.error('acceptBooking error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Reject booking
exports.rejectBooking = async (req, res) => {
  try {
    const { restaurantId, reason } = req.body;
    const { id } = req.params;

    if (!restaurantId) return res.status(400).json({ success: false, error: 'restaurantId is required' });

    const booking = await DiningBooking.findOne({ where: { id, rest_id: restaurantId } });
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

    if (['CANCELLED', 'SEATED', 'COMPLETED'].includes(booking.status)) {
      return res.status(400).json({ success: false, error: `Booking status is ${booking.status}. Cannot reject.` });
    }

    await booking.update({
      status: 'CANCELLED',
      cancellationReason: reason || 'Rejected by restaurant',
      cancelledBy: 'RESTAURANT',
      cancelledAt: new Date()
    });

    return res.status(200).json({ success: true, message: 'Booking rejected by restaurant', data: booking });

  } catch (error) {
    console.error('rejectBooking error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Mark as seated
exports.markSeated = async (req, res) => {
  try {
    const { restaurantId } = req.body;
    const { id } = req.params;

    if (!restaurantId) return res.status(400).json({ success: false, error: 'restaurantId is required' });

    const booking = await DiningBooking.findOne({ where: { id, rest_id: restaurantId } });
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    if (booking.status !== 'CONFIRMED') return res.status(400).json({ success: false, error: 'Booking must be CONFIRMED to mark as SEATED' });

    await booking.update({ status: 'SEATED', seatedAt: new Date() });
    return res.status(200).json({ success: true, message: 'Marked as SEATED', data: booking });

  } catch (error) {
    console.error('markSeated error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Complete booking
exports.completeBooking = async (req, res) => {
  try {
    const { restaurantId } = req.body;
    const { id } = req.params;

    if (!restaurantId) return res.status(400).json({ success: false, error: 'restaurantId is required' });

    const booking = await DiningBooking.findOne({ where: { id, rest_id: restaurantId } });
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

    await booking.update({ status: 'COMPLETED', completedAt: new Date() });
    return res.status(200).json({ success: true, message: 'Booking completed', data: booking });

  } catch (error) {
    console.error('completeBooking error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== DINING SPACES ====================
// Get dining spaces
exports.getDiningSpaces = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId) {
      return res.status(400).json({ success: false, error: 'restaurantId is required' });
    }

    const restaurant = await RestaurantReg.findOne({
      where: { id: restaurantId, status: 'active' }
    });
    if (!restaurant) {
      return res.status(404).json({ success: false, error: 'Restaurant not found or inactive' });
    }

    const spaces = await DiningSpace.findAll({
      where: { rest_id: restaurantId, isActive: true },
      include: [
        {
          model: DiningEvent,
          as: 'events',
          required: false // important! don't filter out empty ones
          // remove "where: { isActive: true }" for now
        }
      ]
    });

    const totalCapacity = spaces.reduce((sum, s) => sum + s.seatingCapacity, 0);

    return res.status(200).json({
      success: true,
      data: { spaces, totalCapacity, acceptDiningBookings: true }
    });
  } catch (error) {
    console.error('getDiningSpaces error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};


// Create, Update, Delete DiningSpace
exports.createDiningSpace = async (req, res) => {
  try {
    const { restaurantId, areaName, seatingCapacity, description, photos } = req.body;
    if (!restaurantId || !areaName || !seatingCapacity) return res.status(400).json({ success: false, error: 'restaurantId, areaName, seatingCapacity required' });

    const restaurant = await RestaurantReg.findOne({ where: { id: restaurantId, status: 'active' } });
    if (!restaurant) return res.status(404).json({ success: false, error: 'Restaurant not found or inactive' });

    const space = await DiningSpace.create({
      rest_id: restaurantId,
      areaName,
      seatingCapacity,
      description,
      photos: Array.isArray(photos) ? photos : []
    });

    return res.status(201).json({ success: true, message: 'Dining space created', data: space });
  } catch (error) {
    console.error('createDiningSpace error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateDiningSpace = async (req, res) => {
  try {
    const { id } = req.params;
    const { areaName, seatingCapacity, description, photos } = req.body;

    const space = await DiningSpace.findOne({ where: { id, isActive: true } });
    if (!space) return res.status(404).json({ success: false, error: 'Dining space not found' });

    await space.update({
      areaName: areaName || space.areaName,
      seatingCapacity: seatingCapacity || space.seatingCapacity,
      description: description !== undefined ? description : space.description,
      photos: photos || space.photos
    });

    return res.status(200).json({ success: true, message: 'Dining space updated', data: space });
  } catch (error) {
    console.error('updateDiningSpace error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteDiningSpace = async (req, res) => {
  try {
    const { id } = req.params;
    const space = await DiningSpace.findOne({ where: { id, isActive: true } });
    if (!space) return res.status(404).json({ success: false, error: 'Dining space not found' });

    await space.update({ isActive: false });
    return res.status(200).json({ success: true, message: 'Dining space deleted' });
  } catch (error) {
    console.error('deleteDiningSpace error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== EVENTS ====================

// Get events
exports.getEvents = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId) return res.status(400).json({ success: false, error: 'restaurantId is required' });

    const events = await DiningEvent.findAll({
      where: { rest_id: restaurantId, isActive: true },
      include: [{ model: DiningSpace, as: 'diningArea', attributes: ['id', 'areaName'] }],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ success: true, data: events });
  } catch (error) {
    console.error('getEvents error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};



// CREATE EVENT
exports.createEvent = async (req, res) => {
  try {
    const {
      restaurantId,
      eventName,
      eventDescription,
      frequency,
      eventDay,
      eventDate,
      eventTime,
      associatedDiningArea,
      isActive
    } = req.body;

    if (!restaurantId || !eventName || !frequency || !eventTime)
      return res.status(400).json({ success: false, error: 'restaurantId, eventName, frequency, eventTime required' });

    const restaurant = await RestaurantReg.findOne({ where: { id: restaurantId, status: 'active' } });
    if (!restaurant) return res.status(404).json({ success: false, error: 'Restaurant not found or inactive' });

    const event = await DiningEvent.create({
      rest_id: restaurantId,
      eventName,
      eventDescription,
      frequency,
      eventDay,
      eventDate,
      eventTime,
      associatedDiningArea,
      isActive: isActive !== undefined ? isActive : true
    });

    return res.status(201).json({
      success: true,
      message: 'Event created',
      data: event
    });

  } catch (error) {
    console.error('createEvent error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// UPDATE EVENT
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await DiningEvent.findOne({ where: { id, isActive: true } });
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

    await event.update(req.body);

    return res.status(200).json({
      success: true,
      message: 'Event updated',
      data: event
    });

  } catch (error) {
    console.error('updateEvent error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE EVENT (soft delete)
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await DiningEvent.findOne({ where: { id, isActive: true } });
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

    await event.update({ isActive: false });
    return res.status(200).json({ success: true, message: 'Event deleted' });

  } catch (error) {
    console.error('deleteEvent error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};