'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ReviewCustomerToDelivery extends Model {
    static associate(models) {
       ReviewCustomerToDelivery.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
       ReviewCustomerToDelivery.belongsTo(models.Partner, { foreignKey: 'partnerId' });
    }
  }

  ReviewCustomerToDelivery.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    partnerId: { type: DataTypes.UUID, allowNull: false },
    orderId: { type: DataTypes.UUID, allowNull: true },
    rating: { type: DataTypes.INTEGER, allowNull: false, validate:{ min:1, max:5 } },
    comment: { type: DataTypes.TEXT, allowNull: true }
  }, {
    sequelize,
    modelName: 'ReviewCustomerToDelivery',
    tableName: 'review_customer_to_delivery'
  });

  return ReviewCustomerToDelivery;
};
