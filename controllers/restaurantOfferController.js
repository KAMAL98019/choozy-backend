const { Offer, RestaurantReg } = require('../models');
const { Op } = require('sequelize');

// Create Offer (Restaurant)
exports.createOffer = async (req, res) => {
  try {
    const { restaurantId } = req.body;

    if (!restaurantId)
      return res.status(400).json({ success: false, message: 'restaurantId is required' });

    let offerImage = null;
    if (req.file) {
      offerImage = `offers/${req.file.filename}`;
    }

    const offer = await Offer.create({
      ...req.body,
      restaurantId,
      offerImage,
      approvalStatus: 'PENDING',
      status: 'INACTIVE',
    });

    res.status(201).json({
      success: true,
      message: 'Offer created successfully. Waiting for admin approval.',
      data: offer,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Offer (Restaurant)
exports.updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurantId } = req.body;

    const offer = await Offer.findOne({ where: { id, restaurantId } });
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

    if (offer.approvalStatus === 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: 'Cannot edit approved offer. Please create a new one.',
      });
    }

    let offerImage = offer.offerImage;
    if (req.file) {
      offerImage = `offers/${req.file.filename}`;
    }

    await offer.update({
      ...req.body,
      offerImage,
      approvalStatus: 'PENDING',
    });

    res.json({ success: true, message: 'Offer updated successfully', data: offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Get Restaurant's Offers by Status
exports.getRestaurantOffers = async (req, res) => {
  try {
    const { restaurantId, statusFilter } = req.query; // Pass restaurantId in query
    
    if (!restaurantId) {
      return res.status(400).json({ success: false, message: 'restaurantId is required' });
    }
    
    let whereClause = { restaurantId };
    const now = new Date();
    
    if (statusFilter === 'active') {
      // Active: Approved + Active + Not Expired
      whereClause.approvalStatus = 'APPROVED';
      whereClause.status = 'ACTIVE';
      whereClause.endDate = { [Op.gte]: now };
    } else if (statusFilter === 'pending') {
      // Pending: Waiting for admin action
      whereClause.approvalStatus = { [Op.in]: ['PENDING', 'CHANGES_REQUESTED'] };
    } else if (statusFilter === 'expired') {
      // Expired: End date passed
      whereClause.endDate = { [Op.lt]: now };
    }
    
    const offers = await Offer.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ success: true, count: offers.length, data: offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// Delete Offer
exports.deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurantId } = req.body;
    
    const offer = await Offer.findOne({ where: { id, restaurantId } });
    
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }
    
    await offer.destroy();
    
    res.json({ success: true, message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Single Offer Details
exports.getOfferById = async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurantId } = req.query;
    
    const offer = await Offer.findOne({ 
      where: { id, restaurantId },
      include: [
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'restaurantName', 'email', 'mobile']
        }
      ]
    });
    
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }
    
    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};