const { Subscription, User, FoodItem } = require('../models');

// Create subscription
exports.createSubscription = async (req, res) => {
  try {
    const { userId, foodId, planName, price, paymentMethod, address, startDate, endDate, status } = req.body;

    const subscription = await Subscription.create({
      userId,
      foodId,
      planName,
      price,
      paymentMethod,
      address,
      startDate,
      endDate,
      status, // optional
    });

    res.status(201).json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all subscriptions
exports.getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      include: ['user', 'food'],
    });
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get subscription by ID
exports.getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id, {
      include: ['user', 'food'],
    });
    if (!subscription) return res.status(404).json({ error: 'Subscription not found' });
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update subscription
exports.updateSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id);
    if (!subscription) return res.status(404).json({ error: 'Subscription not found' });

    const { planName, price, paymentMethod, address, startDate, endDate, status } = req.body;

    await subscription.update({
      planName,
      price,
      paymentMethod,
      address,
      startDate,
      endDate,
      status
    });

    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete subscription
exports.deleteSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id);
    if (!subscription) return res.status(404).json({ error: 'Subscription not found' });

    await subscription.destroy();
    res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
