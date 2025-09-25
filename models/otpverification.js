'use strict';
const {
  Model
} = require('sequelize');
const { v4: uuidv4, parse, stringify } = require('uuid'); // helper

module.exports = (sequelize, DataTypes) => {
  class OtpVerification extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  OtpVerification.init({
     id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    mobile: DataTypes.STRING,
    otp: DataTypes.STRING,
    expiresAt: DataTypes.DATE,
    isVerified: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'OtpVerification',
  });
  return OtpVerification;
};