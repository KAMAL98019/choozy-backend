'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Update existing records to isActive = false
    await queryInterface.bulkUpdate('dining_events', 
      { isActive: false }, 
      {} // all rows
    );

    // Change column default to false for future inserts
    await queryInterface.changeColumn('dining_events', 'isActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert existing records to true
    await queryInterface.bulkUpdate('dining_events', 
      { isActive: true }, 
      {}
    );

    // Revert column default back to true
    await queryInterface.changeColumn('dining_events', 'isActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
  }
};
