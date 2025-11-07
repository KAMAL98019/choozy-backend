const jwt = require('jsonwebtoken');
const { Admin } = require('../../models');
const bcrypt = require('bcrypt');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ where: { email } });
    if (!admin) return res.status(401).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, role: 'admin' },
      process.env.JWT_SECRET, // make sure you have this in .env
      { expiresIn: '1d' } // or whatever expiry you want
    );

    res.json({ message: 'Login successful', token, adminId: admin.id, email: admin.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
