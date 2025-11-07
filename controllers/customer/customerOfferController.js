const { UserOffer, Offer, User, RestaurantReg, FoodItem, Category } = require('../../models');
const { Op } = require('sequelize');

// Get Active Offers for Customer (with category-based filtering)
exports.getActiveOffers = async (req, res) => {
  try {
    const { restaurantId, categoryId } = req.query;
    const now = new Date();

    // Base filter - only APPROVED and ACTIVE offers
    let whereClause = {
      approvalStatus: 'APPROVED',
      status: 'ACTIVE',
      startDate: { [Op.lte]: now },
      endDate: { [Op.gte]: now }
    };

    // Filter by restaurant if provided
    if (restaurantId) {
      whereClause[Op.or] = [
        { restaurantId: restaurantId },
        { restaurantId: null, offerType: 'ADMIN' } // Include global admin offers
      ];
    }

    // Filter by category if provided
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    const offers = await Offer.findAll({
      where: whereClause,
      include: [
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'rest_name', 'rest_logo', 'contact_email', 'contact_number', 'rest_address'],
          required: false
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: offers.length,
      data: offers
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Offer Details
exports.getOfferDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();

    const offer = await Offer.findOne({
      where: {
        id,
        approvalStatus: 'APPROVED',
        status: 'ACTIVE',
        startDate: { [Op.lte]: now },
        endDate: { [Op.gte]: now }
      },
      include: [
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'rest_name', 'rest_logo', 'contact_email', 'contact_number', 'rest_address'],
          required: false
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    if (!offer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Offer not found or not available' 
      });
    }

    res.json({ success: true, data: offer });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Food Items with Applicable Offers
exports.getFoodItemsWithOffers = async (req, res) => {
  try {
    const { restaurantId, categoryId } = req.query;
    const now = new Date();

    if (!restaurantId) {
      return res.status(400).json({ 
        success: false, 
        message: 'restaurantId is required' 
      });
    }

    // Fetch food items
    let foodWhere = { rest_id: restaurantId };
    if (categoryId) {
      foodWhere.categoryId = categoryId;
    }

    const foodItems = await FoodItem.findAll({
      where: foodWhere,
      include: [
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'rest_name', 'rest_logo']
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ]
    });

    // Fetch all applicable offers for this restaurant
    const offers = await Offer.findAll({
      where: {
        approvalStatus: 'APPROVED',
        status: 'ACTIVE',
        startDate: { [Op.lte]: now },
        endDate: { [Op.gte]: now },
        [Op.or]: [
          { restaurantId: restaurantId },
          { restaurantId: null, offerType: 'ADMIN' }
        ]
      },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ]
    });

    // Map offers to food items based on category
    const foodItemsWithOffers = foodItems.map(item => {
      const itemData = item.toJSON();
      
      // Find applicable offers for this food item's category
      const applicableOffers = offers.filter(offer => {
        // If offer has no category, it applies to all items in the restaurant
        if (!offer.categoryId) return true;
        // If offer has category, match with food item's category
        return offer.categoryId === item.categoryId;
      });

      // Calculate best discount
      let bestOffer = null;
      let discountedPrice = itemData.price;
      let maxDiscount = 0;

      applicableOffers.forEach(offer => {
        let discount = 0;
        
        if (offer.discountType === 'PERCENTAGE') {
          discount = (itemData.price * offer.discountValue) / 100;
        } else if (offer.discountType === 'FLAT') {
          discount = offer.discountValue;
        }

        if (discount > maxDiscount) {
          maxDiscount = discount;
          bestOffer = {
            id: offer.id,
            title: offer.title,
            discountType: offer.discountType,
            discountValue: offer.discountValue,
            categoryName: offer.category?.name || 'All Items'
          };
          discountedPrice = Math.max(0, itemData.price - discount);
        }
      });

      return {
        ...itemData,
        originalPrice: itemData.price,
        discountedPrice: parseFloat(discountedPrice.toFixed(2)),
        discount: parseFloat(maxDiscount.toFixed(2)),
        discountPercentage: itemData.price > 0 ? 
          parseFloat(((maxDiscount / itemData.price) * 100).toFixed(2)) : 0,
        hasOffer: !!bestOffer,
        appliedOffer: bestOffer,
        availableOffers: applicableOffers.map(o => ({
          id: o.id,
          title: o.title,
          discountType: o.discountType,
          discountValue: o.discountValue
        }))
      };
    });

    res.json({
      success: true,
      count: foodItemsWithOffers.length,
      data: foodItemsWithOffers
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Calculate Offer on Single Food Item
exports.calculateOfferForItem = async (req, res) => {
  try {
    const { foodItemId } = req.params;
    const now = new Date();

    const foodItem = await FoodItem.findByPk(foodItemId, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'rest_name']
        }
      ]
    });

    if (!foodItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Food item not found' 
      });
    }

    // Find applicable offers
    const offers = await Offer.findAll({
      where: {
        approvalStatus: 'APPROVED',
        status: 'ACTIVE',
        startDate: { [Op.lte]: now },
        endDate: { [Op.gte]: now },
        [Op.or]: [
          { restaurantId: foodItem.rest_id },
          { restaurantId: null, offerType: 'ADMIN' }
        ]
      }
    });

    // Filter offers by category
    const applicableOffers = offers.filter(offer => {
      if (!offer.categoryId) return true; // No category = applies to all
      return offer.categoryId === foodItem.categoryId;
    });

    // Calculate best discount
    let bestOffer = null;
    let discountedPrice = foodItem.price;
    let maxDiscount = 0;

    applicableOffers.forEach(offer => {
      let discount = 0;
      
      if (offer.discountType === 'PERCENTAGE') {
        discount = (foodItem.price * offer.discountValue) / 100;
      } else if (offer.discountType === 'FLAT') {
        discount = offer.discountValue;
      }

      if (discount > maxDiscount) {
        maxDiscount = discount;
        bestOffer = offer;
        discountedPrice = Math.max(0, foodItem.price - discount);
      }
    });

    res.json({
      success: true,
      data: {
        foodItem: {
          id: foodItem.id,
          dishname: foodItem.dishname,
          originalPrice: foodItem.price,
          category: foodItem.category?.name
        },
        pricing: {
          originalPrice: foodItem.price,
          discount: parseFloat(maxDiscount.toFixed(2)),
          discountedPrice: parseFloat(discountedPrice.toFixed(2)),
          discountPercentage: foodItem.price > 0 ? 
            parseFloat(((maxDiscount / foodItem.price) * 100).toFixed(2)) : 0
        },
        appliedOffer: bestOffer ? {
          id: bestOffer.id,
          title: bestOffer.title,
          description: bestOffer.description,
          discountType: bestOffer.discountType,
          discountValue: bestOffer.discountValue,
          minOrderValue: bestOffer.minOrderValue,
          termsConditions: bestOffer.termsConditions
        } : null,
        hasOffer: !!bestOffer,
        totalApplicableOffers: applicableOffers.length
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Offers by Restaurant and Category
exports.getOffersByRestaurantAndCategory = async (req, res) => {
  try {
    const { restaurantId, categoryId } = req.query;
    const now = new Date();

    if (!restaurantId) {
      return res.status(400).json({ 
        success: false, 
        message: 'restaurantId is required' 
      });
    }

    let whereClause = {
      approvalStatus: 'APPROVED',
      status: 'ACTIVE',
      startDate: { [Op.lte]: now },
      endDate: { [Op.gte]: now },
      [Op.or]: [
        { restaurantId: restaurantId },
        { restaurantId: null, offerType: 'ADMIN' }
      ]
    };

    if (categoryId) {
      whereClause[Op.and] = [
        {
          [Op.or]: [
            { categoryId: categoryId },
            { categoryId: null } // Include offers for all categories
          ]
        }
      ];
    }

    const offers = await Offer.findAll({
      where: whereClause,
      include: [
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'rest_name', 'rest_logo'],
          required: false
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['discountValue', 'DESC']]
    });

    res.json({
      success: true,
      count: offers.length,
      data: offers
    });

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
    
    const now = new Date();
    
    // Check if offer exists and is active
    const offer = await Offer.findOne({
      where: {
        id: offerId,
        approvalStatus: 'APPROVED',
        status: 'ACTIVE',
        startDate: { [Op.lte]: now },
        endDate: { [Op.gte]: now }
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
    const { status } = req.query;
    
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
            },
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name']
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

module.exports = exports;