'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('dining_events', 'isAdminVerified', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indicates if admin has verified the event'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('dining_events', 'isAdminVerified');
  }
};
