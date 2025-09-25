'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Earnings extends Model {
    static associate(models) {
      Earnings.belongsTo(models.Partner, { foreignKey: 'partnerId' });
    }
  }

  Earnings.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    partnerId: { type: DataTypes.UUID, allowNull: false },
    orderId: { type: DataTypes.UUID, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    sequelize,
    modelName: 'Earnings',
    tableName: 'earnings'
  });

  return Earnings;
};
