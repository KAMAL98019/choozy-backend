'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Offer extends Model {
    static associate(models) {
      Offer.belongsTo(models.RestaurantReg, { foreignKey: 'restaurantId', as: 'restaurant' });
      // if you have FoodItem or Category relation, add associations here
      // e.g. Offer.belongsToMany(models.FoodItem, { through: 'OfferItems', ... })
    }
  }

  Offer.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      restaurantId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      title: { type: DataTypes.STRING, allowNull: false },
      description: DataTypes.TEXT,
      discountType: {
        type: DataTypes.ENUM('PERCENTAGE', 'FLAT'),
        defaultValue: 'PERCENTAGE'
      },
      discountValue: { type: DataTypes.FLOAT, defaultValue: 0 },
      minOrderValue: { type: DataTypes.FLOAT, defaultValue: 0 },
      startDate: DataTypes.DATE,
      endDate: DataTypes.DATE,
      startTime: DataTypes.STRING,
      endTime: DataTypes.STRING,
      applicableItems: DataTypes.JSON,
      termsConditions: DataTypes.TEXT,
      offerImage: DataTypes.STRING,
      status: {
        type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
        defaultValue: 'ACTIVE'
      }
    },
    {
      sequelize,
      modelName: 'Offer',
      tableName: 'offers'
    }
  );

  return Offer;
};
