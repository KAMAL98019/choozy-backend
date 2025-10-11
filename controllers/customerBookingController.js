'use strict';

const { DiningBooking, RestaurantReg, DiningSpace, DiningEvent, User } = require('../models');
const { Op } = require('sequelize');

const { v4: uuidv4 } = require('uuid');


// -------------------- Get all restaurants --------------------
const getRestaurants = async (req, res) => {
  try {
    const { search, date } = req.query;

    const where = { status: 'active' };

    if (search) {
      where[Op.or] = [
        { rest_name: { [Op.like]: `%${search}%` } },
        { rest_address: { [Op.like]: `%${search}%` } }
      ];
    }

    const restaurants = await RestaurantReg.findAll({
      where,
      attributes: ['id', 'rest_name', 'rest_address', 'avg_cost_two', 'rest_logo', 'contact_number'],
      include: [
        {
          model: DiningSpace,
          as: 'diningArea',
          where: { isActive: true },
          required: false,
          attributes: ['id', 'areaName', 'seatingCapacity']
        },
        {
          model: DiningEvent,
          as: 'events',
          where: { isActive: true },
          required: false,
          attributes: ['id', 'eventName', 'eventDay', 'eventTime']
        }
      ]
    });

    return res.status(200).json({ success: true, data: restaurants });
  } catch (error) {
    console.error('Error in getRestaurants:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch restaurants' });
  }
};

// -------------------- Get restaurant details --------------------
const getRestaurantDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await RestaurantReg.findOne({
      where: { id, status: 'active' },
      attributes: [
        'id', 'rest_name', 'rest_address', 'avg_cost_two',
        'rest_logo', 'contact_number', 'contact_email', 'operational_hours'
      ],
      include: [
        {
          model: DiningSpace,
          as: 'diningArea',
          where: { isActive: true },
          required: false,
          attributes: ['id', 'areaName', 'seatingCapacity']
        },
        {
          model: DiningEvent,
          as: 'events',
          where: { isActive: true },
          required: false,
          attributes: ['id', 'eventName', 'eventDay', 'eventTime']
        }
      ]
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, error: 'Restaurant not found' });
    }

    return res.status(200).json({ success: true, data: restaurant });
  } catch (error) {
    console.error('Error in getRestaurantDetails:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch restaurant details' });
  }
};

// -------------------- Get available time slots --------------------
const getAvailableTimeSlots = async (req, res) => {
  try {
    const restaurantId = req.params.id;
    const { date, guests } = req.query;

    if (!restaurantId || !date) {
      return res.status(400).json({ success: false, error: 'Restaurant ID and date are required' });
    }

    const existingBookings = await DiningBooking.findAll({
      where: {
        rest_id: restaurantId,
        bookingDate: date,
        status: { [Op.in]: ['PENDING', 'ADMIN_VERIFIED', 'CONFIRMED', 'SEATED'] }
      },
      attributes: ['bookingTime', 'numberOfGuests']
    });

    const diningSpaces = await DiningSpace.findAll({
      where: { rest_id: restaurantId, isActive: true },
      attributes: ['seatingCapacity']
    });

    const totalCapacity = diningSpaces.reduce((sum, space) => sum + space.seatingCapacity, 0);

    const timeSlots = [];
    for (let hour = 17; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const bookedGuests = existingBookings
          .filter(b => b.bookingTime === `${time}:00`)
          .reduce((sum, b) => sum + b.numberOfGuests, 0);

        const available = (totalCapacity - bookedGuests) >= (parseInt(guests) || 1);
        timeSlots.push({ time, available, remainingSeats: totalCapacity - bookedGuests });
      }
    }

    return res.status(200).json({ success: true, data: { date, totalCapacity, timeSlots } });
  } catch (error) {
    console.error('Error in getAvailableTimeSlots:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch time slots' });
  }
};

// -------------------- Create booking --------------------


