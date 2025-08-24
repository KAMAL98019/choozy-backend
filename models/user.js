'use strict';
const { Model } = require('sequelize');
const { v4: uuidv4, parse, stringify } = require('uuid'); // helper

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // define association here
    }
  }
  User.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    mobile: DataTypes.STRING,
    birthday: DataTypes.DATE,
    anniversary: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};
