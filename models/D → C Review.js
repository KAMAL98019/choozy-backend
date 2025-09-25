'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ReviewDeliveryToCustomer extends Model {
    static associate(models) {
      ReviewDeliveryToCustomer.belongsTo(models.Partner, { foreignKey: 'partnerId' });
    
      ReviewDeliveryToCustomer.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }

  ReviewDeliveryToCustomer.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    partnerId: { type: DataTypes.UUID, allowNull: false },
     userId: { type: DataTypes.UUID, allowNull: false },
    orderId: { type: DataTypes.UUID, allowNull: true },
    rating: { type: DataTypes.INTEGER, allowNull: false, validate:{ min:1, max:5 } },
    comment: { type: DataTypes.TEXT, allowNull: true }
  }, {
    sequelize,
    modelName: 'ReviewDeliveryToCustomer',
    tableName: 'review_delivery_to_customer'
  });

  return ReviewDeliveryToCustomer;
};
