'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('partners', 'latitude', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });

    await queryInterface.addColumn('partners', 'longitude', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('partners', 'latitude');
    await queryInterface.removeColumn('partners', 'longitude');
  }
};
