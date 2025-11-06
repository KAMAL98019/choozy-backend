'use strict';

const { DiningBooking, RestaurantReg, DiningSpace, User, sequelize,DiningEvent } = require('../../models');
const { Op } = require('sequelize');

/**
 * ✅ Get All Bookings (Simple - No Approval Workflow)
 */
exports.getAllBookings = async (req, res) => {
  try {
    const { status, search, dateRange, page = 1, pageSize = 20 } = req.query;

    const where = {};

    // 🔹 Status Filter
    if (status) {
      const statusMap = {
        Confirmed: ['CONFIRMED', 'ADMIN_VERIFIED'],
        Cancelled: 'CANCELLED',
        Completed: 'COMPLETED',
      };
      const mappedStatus = statusMap[status];
      if (Array.isArray(mappedStatus)) {
        where.status = { [Op.in]: mappedStatus };
      } else if (mappedStatus) {
        where.status = mappedStatus;
      }
    }

    // 🔹 Search Filter
    if (search) {
      where[Op.or] = [
        { bookingNumber: { [Op.like]: `%${search}%` } },
        { '$user.name$': { [Op.like]: `%${search}%` } },
        { '$user.mobile$': { [Op.like]: `%${search}%` } },
        { '$restaurant.rest_name$': { [Op.like]: `%${search}%` } },
      ];
    }

    // 🔹 Date Range Filter
    if (dateRange) {
      const [start, end] = dateRange.split(',');
      if (start && end) {
        where.bookingDate = { [Op.between]: [new Date(start), new Date(end)] };
      }
    }

    const limit = Math.min(Number(pageSize) || 20, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const { count, rows } = await DiningBooking.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'mobile', 'email'],
        },
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'rest_name', 'rest_address', 'contact_number'],
        },
        {
          model: DiningSpace,
          as: 'diningArea',
          attributes: ['id', 'areaName'],
          required: false,
        },
        {
          model: DiningEvent,
          as: 'event',
          attributes: ['id', 'eventName'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    // 🔹 Format clean data for frontend
    const formattedBookings = rows.map((b) => ({
      id: b.id,
      bookingId: b.bookingNumber || b.id,
      customerName: b.user ? b.user.name : 'N/A',
      restaurantName: b.restaurant ? b.restaurant.rest_name : 'N/A',
      eventName: b.event ? b.event.eventName : 'N/A',
      dateTime: `${b.bookingDate || ''} ${b.bookingTime || ''}`,
      guests: b.numberOfGuests || 0,
      status:
        b.status === 'ADMIN_VERIFIED' || b.status === 'CONFIRMED'
          ? 'Confirmed'
          : b.status === 'COMPLETED'
          ? 'Completed'
          : b.status === 'CANCELLED'
          ? 'Cancelled'
          : 'Pending',
    }));

    return res.status(200).json({
      success: true,
      data: {
        bookings: formattedBookings,
        total: count,
        page: Number(page),
        pageSize: limit,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error in getAllBookings:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch bookings',
    });
  }
};

/**
 * ✅ Get Booking Details (View Only)
 */
exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await DiningBooking.findOne({
      where: { id },
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'mobile', 'email'] },
        { model: RestaurantReg, as: 'restaurant', attributes: ['id', 'rest_name', 'rest_address', 'contact_number', 'contact_email'] },
        { model: DiningSpace, as: 'diningArea', attributes: ['id', 'areaName', 'seatingCapacity'] },
        { model: DiningEvent, as: 'event', attributes: ['id', 'eventName', 'isAdminVerified'] }
      ],
    });

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const timeline = [
      { event: 'Booking Placed', timestamp: booking.createdAt || booking.bookedAt, status: 'completed' },
      { event: 'Restaurant Confirmed', timestamp: booking.restaurantConfirmedAt, status: booking.restaurantConfirmedAt ? 'completed' : 'pending' },
      { event: 'Marked as Seated', timestamp: booking.seatedAt, status: booking.seatedAt ? 'completed' : 'pending' },
      { event: 'Completed', timestamp: booking.completedAt, status: booking.completedAt ? 'completed' : 'pending' },
    ];

    return res.status(200).json({ 
      success: true, 
      data: { ...booking.toJSON(), timeline } 
    });
  } catch (error) {
    console.error('Error in getBookingById:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch booking details' 
    });
  }
};

