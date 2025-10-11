'use strict';
const { Model } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class RestaurantReg extends Model {
    static associate(models) {
      RestaurantReg.hasMany(models.DiningSpace, { foreignKey: 'rest_id', as: 'diningSpaces' });
      RestaurantReg.hasMany(models.DiningEvent, { foreignKey: 'rest_id', as: 'events' });
      RestaurantReg.hasMany(models.DiningBooking, { foreignKey: 'rest_id', as: 'bookings' });
      RestaurantReg.hasMany(models.FoodItem, { foreignKey: 'rest_id', as: 'foodItems' });
    }
  }

  RestaurantReg.init({
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      allowNull: false,
      defaultValue: null
    },

    rest_name: { type: DataTypes.STRING(255), allowNull: false },
    rest_address: { type: DataTypes.TEXT, allowNull: false },
    avg_cost_two: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    rest_logo: { type: DataTypes.TEXT, allowNull: true },
    contact_person_name: { type: DataTypes.STRING(255), allowNull: true },
    contact_email: { type: DataTypes.STRING(255), allowNull: true },
    password: { type: DataTypes.STRING, allowNull: false },
    contact_number: { type: DataTypes.STRING(32), allowNull: true },
    operational_hours: { type: DataTypes.JSON, allowNull: true },
    fssai_certificate: { type: DataTypes.STRING(1024), allowNull: false },
    gst_certificate: { type: DataTypes.STRING(1024), allowNull: true },
    bank_account_name: { type: DataTypes.STRING(255), allowNull: true },
    account_number: { type: DataTypes.STRING(64), allowNull: true },
    ifsc_code: { type: DataTypes.STRING(32), allowNull: true },
    agree_to_terms: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active'
    },

    // 🔹 New Delivery Settings Fields
    deliveryType: { 
      type: DataTypes.ENUM('RADIUS', 'ZONE'), 
      allowNull: false, 
      defaultValue: 'RADIUS' 
    },
    deliveryRadius: { type: DataTypes.FLOAT, allowNull: true },  // in KM
    deliveryZones: { type: DataTypes.JSON, allowNull: true },   // polygon coords
    restaurantLatitude: { type: DataTypes.FLOAT, allowNull: true },
    restaurantLongitude: { type: DataTypes.FLOAT, allowNull: true },
    minOrderAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 500 },
    baseDeliveryFee: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 50 },

  }, {
    sequelize,
    modelName: 'RestaurantReg',
    tableName: 'restaurant_reg'
  });

  RestaurantReg.beforeCreate((instance) => {
    if (!instance.id) instance.id = uuidv4();
  });

  return RestaurantReg;
};
