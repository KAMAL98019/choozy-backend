'use strict';
const { Model } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class RestaurantReg extends Model {
    static associate(models) {
      // define associations here if needed later
    }
  }

  RestaurantReg.init({
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      allowNull: false,
      // For universal compatibility, ensure value exists in hook:
      defaultValue: null
    },
    rest_name: { type: DataTypes.STRING(255), allowNull: false },
    rest_address: { type: DataTypes.TEXT, allowNull: false },
    cuisine_type: { type: DataTypes.STRING(255), allowNull: false },
    avg_cost_two: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    rest_logo: { type: DataTypes.TEXT, allowNull: true },
    contact_person_name: { type: DataTypes.STRING(255), allowNull: true },
    contact_email: { type: DataTypes.STRING(255), allowNull: true },
    password: {type: DataTypes.STRING,allowNull: false,},
    contact_number: { type: DataTypes.STRING(32), allowNull: true },
    operational_hours: { type: DataTypes.JSON, allowNull: true },
    fssai_certificate: { type: DataTypes.STRING(1024), allowNull: false },
    gst_certificate: { type: DataTypes.STRING(1024), allowNull: true },
    bank_account_name: { type: DataTypes.STRING(255), allowNull: true },
    account_number: { type: DataTypes.STRING(64), allowNull: true },
    ifsc_code: { type: DataTypes.STRING(32), allowNull: true },
    agree_to_terms: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  }, {
    sequelize,
    modelName: 'RestaurantReg',
    tableName: 'restaurant_reg'
  });

  // Ensure UUID is set (works regardless of DB engine)
  RestaurantReg.beforeCreate((instance) => {
    if (!instance.id) instance.id = uuidv4();
  });

  return RestaurantReg;
};