/**
 * ✅ Booking stats for admin
 */
exports.getBookingStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate && endDate) {
      where.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    const statusCounts = await DiningBooking.findAll({
      where,
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    const totalBookings = await DiningBooking.count({ where });

    const popularRestaurants = await DiningBooking.findAll({
      where,
      attributes: ['rest_id', [sequelize.fn('COUNT', sequelize.col('id')), 'bookingCount']],
      include: [{ model: RestaurantReg, as: 'restaurant', attributes: ['rest_name'] }],
      group: ['rest_id'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 10,
      raw: true,
    });

    const popularEvents = await DiningBooking.findAll({
      where,
      attributes: ['eventId', [sequelize.fn('COUNT', sequelize.col('id')), 'bookingCount']],
      include: [{ model: DiningEvent, as: 'event', attributes: ['eventName'] }],
      group: ['eventId'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 10,
      raw: true,
    });

    return res.status(200).json({ 
      success: true, 
      data: { 
        statusCounts, 
        totalBookings, 
        popularRestaurants,
        popularEvents 
      } 
    });
  } catch (error) {
    console.error('Error in getBookingStats:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch booking statistics' 
    });
  }
};


/**
 * ✅ Get All Pending Events for Approval
 */
exports.getPendingEvents = async (req, res) => {
  try {
    const { search, page = 1, pageSize = 20 } = req.query;

    // Only get events that are NOT admin verified
    const where = { isAdminVerified: false };

    // 🔹 Search Filter
    if (search) {
      where[Op.or] = [
        { eventName: { [Op.like]: `%${search}%` } },
        { '$restaurant.rest_name$': { [Op.like]: `%${search}%` } },
      ];
    }

    const limit = Math.min(Number(pageSize) || 20, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const { count, rows } = await DiningEvent.findAndCountAll({
      where,
      include: [
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'rest_name', 'rest_address', 'contact_number'],
        },
        {
          model: DiningSpace,
          as: 'diningArea',
          attributes: ['id', 'areaName'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    // Format data for frontend matching Image 1
    const formattedEvents = rows.map((event) => ({
      id: event.id,
      requestId: `#REQ-${event.id.substring(0, 5)}`, // Format like #REQ-00124
      restaurantName: event.restaurant ? event.restaurant.rest_name : 'N/A',
      dateSubmitted: event.createdAt,
      status: 'Awaiting Review',
    }));

    return res.status(200).json({
      success: true,
      data: {
        events: formattedEvents,
        total: count,
        page: Number(page),
        pageSize: limit,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error in getPendingEvents:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch pending events',
    });
  }
};

/**
 * ✅ Get Event Details for Approval Review (UPDATED)
 */
exports.getEventForApproval = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📥 Fetching event for approval:', id);

    const event = await DiningEvent.findOne({
      where: { id },
      include: [
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'rest_name', 'rest_address', 'contact_number', 'contact_email'],
        },
        {
          model: DiningSpace,
          as: 'diningArea',
          attributes: [
            'id',
            'areaName',
            'seatingCapacity',
            'description',
            'photos',
          ],
        },
      ],
    });

    if (!event) {
      console.log('❌ Event not found:', id);
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    // ✅ Convert Sequelize instance to plain object
    const eventData = event.toJSON();

    // ✅ Parse photos if they exist and are a string
    if (eventData.diningArea && eventData.diningArea.photos) {
      console.log('🔍 Raw photos data:', eventData.diningArea.photos);
      console.log('🔍 Photos type:', typeof eventData.diningArea.photos);

      if (typeof eventData.diningArea.photos === 'string') {
        try {
          eventData.diningArea.photos = JSON.parse(eventData.diningArea.photos);
          console.log('✅ Successfully parsed photos:', eventData.diningArea.photos);
        } catch (e) {
          console.error('❌ Failed to parse photos JSON:', e);
          eventData.diningArea.photos = [];
        }
      }

      // ✅ Ensure it's always an array
      if (!Array.isArray(eventData.diningArea.photos)) {
        console.warn('⚠️ Photos is not an array, converting to empty array');
        eventData.diningArea.photos = [];
      }

      console.log('📤 Final photos array:', eventData.diningArea.photos);
    } else {
      console.log('⚠️ No dining area or photos found');
      if (eventData.diningArea) {
        eventData.diningArea.photos = [];
      }
    }

    console.log('✅ Sending event data with photos');

    return res.status(200).json({
      success: true,
      data: eventData,
    });
  } catch (error) {
    console.error('❌ Error in getEventForApproval:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch event details',
    });
  }
};

/**
 * ✅ Approve Event (Admin Verification)
 */
exports.approveEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await DiningEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        error: 'Event not found' 
      });
    }

    if (event.isAdminVerified) {
      return res.status(400).json({ 
        success: false, 
        error: 'Event already verified' 
      });
    }

    // ✅ Approve the event and make it active
    await event.update({
      isAdminVerified: true,
      isActive: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Event approved successfully. Customers can now book.',
      data: event,
    });
  } catch (error) {
    console.error('Error in approveEvent:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve event',
    });
  }
};

