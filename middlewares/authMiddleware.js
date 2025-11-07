// middlewares/auth.middleware.js
const { verifyToken } = require('../utils/jwtUtils');
const { User, RestaurantReg, Partner, Admin } = require('../models');

/**
 * Authenticate User
 */
exports.authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'user') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'otp', 'otpExpiry'] }
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: 'Account is not active' 
      });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    console.error('User Auth Error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
};

/**
 * Authenticate Restaurant
 */
exports.authenticateRestaurant = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'restaurant') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    const restaurant = await RestaurantReg.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'otp', 'otpExpiry'] }
    });
    
    if (!restaurant) {
      return res.status(401).json({ 
        success: false, 
        message: 'Restaurant not found' 
      });
    }

    if (restaurant.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: 'Restaurant account is not active' 
      });
    }

    req.restaurant = restaurant;
    req.restaurantId = restaurant.id;
    next();
  } catch (error) {
    console.error('Restaurant Auth Error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
};

/**
 * Authenticate Delivery Partner
 */
exports.authenticatePartner = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'partner') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    const partner = await Partner.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'otp', 'otpExpiry'] }
    });
    
    if (!partner) {
      return res.status(401).json({ 
        success: false, 
        message: 'Partner not found' 
      });
    }

    if (partner.status === 'blocked' || partner.status === 'inactive') {
      return res.status(403).json({ 
        success: false, 
        message: 'Partner account is not active' 
      });
    }

    req.partner = partner;
    req.partnerId = partner.id;
    next();
  } catch (error) {
    console.error('Partner Auth Error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
};

/**
 * Authenticate Admin
 */
exports.authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'admin') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token. Admin access required.' 
      });
    }

    const admin = await Admin.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Admin not found' 
      });
    }

    req.admin = admin;
    req.adminId = admin.id;
    next();
  } catch (error) {
    console.error('Admin Auth Error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
};