const Sequelize = require("sequelize");

const sequelize = require("../util/database");

// Cart table should hold the different carts for different users. Not the products for each cart.
const Cart = sequelize.define("cart", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
});

module.exports = Cart;
