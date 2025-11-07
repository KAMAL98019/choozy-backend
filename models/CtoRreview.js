'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ReviewCustomerToRestaurant extends Model {
    static associate(models) {
      ReviewCustomerToRestaurant.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
       ReviewCustomerToRestaurant.belongsTo(models.RestaurantReg, { foreignKey: 'rest_id' });
    }
  }

  ReviewCustomerToRestaurant.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
     userId: { type: DataTypes.UUID, allowNull: false },
    rest_id: { type: DataTypes.UUID, allowNull: false },
    orderId: { type: DataTypes.UUID, allowNull: true },
    rating: { type: DataTypes.INTEGER, allowNull: false, validate:{ min:1, max:5 } },
    comment: { type: DataTypes.TEXT, allowNull: true }
  }, {
    sequelize,
    modelName: 'ReviewCustomerToRestaurant',
    tableName: 'review_customer_to_restaurant'
  });

  return ReviewCustomerToRestaurant;
};
