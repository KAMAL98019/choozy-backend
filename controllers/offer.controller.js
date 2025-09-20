const { Offer, RestaurantReg } = require('../models');

/**
 * Create Offer
 * body: {
 *   restaurantId, title, description,
 *   discountType, discountValue, minOrderValue,
 *   startDate, endDate, startTime, endTime,
 *   applicableItems (array or object),
 *   termsConditions,
 *   offerImage,
 *   status
 * }
 */
exports.createOffer = async (req, res) => {
  try {
    const payload = { ...req.body };

    // simple validation
    if (!payload.restaurantId || !payload.title) {
      return res.status(400).json({ error: 'restaurantId and title required' });
    }

    // optional: check restaurant exists
    const rest = await RestaurantReg.findByPk(payload.restaurantId);
    if (!rest) return res.status(400).json({ error: 'Invalid restaurantId' });

    // ensure applicableItems is JSON
    if (payload.applicableItems && typeof payload.applicableItems === 'string') {
      try {
        payload.applicableItems = JSON.parse(payload.applicableItems);
      } catch (e) {
        // keep as string if parse fails
      }
    }

    const offer = await Offer.create(payload);
    return res.status(201).json(offer);
  } catch (e) {
    console.error('Create Offer Error:', e);
    return res.status(500).json({ error: 'Create offer failed', details: e.message });
  }
};

exports.getOffers = async (req, res) => {
  try {
    const { restaurantId, status } = req.query;
    const where = {};
    if (restaurantId) where.restaurantId = restaurantId;
    if (status) where.status = status;

    const offers = await Offer.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    res.json(offers);
  } catch (e) {
    console.error('Get Offers Error:', e);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
};

exports.getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findByPk(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    res.json(offer);
  } catch (e) {
    console.error('GetOfferById Error:', e);
    res.status(500).json({ error: 'Failed to fetch offer' });
  }
};

exports.updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findByPk(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });

    const patch = { ...req.body };
    if (patch.applicableItems && typeof patch.applicableItems === 'string') {
      try { patch.applicableItems = JSON.parse(patch.applicableItems); } catch {}
    }

    await offer.update(patch);
    res.json(offer);
  } catch (e) {
    console.error('UpdateOffer Error:', e);
    res.status(500).json({ error: 'Failed to update offer' });
  }
};

exports.deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findByPk(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    await offer.destroy();
    res.json({ message: 'Offer deleted' });
  } catch (e) {
    console.error('DeleteOffer Error:', e);
    res.status(500).json({ error: 'Failed to delete offer' });
  }
};
