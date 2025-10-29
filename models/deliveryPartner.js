'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Partner = sequelize.define("Partner", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    // ---------------- Personal ----------------
    fullName: { type: DataTypes.STRING, allowNull: false },
    mobile: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    dob: { type: DataTypes.DATEONLY, allowNull: true },
    gender: { type: DataTypes.STRING, allowNull: true },
    referralCode: { type: DataTypes.STRING, allowNull: true },
    password: { type: DataTypes.STRING, allowNull: false },
    profilePhoto: { type: DataTypes.STRING, allowNull: true },

    // ---------------- Address ----------------
    address: DataTypes.STRING,
    city: DataTypes.STRING,
    state: DataTypes.STRING,
    pincode: DataTypes.STRING,
    emergencyName: DataTypes.STRING,
    emergencyMobile: DataTypes.STRING,

    // ---------------- Vehicle ----------------
    vehicleType: DataTypes.STRING,
    vehicleModel: DataTypes.STRING,
    licensePlate: DataTypes.STRING,
    rcFile: DataTypes.STRING,
    dlFile: DataTypes.STRING,

    // ---------------- Work ----------------
    workType: { type: DataTypes.ENUM("full-time","part-time","weekend"), allowNull: true },
    breakStart: DataTypes.TIME,
    breakEnd: DataTypes.TIME,

    // ---------------- Payout ----------------
    bankName: DataTypes.STRING,
    accountNumber: DataTypes.STRING,
    ifsc: DataTypes.STRING,
    idProofFile: DataTypes.STRING,

    // ---------------- Status & OTP ----------------
    status: { type: DataTypes.ENUM("pending","active","on-duty","inactive","blocked"), allowNull: false, defaultValue: "active" },
    otp: { type: DataTypes.STRING(6), allowNull: true },
    otpExpiry: { type: DataTypes.DATE, allowNull: true },
    otpVerified: { type: DataTypes.BOOLEAN, defaultValue: false },

    // 🔹 Geo coordinates for delivery radius / zone
    latitude: { type: DataTypes.FLOAT, allowNull: true },
    longitude: { type: DataTypes.FLOAT, allowNull: true }

  });

  Partner.associate = (models) => {
    Partner.hasMany(models.Order, { foreignKey: "partnerId", as: "orders" });
    Partner.hasMany(models.DeliveryOrder, { foreignKey: "partnerId", as: "deliveries" });
  };

  // UUID before create
  Partner.beforeCreate((instance) => {
    if (!instance.id) instance.id = uuidv4();
  });

  return Partner;
};
