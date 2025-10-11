'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dining_events', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      rest_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'restaurant_reg', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      eventName: { type: Sequelize.STRING, allowNull: false },
      eventDescription: { type: Sequelize.TEXT, allowNull: true },
      frequency: { type: Sequelize.ENUM('WEEKLY','MONTHLY','SPECIFIC_DATES'), allowNull: false },
      eventDay: { type: Sequelize.STRING, allowNull: true },
      eventDate: { type: Sequelize.DATEONLY, allowNull: true },
      eventTime: { type: Sequelize.TIME, allowNull: false },
      associatedDiningArea: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'dining_spaces', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });

    await queryInterface.addIndex('dining_events', ['rest_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('dining_events');
  }
};
