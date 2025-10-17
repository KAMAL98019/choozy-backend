'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addConstraint('orders', {
      fields: ['partnerId'],
      type: 'foreign key',
      name: 'fk_orders_partnerId', // custom constraint name
      references: {
        table: 'partners',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('orders', 'fk_orders_partnerId');
  }
};