/**
 * ✅ Reject Event with Reason
 */
exports.rejectEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required',
      });
    }

    const event = await DiningEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        error: 'Event not found' 
      });
    }

    if (event.isAdminVerified) {
      return res.status(400).json({ 
        success: false, 
        error: 'Event already verified' 
      });
    }

    // ✅ Mark event as rejected and inactive
    await event.update({
      isAdminVerified: false,
      isActive: false,
      rejectionReason: reason, // Store rejection reason
    });

    return res.status(200).json({
      success: true,
      message: 'Event rejected successfully',
      data: event,
    });
  } catch (error) {
    console.error('Error in rejectEvent:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to reject event',
    });
  }
};

/**
 * ✅ Get All Events (Admin view - both verified and unverified)
 */
exports.getAllEvents = async (req, res) => {
  try {
    const { status, search, page = 1, pageSize = 20 } = req.query;

    const where = {};

    // 🔹 Status Filter
    if (status === 'Approved') {
      where.isAdminVerified = true;
    } else if (status === 'Rejected') {
      where.isAdminVerified = false;
      where.isActive = false;
    }

    // 🔹 Search Filter
    if (search) {
      where[Op.or] = [
        { eventName: { [Op.like]: `%${search}%` } },
        { '$restaurant.rest_name$': { [Op.like]: `%${search}%` } },
      ];
    }

    const limit = Math.min(Number(pageSize) || 20, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const { count, rows } = await DiningEvent.findAndCountAll({
      where,
      include: [
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'rest_name'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const formattedEvents = rows.map((event) => ({
      id: event.id,
      eventName: event.eventName,
      restaurantName: event.restaurant ? event.restaurant.rest_name : 'N/A',
      frequency: event.frequency,
      isVerified: event.isAdminVerified,
      isActive: event.isActive,
      createdAt: event.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        events: formattedEvents,
        total: count,
        page: Number(page),
        pageSize: limit,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error in getAllEvents:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch events',
    });
  }
};

/**
 * ✅ Get Event Statistics
 */
exports.getEventStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    
    if (startDate && endDate) {
      where.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    const totalEvents = await DiningEvent.count({ where });
    const verifiedEvents = await DiningEvent.count({ 
      where: { ...where, isAdminVerified: true } 
    });
    const pendingEvents = await DiningEvent.count({ 
      where: { ...where, isAdminVerified: false, isActive: true } 
    });
    const rejectedEvents = await DiningEvent.count({ 
      where: { ...where, isAdminVerified: false, isActive: false } 
    });

    return res.status(200).json({
      success: true,
      data: {
        totalEvents,
        verifiedEvents,
        pendingEvents,
        rejectedEvents,
      },
    });
  } catch (error) {
    console.error('Error in getEventStats:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch event statistics',
    });
  }
};










