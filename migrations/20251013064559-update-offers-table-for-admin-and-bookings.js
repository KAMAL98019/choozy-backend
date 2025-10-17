'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add approvalStatus if not exists
    try {
      await queryInterface.addColumn('offers', 'approvalStatus', {
        type: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'),
        defaultValue: 'PENDING',
        allowNull: false
      });
    } catch (error) {
      console.log('approvalStatus column already exists');
    }
    
    // Add approvedBy if not exists
    try {
      await queryInterface.addColumn('offers', 'approvedBy', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'admins',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    } catch (error) {
      console.log('approvedBy column already exists');
    }
    
    // Add approvalDate if not exists
    try {
      await queryInterface.addColumn('offers', 'approvalDate', {
        type: Sequelize.DATE,
        allowNull: true
      });
    } catch (error) {
      console.log('approvalDate column already exists');
    }
    
    // Add rejectionReason if not exists
    try {
      await queryInterface.addColumn('offers', 'rejectionReason', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    } catch (error) {
      console.log('rejectionReason column already exists');
    }
    
    // Add adminComments if not exists
    try {
      await queryInterface.addColumn('offers', 'adminComments', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    } catch (error) {
      console.log('adminComments column already exists');
    }
    
    // Add createdBy if not exists
    try {
      await queryInterface.addColumn('offers', 'createdBy', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'admins',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    } catch (error) {
      console.log('createdBy column already exists');
    }
    
    // Add offerType if not exists
    try {
      await queryInterface.addColumn('offers', 'offerType', {
        type: Sequelize.ENUM('RESTAURANT', 'ADMIN'),
        defaultValue: 'RESTAURANT',
        allowNull: false
      });
    } catch (error) {
      console.log('offerType column already exists');
    }
    
    // Add maxUsagePerUser if not exists
    try {
      await queryInterface.addColumn('offers', 'maxUsagePerUser', {
        type: Sequelize.INTEGER,
        defaultValue: 1
      });
    } catch (error) {
      console.log('maxUsagePerUser column already exists');
    }
    
    // Add totalUsageLimit if not exists
    try {
      await queryInterface.addColumn('offers', 'totalUsageLimit', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    } catch (error) {
      console.log('totalUsageLimit column already exists');
    }
    
    // Make restaurantId nullable
    try {
      await queryInterface.changeColumn('offers', 'restaurantId', {
        type: Sequelize.UUID,
        allowNull: true
      });
    } catch (error) {
      console.log('restaurantId column update failed or already nullable');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const columns = [
      'totalUsageLimit',
      'maxUsagePerUser', 
      'offerType',
      'createdBy',
      'adminComments',
      'rejectionReason',
      'approvalDate',
      'approvedBy',
      'approvalStatus'
    ];
    
    for (const column of columns) {
      try {
        await queryInterface.removeColumn('offers', column);
      } catch (error) {
        console.log(`Column ${column} doesn't exist or already removed`);
      }
    }
  }
};