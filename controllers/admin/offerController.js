const { Offer, RestaurantReg, Category, Admin } = require('../../models');
const { Op } = require('sequelize');

/** -----------------------------
 *  Admin Offer Review Controller
 * ----------------------------- */

// 🔹 Get all pending or changes-requested offers
exports.getPendingOffers = async (req, res) => {
  try {
    const offers = await Offer.findAll({
      where: { 
        approvalStatus: { [Op.in]: ['PENDING', 'CHANGES_REQUESTED'] },
        offerType: 'RESTAURANT'
      },
      include: [
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'rest_name', 'rest_logo', 'contact_email', 'contact_number', 'rest_address'],
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'ASC']],
    });

    res.json({ success: true, count: offers.length, data: offers });
  } catch (error) {
    console.error('Error fetching pending offers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Get all offers (filter by status or restaurant)
exports.getAllOffers = async (req, res) => {
  try {
    const { approvalStatus, restaurantId, search, offerType, discountValue, page = 1, pageSize = 6 } = req.query;
    const whereClause = { offerType: 'RESTAURANT' };

    if (approvalStatus) whereClause.approvalStatus = approvalStatus;
    if (restaurantId) whereClause.restaurantId = restaurantId;
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { '$restaurant.rest_name$': { [Op.like]: `%${search}%` } }
      ];
    }
    if (offerType) {
      whereClause.discountType = offerType === 'Percentage' ? 'PERCENTAGE' : 'FLAT';
    }
    if (discountValue) {
      whereClause.discountValue = discountValue;
    }

    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const { count, rows: offers } = await Offer.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'rest_name', 'rest_logo', 'contact_email', 'contact_number', 'rest_address'],
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(pageSize),
      offset: offset,
      subQuery: false
    });

    res.json({ success: true, count, data: offers });
  } catch (error) {
    console.error('Error fetching all offers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Approve an offer
exports.approveOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    const offer = await Offer.findByPk(id, {
      include: [
        { 
          model: RestaurantReg, 
          as: 'restaurant', 
          attributes: ['rest_name', 'contact_email'] 
        }
      ],
    });

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    if (offer.approvalStatus === 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Offer already approved' });
    }

    const adminId = req.admin?.id || 'SYSTEM';

    await offer.update({
      approvalStatus: 'APPROVED',
      status: 'ACTIVE',
      approvedBy: adminId,
      approvalDate: new Date(),
      rejectionReason: null,
      adminComments: comments || null,
    });

    res.json({
      success: true,
      message: 'Offer approved successfully',
      data: offer,
    });
  } catch (error) {
    console.error('Error approving offer:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Reject Offer
exports.rejectOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const offer = await Offer.findByPk(id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    const adminId = req.admin?.id || 'SYSTEM';

    await offer.update({
      approvalStatus: 'REJECTED',
      status: 'INACTIVE',
      approvedBy: adminId,
      approvalDate: new Date(),
      rejectionReason: reason,
      adminComments: null,
    });

    res.json({
      success: true,
      message: 'Offer rejected successfully',
      data: offer,
    });
  } catch (error) {
    console.error('Error rejecting offer:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Request Changes for Offer
exports.requestChanges = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    if (!comments) {
      return res.status(400).json({ success: false, message: 'Comments are required' });
    }

    const offer = await Offer.findByPk(id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    const adminId = req.admin?.id || 'SYSTEM';

    await offer.update({
      approvalStatus: 'CHANGES_REQUESTED',
      status: 'INACTIVE',
      approvedBy: adminId,
      approvalDate: new Date(),
      adminComments: comments,
      rejectionReason: null,
    });

    res.json({
      success: true,
      message: 'Changes requested successfully',
      data: offer,
    });
  } catch (error) {
    console.error('Error requesting changes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Get single offer details
exports.getOfferDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findByPk(id, {
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
      ],
    });

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    res.json({ success: true, data: offer });
  } catch (error) {
    console.error('Error fetching offer details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Create Offer directly by Admin
exports.createOfferByAdmin = async (req, res) => {
  try {
    const {
      restaurantId,
      categoryId,
      title,
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxUsagePerUser,
      totalUsageLimit,
      startDate,
      endDate,
      startTime,
      endTime,
      termsConditions,
      isCommissionAuto,
      adminCommission,
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    if (!discountType || !discountValue) {
      return res.status(400).json({ success: false, message: 'Discount type and value are required' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Start and end dates are required' });
    }

    // Verify category if provided
    if (categoryId) {
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
    }

    // Verify restaurant if provided
    if (restaurantId) {
      const restaurant = await RestaurantReg.findByPk(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ success: false, message: 'Restaurant not found' });
      }
    }

    let offerImage = null;
    if (req.file) {
      offerImage = `offers/${req.file.filename}`;
    }

    const adminId = req.admin?.id || null;

    const offer = await Offer.create({
      restaurantId: restaurantId || null,
      categoryId: categoryId || null,
      offerType: 'ADMIN',
      createdBy: adminId,
      title,
      description,
      discountType: discountType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FLAT',
      discountValue: parseFloat(discountValue),
      minOrderValue: minOrderValue ? parseFloat(minOrderValue) : 0,
      maxUsagePerUser: maxUsagePerUser ? parseInt(maxUsagePerUser) : 1,
      totalUsageLimit: totalUsageLimit ? parseInt(totalUsageLimit) : null,
      startDate,
      endDate,
      startTime: startTime || null,
      endTime: endTime || null,
      termsConditions: termsConditions || null,
      isCommissionAuto: isCommissionAuto === 'true' || isCommissionAuto === true,
      adminCommission: adminCommission ? parseFloat(adminCommission) : 0,
      approvalStatus: 'APPROVED',
      status: 'ACTIVE',
      approvedBy: adminId,
      approvalDate: new Date(),
      offerImage,
    });

    res.status(201).json({
      success: true,
      message: restaurantId
        ? 'Admin offer created for specific restaurant'
        : 'Global admin offer created successfully',
      data: offer,
    });
  } catch (error) {
    console.error('Error creating admin offer:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get all Admin Offers
exports.getAdminOffers = async (req, res) => {
  try {
    const { search, page = 1, pageSize = 10 } = req.query;
    const whereClause = { offerType: 'ADMIN' };

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { '$restaurant.rest_name$': { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const { count, rows: offers } = await Offer.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'rest_name', 'rest_logo', 'contact_email', 'contact_number', 'rest_address'],
          required: false,
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(pageSize),
      offset: offset,
      subQuery: false
    });

    res.json({
      success: true,
      count,
      data: offers,
    });
  } catch (error) {
    console.error('❌ Error fetching admin offers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Update Admin Offer
exports.updateAdminOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findOne({ where: { id, offerType: 'ADMIN' } });
    
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Admin offer not found' });
    }

    const body = req.body || {};
    
    // Verify category if provided
    if (body.categoryId) {
      const category = await Category.findByPk(body.categoryId);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
    }

    // Verify restaurant if provided
    if (body.restaurantId) {
      const restaurant = await RestaurantReg.findByPk(body.restaurantId);
      if (!restaurant) {
        return res.status(404).json({ success: false, message: 'Restaurant not found' });
      }
    }

    let offerImage = offer.offerImage;
    if (req.file) {
      offerImage = `offers/${req.file.filename}`;
    }

    // Update data
    const updateData = {
      ...body,
      offerImage,
      isCommissionAuto: body.isCommissionAuto === 'true' || body.isCommissionAuto === true,
    };

    // Convert discountValue to float if provided
    if (body.discountValue) {
      updateData.discountValue = parseFloat(body.discountValue);
    }

    // Convert numeric fields
    if (body.minOrderValue) updateData.minOrderValue = parseFloat(body.minOrderValue);
    if (body.adminCommission) updateData.adminCommission = parseFloat(body.adminCommission);
    if (body.maxUsagePerUser) updateData.maxUsagePerUser = parseInt(body.maxUsagePerUser);
    if (body.totalUsageLimit) updateData.totalUsageLimit = parseInt(body.totalUsageLimit);

    await offer.update(updateData);

    res.json({
      success: true,
      message: '✅ Admin offer updated successfully',
      data: offer,
    });
  } catch (error) {
    console.error('❌ Error updating admin offer:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Delete Admin Offer
exports.deleteAdminOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findOne({ where: { id, offerType: 'ADMIN' } });
    
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Admin offer not found' });
    }

    await offer.destroy();

    res.json({
      success: true,
      message: '🗑️ Admin offer deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting admin offer:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Get single admin offer details
exports.getAdminOfferById = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findOne({
      where: { id, offerType: 'ADMIN' },
      include: [
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'rest_name', 'rest_logo', 'contact_email', 'contact_number', 'rest_address'],
          required: false,
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
    });

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Admin offer not found' });
    }

    res.json({ success: true, data: offer });
  } catch (error) {
    console.error('Error fetching admin offer details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};