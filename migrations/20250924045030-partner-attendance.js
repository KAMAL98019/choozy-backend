'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('partner_attendance', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      partnerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'partners',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      attendancePhoto: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      attendanceTime: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('partner_attendance');
  }
};
