module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'partnerId', {
  type: Sequelize.UUID,
  allowNull: true, // temporarily allow NULL
  references: { model: 'Partners', key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'SET NULL', // safer for existing data
});

  },
  async down(queryInterface) {
    await queryInterface.removeColumn('orders', 'partnerId');
  },
};
