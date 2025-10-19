'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DiningSpace extends Model {
    static associate(models) {
      DiningSpace.belongsTo(models.RestaurantReg, {
        foreignKey: 'rest_id',
        as: 'restaurant'
      });
      DiningSpace.hasMany(models.DiningBooking, {
        foreignKey: 'diningAreaId',
        as: 'bookings'
      });
      DiningSpace.hasMany(models.DiningEvent, {
        foreignKey: 'associatedDiningArea',
        as: 'events'
      });
    }
  }

  DiningSpace.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    rest_id: DataTypes.UUID,
    areaName: DataTypes.STRING,
    seatingCapacity: DataTypes.INTEGER,
    description: DataTypes.TEXT,
    photos: DataTypes.JSON,
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'DiningSpace',
    tableName: 'dining_spaces'
  });

  return DiningSpace;
};
