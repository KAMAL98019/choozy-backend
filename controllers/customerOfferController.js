const { UserOffer, Offer, User, RestaurantReg } = require('../models');
const { Op } = require('sequelize');

// Get Active Offers (Only approved and active offers visible to customers)
exports.getActiveOffers = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    const now = new Date();

    // Base filter
    let whereClause = {};
    if (restaurantId) whereClause.restaurantId = restaurantId;

    const offers = await Offer.findAll({
      where: whereClause,
      include: [
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'rest_name', 'rest_logo', 'contact_email', 'contact_number', 'rest_address']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const filteredOffers = offers.filter(offer => {
      const reasons = [];
      if (offer.approvalStatus !== 'APPROVED') reasons.push('Not approved');
      if (offer.status !== 'ACTIVE') reasons.push('Not active');
      if (new Date(offer.startDate) > now) reasons.push('Not started yet');
      if (new Date(offer.endDate) < now) reasons.push('Expired');

      offer.debugReasons = reasons; // attach reasons
      return reasons.length === 0;  // keep only valid offers
    });

    res.json({
      success: true,
      totalOffers: offers.length,
      validOffers: filteredOffers.length,
      data: filteredOffers,
      debug: offers.map(o => ({ id: o.id, debugReasons: o.debugReasons }))
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOfferDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();

    const offer = await Offer.findByPk(id, {
      include: [
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'rest_name', 'rest_logo', 'contact_email', 'contact_number', 'rest_address']
        }
      ]
    });

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found in DB' });
    }

    // Check each condition
    const debugReasons = [];
    if (offer.approvalStatus !== 'APPROVED') debugReasons.push('Not approved');
    if (offer.status !== 'ACTIVE') debugReasons.push('Not active');
    if (new Date(offer.startDate) > now) debugReasons.push('Not started yet');
    if (new Date(offer.endDate) < now) debugReasons.push('Expired');

    if (debugReasons.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Offer found but not available',
        debugReasons
      });
    }

    res.json({ success: true, data: offer });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};





// Book/Claim an offer
exports.bookOffer = async (req, res) => {
  try {
    const { userId, offerId } = req.body;
    
    if (!userId || !offerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId and offerId are required' 
      });
    }
    
    // Check if offer exists and is active
    const offer = await Offer.findOne({
      where: {
        id: offerId,
        approvalStatus: 'APPROVED',
        status: 'ACTIVE',
        startDate: { [Op.lte]: new Date() },
        endDate: { [Op.gte]: new Date() }
      }
    });
    
    if (!offer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Offer not found or not active' 
      });
    }
    
    // Check how many times user has booked this offer
    const userBookingCount = await UserOffer.count({
      where: { userId, offerId }
    });
    
    if (userBookingCount >= offer.maxUsagePerUser) {
      return res.status(400).json({ 
        success: false, 
        message: `You have already booked this offer ${offer.maxUsagePerUser} time(s)` 
      });
    }
    
    // Check total usage limit
    if (offer.totalUsageLimit) {
      const totalBookings = await UserOffer.count({
        where: { offerId }
      });
      
      if (totalBookings >= offer.totalUsageLimit) {
        return res.status(400).json({ 
          success: false, 
          message: 'This offer has reached its maximum usage limit' 
        });
      }
    }
    
    // Create booking
    const booking = await UserOffer.create({
      userId,
      offerId,
      status: 'BOOKED',
      expiresAt: offer.endDate
    });
    
    res.status(201).json({
      success: true,
      message: 'Offer booked successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user's booked offers
exports.getUserBookedOffers = async (req, res) => {
  try {
    const { userId } = req.query;
    const { status } = req.query; // 'BOOKED', 'USED', 'EXPIRED'
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }
    
    let whereClause = { userId };
    
    if (status) {
      whereClause.status = status;
    }
    
    const bookings = await UserOffer.findAll({
      where: whereClause,
      include: [
        {
          model: Offer,
          as: 'offer',
          include: [
            {
              model: RestaurantReg,
              as: 'restaurant',
              attributes: ['id', 'rest_name', 'rest_logo', 'contact_email', 'contact_number', 'rest_address']
            }
          ]
        }
      ],
      order: [['bookedAt', 'DESC']]
    });
    
    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel booked offer
exports.cancelBookedOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    const booking = await UserOffer.findOne({
      where: { id, userId }
    });
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    if (booking.status !== 'BOOKED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot cancel this offer' 
      });
    }
    
    await booking.update({ status: 'CANCELLED' });
    
    res.json({ success: true, message: 'Offer booking cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};