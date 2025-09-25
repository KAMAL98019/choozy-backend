'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ReviewRestaurantToDelivery extends Model {
    static associate(models) {
       ReviewRestaurantToDelivery.belongsTo(models.RestaurantReg, { foreignKey: 'rest_id' });
       ReviewRestaurantToDelivery.belongsTo(models.Partner, { foreignKey: 'partnerId' });
    
    }
  }

  ReviewRestaurantToDelivery.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    rest_id: { type: DataTypes.UUID, allowNull: false },
    partnerId: { type: DataTypes.UUID, allowNull: false },
    orderId: { type: DataTypes.UUID, allowNull: true },
    rating: { type: DataTypes.INTEGER, allowNull: false, validate:{ min:1, max:5 } },
    comment: { type: DataTypes.TEXT, allowNull: true }
  }, {
    sequelize,
    modelName: 'ReviewRestaurantToDelivery',
    tableName: 'review_restaurant_to_delivery'
  });

  return ReviewRestaurantToDelivery;
};
