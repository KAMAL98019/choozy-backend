'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table exists
    const tables = await queryInterface.showAllTables();
    
    if (!tables.includes('user_offers')) {
      // Create table
      await queryInterface.createTable('user_offers', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        offerId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'offers',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        orderId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Orders',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        status: {
          type: Sequelize.ENUM('BOOKED', 'USED', 'EXPIRED', 'CANCELLED'),
          defaultValue: 'BOOKED'
        },
        bookedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        usedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        expiresAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });
    } else {
      console.log('Table user_offers already exists');
    }
    
    // Add indexes only if they don't exist
    try {
      await queryInterface.addIndex('user_offers', ['userId'], {
        name: 'user_offers_user_id'
      });
    } catch (error) {
      console.log('Index user_offers_user_id already exists');
    }
    
    try {
      await queryInterface.addIndex('user_offers', ['offerId'], {
        name: 'user_offers_offer_id'
      });
    } catch (error) {
      console.log('Index user_offers_offer_id already exists');
    }
    
    try {
      await queryInterface.addIndex('user_offers', ['status'], {
        name: 'user_offers_status'
      });
    } catch (error) {
      console.log('Index user_offers_status already exists');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_offers');
  }
};