const { Address } = require('../models');

// CREATE new address
exports.createAddress = async (req, res) => {
  try {
    const { userId, street, city, state, country, pincode, latitude, longitude, isDefault } = req.body;

    // If new address is default, unset previous default
    if (isDefault) {
      await Address.update({ isDefault: false }, { where: { userId } });
    }

    const address = await Address.create({
      userId, street, city, state, country, pincode, latitude, longitude, isDefault
    });

    res.status(201).json(address);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create address' });
  }
};

// GET all addresses of a user
exports.getAddresses = async (req, res) => {
  try {
    const addresses = await Address.findAll({ where: { userId: req.params.userId } });
    res.json(addresses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
};

// UPDATE an address
exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { street, city, state, country, pincode, latitude, longitude, isDefault } = req.body;

    // Find the address first
    const address = await Address.findByPk(id);
    if (!address) return res.status(404).json({ error: 'Address not found' });

    // If setting this as default, unset previous default for the same user
    if (isDefault) {
      await Address.update(
        { isDefault: false },
        { where: { userId: address.userId, id: { [Address.sequelize.Op.ne]: id } } } // exclude current address
      );
    }

    // Update current address
    await Address.update(
      { street, city, state, country, pincode, latitude, longitude, isDefault },
      { where: { id } }
    );

    // Return updated address
    const updatedAddress = await Address.findByPk(id);
    res.json(updatedAddress);
  } catch (err) {
    console.error('Update address error:', err);
    res.status(500).json({ error: 'Failed to update address' });
  }
};

// DELETE an address
exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Address.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: 'Address not found' });

    res.json({ message: 'Address deleted successfully' });
  } catch (err) {
    console.error('Delete address error:', err);
    res.status(500).json({ error: 'Failed to delete address' });
  }
};
