const Sequelize = require("sequelize");

const sequelize = require("../util/database");

// Cart table should hold the different orders for different users. Not the products for each order.
const Order = sequelize.define("order", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  // maybe we could have added additonal fields related to the oreder such as the address
});

module.exports = Order;
