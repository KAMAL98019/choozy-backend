'use strict';
const {
  Model
} = require('sequelize');
const { v4: uuidv4, parse, stringify } = require('uuid'); // helper

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Order.init({
     id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: DataTypes.UUID,
    cartId: DataTypes.UUID,
    subtotal: DataTypes.DECIMAL,
    tax: DataTypes.DECIMAL,
    deliveryFee: DataTypes.DECIMAL,
    total: DataTypes.DECIMAL,
    status: DataTypes.STRING,
    paymentMethod: DataTypes.STRING,
    paymentRef: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Order',
  });
  return Order;
};