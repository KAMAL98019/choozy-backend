'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ✅ Add the new JSON column
    await queryInterface.addColumn('dining_events', 'eventTimes', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of event times, e.g. ["18:30", "21:00"]'
    });

    // ✅ Remove the old single eventTime field if it exists
    const tableInfo = await queryInterface.describeTable('dining_events');
    if (tableInfo.eventTime) {
      await queryInterface.removeColumn('dining_events', 'eventTime');
    }
  },

  async down(queryInterface, Sequelize) {
    // ✅ Revert back to single TIME field
    await queryInterface.addColumn('dining_events', 'eventTime', {
      type: Sequelize.TIME,
      allowNull: true
    });

    await queryInterface.removeColumn('dining_events', 'eventTimes');
  }
};
