'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Partner extends Model {
    static associate(models) {
      Partner.hasMany(models.Order, { 
        foreignKey: "partnerId", 
        as: "orders" 
      });
      Partner.hasMany(models.DeliveryOrder, { 
        foreignKey: "partnerId", 
        as: "deliveries" 
      });
    }
  }

  Partner.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    partnerCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      field: 'partnerCode'
    },

    fullName: { 
      type: DataTypes.STRING, 
      allowNull: false,
      field: 'fullName'
    },
    
    mobile: { 
      type: DataTypes.STRING, 
      allowNull: false,
      field: 'mobile'
    },
    
    email: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true, 
      validate: { isEmail: true },
      field: 'email'
    },
    
    dob: {
      type: DataTypes.DATEONLY,
      field: 'dob'
    },
    
    gender: {
      type: DataTypes.STRING,
      field: 'gender'
    },
    
    referralCode: {
      type: DataTypes.STRING,
      unique: true,
      field: 'referralCode'
    },
    
    password: { 
      type: DataTypes.STRING, 
      allowNull: false,
      field: 'password'
    },
    
    profilePhoto: {
      type: DataTypes.STRING,
      field: 'profilePhoto'
    },

    address: {
      type: DataTypes.STRING,
      field: 'address'
    },
    
    city: {
      type: DataTypes.STRING,
      field: 'city'
    },
    
    state: {
      type: DataTypes.STRING,
      field: 'state'
    },
    
    pincode: {
      type: DataTypes.STRING,
      field: 'pincode'
    },
    
    emergencyName: {
      type: DataTypes.STRING,
      field: 'emergencyName'
    },
    
    emergencyMobile: {
      type: DataTypes.STRING,
      field: 'emergencyMobile'
    },

    vehicleType: {
      type: DataTypes.STRING,
      field: 'vehicleType'
    },
    
    vehicleModel: {
      type: DataTypes.STRING,
      field: 'vehicleModel'
    },
    
    licensePlate: {
      type: DataTypes.STRING,
      field: 'licensePlate'
    },
    
    rcFile: {
      type: DataTypes.STRING,
      field: 'rcFile'
    },
    
    dlFile: {
      type: DataTypes.STRING,
      field: 'dlFile'
    },

    workType: { 
      type: DataTypes.ENUM("full-time", "part-time", "weekend"), 
      allowNull: true,
      field: 'workType'
    },
    
    breakStart: {
      type: DataTypes.TIME,
      field: 'breakStart'
    },
    
    breakEnd: {
      type: DataTypes.TIME,
      field: 'breakEnd'
    },

    bankName: {
      type: DataTypes.STRING,
      field: 'bankName'
    },
    
    accountNumber: {
      type: DataTypes.STRING,
      field: 'accountNumber'
    },
    
    ifsc: {
      type: DataTypes.STRING,
      field: 'ifsc'
    },
    
    idProofFile: {
      type: DataTypes.STRING,
      field: 'idProofFile'
    },

    status: { 
      type: DataTypes.ENUM("pending", "active", "on-duty", "inactive", "blocked"), 
      allowNull: false, 
      defaultValue: "active",
      field: 'status'
    },
    
    otp: {
      type: DataTypes.STRING(6),
      field: 'otp'
    },
    
    otpExpiry: {
      type: DataTypes.DATE,
      field: 'otpExpiry'
    },
    
    otpVerified: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: false,
      field: 'otpVerified'
    },
    
    latitude: {
      type: DataTypes.FLOAT,
      field: 'latitude'
    },
    
    longitude: {
      type: DataTypes.FLOAT,
      field: 'longitude'
    },
  }, {
    sequelize,
    modelName: 'Partner',
    tableName: 'partners',
    timestamps: true,
    underscored: false,
    freezeTableName: true,
  });

  // ==================== HOOKS ====================
  
  /**
   * beforeCreate hook - ONLY generates codes if not already provided
   * This acts as a fallback in case the controller doesn't set them
   */
  Partner.beforeCreate(async (partner, options) => {
    try {
      // Only generate if not already set by controller
      if (!partner.partnerCode) {
        const lastPartner = await Partner.findOne({
          order: [['createdAt', 'DESC']],
          attributes: ['partnerCode'],
          raw: true,
          transaction: options.transaction,
        });
        
        let nextNumber = 1;
        if (lastPartner?.partnerCode) {
          const match = lastPartner.partnerCode.match(/\d+$/);
          if (match) {
            nextNumber = parseInt(match[0], 10) + 1;
          }
        }
        
        partner.partnerCode = `DP${String(nextNumber).padStart(4, '0')}`;
        console.log('🔧 Hook generated partnerCode:', partner.partnerCode);
      }
      
      // Only generate if not already set by controller
      if (!partner.referralCode) {
        // Generate referralCode without crypto
        const timestamp = Date.now().toString(36).slice(-3).toUpperCase();
        const random = Math.random().toString(36).substring(2, 4).toUpperCase();
        partner.referralCode = `DP${timestamp}${random}`;
        console.log('🔧 Hook generated referralCode:', partner.referralCode);
      }
      
    } catch (error) {
      console.error('❌ Hook error:', error.message);
      
      // Fallback generation if hook fails
      if (!partner.partnerCode) {
        partner.partnerCode = `DP${Date.now().toString().slice(-4)}`;
      }
      
      if (!partner.referralCode) {
        const fallback = Math.random().toString(36).substring(2, 7).toUpperCase();
        partner.referralCode = `DP${fallback}`;
      }
      
      console.log('⚠️ Fallback codes:', {
        partnerCode: partner.partnerCode,
        referralCode: partner.referralCode
      });
    }
  });

  return Partner;
};