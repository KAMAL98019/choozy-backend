'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dining_spaces', {
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
      areaName: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'e.g., Main Dining Room, Patio'
      },
      seatingCapacity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Number of seats in this area'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      photos: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of photo URLs'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.addIndex('dining_spaces', ['rest_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('dining_spaces');
  }
};
