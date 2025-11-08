'use strict';
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
  const Partner = sequelize.define("Partner", {
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
    },

    fullName: { type: DataTypes.STRING, allowNull: false },
    mobile: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    dob: { type: DataTypes.DATEONLY, allowNull: true },
    gender: { type: DataTypes.STRING, allowNull: true },
    referralCode: { type: DataTypes.STRING, allowNull: true },
    password: { type: DataTypes.STRING, allowNull: false },
    profilePhoto: { type: DataTypes.STRING, allowNull: true },

    address: DataTypes.STRING,
    city: DataTypes.STRING,
    state: DataTypes.STRING,
    pincode: DataTypes.STRING,
    emergencyName: DataTypes.STRING,
    emergencyMobile: DataTypes.STRING,

    vehicleType: DataTypes.STRING,
    vehicleModel: DataTypes.STRING,
    licensePlate: DataTypes.STRING,
    rcFile: DataTypes.STRING,
    dlFile: DataTypes.STRING,

    workType: { type: DataTypes.ENUM("full-time", "part-time", "weekend"), allowNull: true },
    breakStart: DataTypes.TIME,
    breakEnd: DataTypes.TIME,

    bankName: DataTypes.STRING,
    accountNumber: DataTypes.STRING,
    ifsc: DataTypes.STRING,
    idProofFile: DataTypes.STRING,

    status: { type: DataTypes.ENUM("pending", "active", "on-duty", "inactive", "blocked"), allowNull: false, defaultValue: "active" },
    otp: { type: DataTypes.STRING(6), allowNull: true },
    otpExpiry: { type: DataTypes.DATE, allowNull: true },
    otpVerified: { type: DataTypes.BOOLEAN, defaultValue: false },

    latitude: { type: DataTypes.FLOAT, allowNull: true },
    longitude: { type: DataTypes.FLOAT, allowNull: true },
  }, {
    sequelize,
    modelName: 'Partner',
    tableName: 'partners',
  });

  Partner.associate = (models) => {
    Partner.hasMany(models.Order, { foreignKey: "partnerId", as: "orders" });
    Partner.hasMany(models.DeliveryOrder, { foreignKey: "partnerId", as: "deliveries" });
  };

 // ✅ HOOK — ensure sequelize.models reference works
  Partner.beforeCreate(async (partner, options) => {
    try {
      const lastPartner = await sequelize.models.Partner.findOne({
        order: [['createdAt', 'DESC']],
        attributes: ['partnerCode'],
      });

      let nextNumber = 1;
      if (lastPartner && lastPartner.partnerCode) {
        const match = lastPartner.partnerCode.match(/\d+$/);
        if (match) nextNumber = parseInt(match[0], 10) + 1;
      }

      partner.partnerCode = `DP${String(nextNumber).padStart(4, '0')}`;
      partner.referralCode = `DP${crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5)}`;

      console.log('✅ Partner code created:', partner.partnerCode);
    } catch (err) {
      console.error('❌ Hook error:', err);
      partner.partnerCode = `DP${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      partner.referralCode = 'DPFALLBACK';
    }
  });


  return Partner;
};
