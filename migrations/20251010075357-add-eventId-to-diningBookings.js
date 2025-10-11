'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('dining_bookings', 'eventId', {
  type: Sequelize.UUID,
  allowNull: true,  // allow null first
  references: { model: 'dining_events', key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE'
});


    await queryInterface.addIndex('dining_bookings', ['eventId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('dining_bookings', 'eventId');
  }
};
