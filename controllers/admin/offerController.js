const { Offer, RestaurantReg, Admin } = require('../../models');
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
      },
      include: [
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'restaurantName', 'email', 'mobile', 'address'],
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
          attributes: ['id', 'restaurantName', 'email', 'mobile'],
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
    const { adminId, comments } = req.body;

    if (!adminId)
      return res.status(400).json({ success: false, message: 'adminId is required' });

    const offer = await Offer.findByPk(id, {
      include: [{ model: RestaurantReg, as: 'restaurant', attributes: ['restaurantName'] }],
    });

    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    if (offer.approvalStatus === 'APPROVED')
      return res.status(400).json({ success: false, message: 'Offer is already approved' });

    await offer.update({
      approvalStatus: 'APPROVED',
      status: 'ACTIVE',
      approvedBy: adminId,
      approvalDate: new Date(),
      rejectionReason: null,
      adminComments: comments || null,
    });

    res.json({ success: true, message: 'Offer approved successfully', data: offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Reject an offer
exports.rejectOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId, reason } = req.body;

    if (!adminId)
      return res.status(400).json({ success: false, message: 'adminId is required' });
    if (!reason)
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });

    const offer = await Offer.findByPk(id, {
      include: [{ model: RestaurantReg, as: 'restaurant', attributes: ['restaurantName'] }],
    });

    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    if (offer.approvalStatus === 'REJECTED')
      return res.status(400).json({ success: false, message: 'Offer already rejected' });

    await offer.update({
      approvalStatus: 'REJECTED',
      status: 'INACTIVE',
      approvedBy: adminId,
      approvalDate: new Date(),
      rejectionReason: reason,
      adminComments: null,
    });

    res.json({ success: true, message: 'Offer rejected', data: offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Request changes
exports.requestChanges = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId, comments } = req.body;

    if (!adminId || !comments)
      return res.status(400).json({ success: false, message: 'adminId and comments are required' });

    const offer = await Offer.findByPk(id);

    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

    await offer.update({
      approvalStatus: 'CHANGES_REQUESTED',
      status: 'INACTIVE',
      approvedBy: adminId,
      approvalDate: new Date(),
      adminComments: comments,
      rejectionReason: null,
    });

    res.json({ success: true, message: 'Changes requested successfully', data: offer });
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
        { model: RestaurantReg, as: 'restaurant', attributes: ['id', 'restaurantName', 'email', 'mobile', 'address'] },
        { model: Admin, as: 'approver', attributes: ['id', 'name', 'email'] },
      ],
    });

    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** -----------------------------
 *  Admin Direct Offers
 * ----------------------------- */
// Create offer directly by admin
exports.createOfferByAdmin = async (req, res) => {
  try {
    const { adminId, restaurantId } = req.body;
    if (!adminId)
      return res.status(400).json({ success: false, message: 'adminId is required' });

    let offerImage = null;
    if (req.file) {
      offerImage = `offers/${req.file.filename}`;
    }

    const offer = await Offer.create({
      ...req.body,
      offerType: 'ADMIN',
      createdBy: adminId,
      restaurantId: restaurantId || null,
      approvalStatus: 'APPROVED',
      status: 'ACTIVE',
      approvedBy: adminId,
      approvalDate: new Date(),
      offerImage,
    });

    res.status(201).json({
      success: true,
      message: 'Admin offer created successfully',
      data: offer,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update admin offer
exports.updateAdminOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findOne({ where: { id, offerType: 'ADMIN' } });
    if (!offer)
      return res.status(404).json({ success: false, message: 'Admin offer not found' });

    let offerImage = offer.offerImage;
    if (req.file) {
      offerImage = `offers/${req.file.filename}`;
    }

    await offer.update({
      ...req.body,
      offerImage,
    });

    res.json({ success: true, message: 'Offer updated successfully', data: offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// 🔹 Get all admin offers
exports.getAdminOffers = async (req, res) => {
  try {
    const { status } = req.query;
    const whereClause = { offerType: 'ADMIN' };
    if (status) whereClause.status = status;

    const offers = await Offer.findAll({
      where: whereClause,
      include: [
        { model: RestaurantReg, as: 'restaurant', attributes: ['id', 'restaurantName'], required: false },
        { model: Admin, as: 'creator', attributes: ['id', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, count: offers.length, data: offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// 🔹 Delete admin offer
exports.deleteAdminOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findOne({ where: { id, offerType: 'ADMIN' } });
    if (!offer) return res.status(404).json({ success: false, message: 'Admin offer not found' });

    await offer.destroy();
    res.json({ success: true, message: 'Admin offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