const createBooking = async (req, res) => {
  try {
    const { userId, restaurantId, eventId, bookingDate, bookingTime, numberOfGuests, specialRequests, purpose } = req.body;

    // Required fields
    if (!userId || !restaurantId || !eventId || !bookingDate || !bookingTime || !numberOfGuests) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Validate event
    const event = await DiningEvent.findOne({
      where: { id: eventId, rest_id: restaurantId, isActive: true }
    });
    if (!event) return res.status(404).json({ success: false, error: 'Event not found or inactive' });

    // Must be admin verified
    if (!event.isAdminVerified) {
      return res.status(403).json({ success: false, error: 'Event not verified by admin yet' });
    }

    // Validate user & restaurant
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const restaurant = await RestaurantReg.findByPk(restaurantId);
    if (!restaurant) return res.status(404).json({ success: false, error: 'Restaurant not found' });

    // Create booking
    const booking = await DiningBooking.create({
      bookingNumber: uuidv4(),
      rest_id: restaurantId,
      eventId,
      userId,
      customerName: user.name,
      customerPhone: user.phone || user.mobile,
      customerEmail: user.email,
      bookingDate,
      bookingTime,
      numberOfGuests,
      specialRequests,
      purpose,
      status: 'CONFIRMED', // directly confirmed because event is verified
      bookedAt: new Date()
    });

    return res.status(201).json({ success: true, message: 'Booking created successfully', data: booking });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
};



// -------------------- Get user's bookings --------------------
const getMyBookings = async (req, res) => {
  try {
    const { userId, status, page = 1, pageSize = 10 } = req.query;

    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });

    const where = { userId };
    if (status) where.status = status;

    const limit = Math.min(Number(pageSize) || 10, 50);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const { count, rows: bookings } = await DiningBooking.findAndCountAll({
      where,
      include: [
        { model: RestaurantReg, as: 'restaurant', attributes: ['id', 'rest_name', 'rest_address', 'rest_logo', 'contact_number'] },
        { model: DiningSpace, as: 'diningArea', attributes: ['id', 'areaName', 'seatingCapacity'] }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return res.status(200).json({ 
      success: true, 
      data: { bookings, total: count, page: Number(page), pageSize: limit, pages: Math.ceil(count / limit) } 
    });
  } catch (error) {
    console.error('Error in getMyBookings:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch bookings' });
  }
};

// -------------------- Get booking details --------------------
const getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });

    const booking = await DiningBooking.findOne({
      where: { id, userId },
      include: [
        { model: RestaurantReg, as: 'restaurant', attributes: ['id', 'rest_name', 'rest_address', 'contact_number', 'contact_email'] },
        { model: DiningSpace, as: 'diningArea', attributes: ['id', 'areaName', 'seatingCapacity', 'photos'] }
      ]
    });

    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

    return res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error('Error in getBookingDetails:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch booking details' });
  }
};

// -------------------- Cancel booking --------------------
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, reason } = req.body;

    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });

    const booking = await DiningBooking.findOne({ where: { id, userId } });
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

    if (booking.status === 'CANCELLED') return res.status(400).json({ success: false, error: 'Booking already cancelled' });
    if (booking.status === 'COMPLETED') return res.status(400).json({ success: false, error: 'Cannot cancel completed booking' });

    await booking.update({ 
      status: 'CANCELLED', 
      cancellationReason: reason || 'Cancelled by customer', 
      cancelledBy: 'CUSTOMER', 
      cancelledAt: new Date() 
    });

    return res.status(200).json({ success: true, message: 'Booking cancelled successfully', data: booking });
  } catch (error) {
    console.error('Error in cancelBooking:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to cancel booking' });
  }
};

// -------------------- Export --------------------
module.exports = {
  getRestaurants,
  getRestaurantDetails,
  getAvailableTimeSlots,
  createBooking,
  getMyBookings,
  getBookingDetails,
  cancelBooking
};
