'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DiningEvent extends Model {
    static associate(models) {
      DiningEvent.belongsTo(models.RestaurantReg, {
        foreignKey: 'rest_id',
        as: 'restaurant'
      });
      DiningEvent.belongsTo(models.DiningSpace, {
        foreignKey: 'associatedDiningArea',
        as: 'diningArea'
      });
      
    }
  }

  DiningEvent.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    rest_id: DataTypes.UUID,
    eventName: DataTypes.STRING,
    eventDescription: DataTypes.TEXT,
    frequency: {
      type: DataTypes.ENUM('WEEKLY', 'MONTHLY', 'SPECIFIC_DATES')
    },
    eventDay: DataTypes.STRING,
    eventDate: DataTypes.DATEONLY,
     eventTimes: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Array of times for multiple sessions, e.g. ["18:30", "21:00"]'
    },
    associatedDiningArea: {
      type: DataTypes.UUID,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isAdminVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'DiningEvent',
    tableName: 'dining_events'
  });

  return DiningEvent;
};
