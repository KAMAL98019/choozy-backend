'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('partner_status', {
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
      status: {
        type: Sequelize.ENUM("online", "offline"),
        defaultValue: "offline",
      },
      fcmToken: {
        type: Sequelize.STRING,
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
    await queryInterface.dropTable('partner_status');
  }
};
