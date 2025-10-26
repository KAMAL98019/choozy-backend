'use strict';
const { Model } = require('sequelize');


module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Cart, { foreignKey: 'userId', as: 'carts' });
      User.hasMany(models.Address, { foreignKey: 'userId', as: 'addresses' });
      User.hasMany(models.Order, { foreignKey: 'userId', as: 'orders' });
      User.hasMany(models.ReviewDeliveryToCustomer, { foreignKey: 'userId', as: 'reviews' });
      User.hasMany(models.DiningBooking, { foreignKey: 'userId', as: 'bookings' });

      // Only add if UserOffer model exists
      if (models.UserOffer) {
        User.hasMany(models.UserOffer, { foreignKey: 'userId', as: 'offerBookings' });
      }
    }
  }

  User.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    mobile: DataTypes.STRING,
    birthday: DataTypes.DATE,
    anniversary: DataTypes.DATE,
    profilePhoto: {
      type: DataTypes.STRING, // store file path or URL
      allowNull: true
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: true
    },
    otpExpiry: {
      type: DataTypes.DATE,
      allowNull: true
    },
    otpVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active'
    },
    customerId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },

  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};