const { Offer, RestaurantReg, Category } = require('../../models');
const { Op } = require('sequelize');

/** -----------------------------
 *  Admin Offer Review Controller
 * ----------------------------- */

// 🔹 Get all pending or changes-requested offers
exports.getPendingOffers = async (req, res) => {
  try {
    const offers = await Offer.findAll({
      where: { approvalStatus: { [Op.in]: ['PENDING', 'CHANGES_REQUESTED'] } },
      include: [
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'rest_name', 'rest_logo', 'contact_email', 'contact_number', 'rest_address'],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    res.json({ success: true, count: offers.length, data: offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Get all offers (filter by status or restaurant)
exports.getAllOffers = async (req, res) => {
  try {
    const { approvalStatus, restaurantId } = req.query;
    const whereClause = {};

    if (approvalStatus) whereClause.approvalStatus = approvalStatus;
    if (restaurantId) whereClause.restaurantId = restaurantId;

    const offers = await Offer.findAll({
      where: whereClause,
      include: [
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'rest_name', 'rest_logo', 'contact_email', 'contact_number', 'rest_address'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, count: offers.length, data: offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Approve an offer
exports.approveOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    const offer = await Offer.findByPk(id, {
      include: [{ model: RestaurantReg, as: 'restaurant', attributes: ['rest_name'] }],
    });

    if (!offer)
      return res.status(404).json({ success: false, message: 'Offer not found' });

    if (offer.approvalStatus === 'APPROVED')
      return res.status(400).json({ success: false, message: 'Offer already approved' });

    await offer.update({
      approvalStatus: 'APPROVED',
      status: 'ACTIVE',
      approvedBy: 'SYSTEM',
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Reject Offer
exports.rejectOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason)
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });

    const offer = await Offer.findByPk(id);
    if (!offer)
      return res.status(404).json({ success: false, message: 'Offer not found' });

    await offer.update({
      approvalStatus: 'REJECTED',
      status: 'INACTIVE',
      approvedBy: 'SYSTEM',
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Request Changes for Offer
exports.requestChanges = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    if (!comments)
      return res.status(400).json({ success: false, message: 'Comments are required' });

    const offer = await Offer.findByPk(id);
    if (!offer)
      return res.status(404).json({ success: false, message: 'Offer not found' });

    await offer.update({
      approvalStatus: 'CHANGES_REQUESTED',
      status: 'INACTIVE',
      approvedBy: 'SYSTEM',
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Get single offer details
exports.getOfferDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findByPk(id, {
      include: [
        { model: RestaurantReg, as: 'restaurant', attributes: ['id', 'rest_name', 'rest_logo', 'contact_email', 'contact_number', 'rest_address'] },
      ],
    });

    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Create Offer directly by Admin
exports.createOfferByAdmin = async (req, res) => {
  try {
    const {
      restaurantId,
      categoryId,
      offerName,
      discountType,
      discountValue,
      startDate,
      endDate,
      isCommissionAuto,
      adminCommission,
      offerDescription,
    } = req.body;

    let offerImage = null;
    if (req.file) offerImage = `offers/${req.file.filename}`;

    const adminId = req.admin?.id || null; // ✅ Real admin ID

    // ✅ Create Offer
    const offer = await Offer.create({
      restaurantId: restaurantId || null,
      categoryId: categoryId || null,
      offerType: 'ADMIN',
      createdBy: adminId, // ✅ correct foreign key
      title: offerName,
      description: offerDescription,
      discountType,
      discountValue,
      startDate,
      endDate,
      isCommissionAuto: isCommissionAuto === 'true' || isCommissionAuto === true,
      adminCommission: adminCommission || 0,
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
    const offers = await Offer.findAll({
      where: { offerType: 'ADMIN' },
      include: [
        {
          model: RestaurantReg,
          as: Offer.associations?.restaurant?.as || 'RestaurantReg', // safe alias fallback
          attributes: ['id', 'rest_name', 'rest_logo', 'contact_email', 'contact_number', 'rest_address'],
          required: false,
        },
        {
          model: Category,
          as: Offer.associations?.category?.as || 'Category', // safe alias fallback
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // ✅ Return empty array if no offers found (no error)
    res.json({
      success: true,
      count: offers.length,
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
    if (!offer)
      return res.status(404).json({ success: false, message: 'Admin offer not found' });

    const body = req.body || {};
    let offerImage = offer.offerImage;
    if (req.file) offerImage = `offers/${req.file.filename}`;
    else if (req.files && req.files.length > 0) {
      const imageFile = req.files.find(f => f.fieldname === 'offerImage');
      if (imageFile) offerImage = `offers/${imageFile.filename}`;
    }

    await offer.update({
      ...body,
      offerImage,
      isCommissionAuto:
        body.isCommissionAuto === 'true' || body.isCommissionAuto === true,
    });

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
    if (!offer)
      return res.status(404).json({ success: false, message: 'Admin offer not found' });

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