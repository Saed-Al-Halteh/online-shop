const Product = require("../models/product");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const session = require("express-session");
const stripe = require("stripe")(
  "sk_test_51N1RNVKlYR2oM4sGZKfkippi7X7Agv7zBDuh9aNzRLcNIYzqDrCRIpRoTDBh8DInNVGNyOzOofkKrMciG3x9NffA00uxrDwflX"
);

const ITEMS_PER_PAGE = 2;

exports.getProducts = async (req, res, next) => {
  try {
    const page = +req.query.page || 1;

    const productsTotalCount = await Product.count();

    const products = await Product.findAll({
      limit: ITEMS_PER_PAGE,
      offset: (page - 1) * ITEMS_PER_PAGE,
    });
    res.render("shop/product-list", {
      prods: products,
      pageTitle: "All Products",
      path: "/products",
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < productsTotalCount,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(productsTotalCount / ITEMS_PER_PAGE),
    });
  } catch (error) {
    console.log(error);
  }
};

exports.getProduct = async (req, res, next) => {
  const prodId = req.params.productId;
  try {
    // findByPk returns an object
    const product = await Product.findByPk(prodId);

    // findAll returns an array
    // const [product] = await Product.findAll({ where: { id: prodId } });

    const { title } = product;
    res.render("shop/product-detail", {
      product: product,
      pageTitle: title,
      path: "/products",
    });
  } catch (err) {
    console.log("------");
    console.log(err);
  }
};

exports.getIndex = async (req, res, next) => {
  try {
    const page = +req.query.page || 1;

    const productsTotalCount = await Product.count();

    const products = await Product.findAll({
      limit: ITEMS_PER_PAGE,
      offset: (page - 1) * ITEMS_PER_PAGE,
    });
    res.render("shop/index", {
      prods: products,
      pageTitle: "Shop",
      path: "/",
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < productsTotalCount,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(productsTotalCount / ITEMS_PER_PAGE),
      // isAuthenticated: req.session.isLoggedIn,
      // csrfToken: req.csrfToken(), // provide by csrfProtection middleware
    });
  } catch (error) {
    console.log(error);
  }
};

exports.getCart = async (req, res, next) => {
  const { user } = req;
  let cartProducts;
  if (user) {
    const cart = await user.getCart();
    cartProducts = await cart.getProducts();
  }

  res.render("shop/cart", {
    path: "/cart",
    pageTitle: "Your Cart",
    products: cartProducts || [],
  });
};

exports.postCart = async (req, res, next) => {
  const productId = req.body.productId;
  const { user } = req;

  const cart = await user.getCart();

  // check if the product already exisist on the cart
  let cartProduct;
  const cartProducts = await cart.getProducts({
    where: { id: productId },
  });

  if (cartProducts.length) {
    cartProduct = cartProducts[0];
  }
  if (cartProduct) {
    // get the old qty and add 1 to it.
    const oldQuantity = cartProduct.cartItem.quantity;
    const newQuantity = oldQuantity + 1;
    await cart.addProduct(cartProduct, { through: { quantity: newQuantity } });
  } else {
    const product = await Product.findByPk(productId);

    await cart.addProduct(product, { through: { quantity: 1 } });
  }

  res.redirect("/cart");
};

exports.postCartDeleteProduct = async (req, res, next) => {
  const productId = req.body.productId;

  const { user } = req;

  const cart = await user.getCart();

  // check if the product already exisist on the cart have qty > 1
  let cartProduct;
  const cartProducts = await cart.getProducts({
    where: { id: productId },
  });

  if (cartProducts.length) {
    cartProduct = cartProducts[0];
  }
  const cartProductQunatity = cartProduct.cartItem.quantity;
  if (cartProductQunatity > 1) {
    // get the old qty and remove 1 from it.
    const newQuantity = cartProductQunatity - 1;
    await cart.addProduct(cartProduct, { through: { quantity: newQuantity } });
  } else {
    // if it is only one, then remove it from the cartItem table
    await cartProduct.cartItem.destroy();
    // this will destroy the product from the
    //cartItem table and not from the product table itself.
  }

  res.redirect("/cart");
};

exports.postOrder = async (req, res, next) => {
  //1) get cart items
  const { user } = req;

  const cart = await user.getCart();

  const cartProducts = await cart.getProducts();

  // creatre an order and add all cart Products to it
  const order = await user.createOrder();
  // ------ my method, whcih do multiple hits to the database whcih is something to avoid ------
  // take all cart items and move them to new order
  // cartProducts.forEach(async (cartProduct) => {
  //   await order.addProduct(cartProduct, {
  //     through: { quantity: cartProduct.cartItem.quantity },
  //   });
  //   // remove the item for the cart
  //   cartProduct.cartItem.destroy();
  // });

  // ------ Maximilain method ------
  await order.addProducts(
    cartProducts.map((cartProduct) => {
      cartProduct.orderItem = { quantity: cartProduct.cartItem.quantity };
      return cartProduct;
    })
  );
  await cart.setProducts(null); //cleaning up the care by setting its products to null
  res.redirect("/orders");
};

exports.getOrders = async (req, res, next) => {
  const { user } = req;

  let orders;
  if (user) {
    orders = await user.getOrders({ include: ["products"] });
  }

  res.render("shop/orders", {
    path: "/orders",
    pageTitle: "Your Orders",
    orders: orders || [],
  });
};

exports.getCheckout = async (req, res, next) => {
  const { user } = req;
  let cartProducts;
  if (user) {
    const cart = await user.getCart();
    cartProducts = await cart.getProducts();
  }

  let totalPrice = 0;
  cartProducts.forEach((product) => {
    totalPrice += product.price * product.cartItem.quantity;
  });

  cartProducts.forEach((p) => {
    console.log({
      quantity: p.cartItem.quantity,
      price_data: {
        unit_amount: p.price * 100, //price in cents
        currency: "usd",
        product_data: {
          name: p.title,
          description: p.description,
        },
      },
    });
  });

  const stripeSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: user.email,
    line_items: cartProducts.map((p) => {
      return {
        quantity: p.cartItem.quantity,
        price_data: {
          unit_amount: p.price * 100, //price in cents
          currency: "usd",
          product_data: {
            name: p.title,
            description: p.description,
          },
        },
      };
    }),
    success_url: req.protocol + "://" + req.get("host") + "/checkout/success",
    cancel_url: req.protocol + "://" + req.get("host") + "/checkout/cancel",
  });
  console.log("stripeSession-->", stripeSession);
  res.render("shop/checkout", {
    path: "/checkout",
    pageTitle: "Checkout",
    products: cartProducts || [],
    totalSum: totalPrice,
    sessionId: stripeSession.id,
  });
};

exports.getInvoice = async (req, res, next) => {
  const { user } = req;
  const { orderId } = req.params;

  // make sure only the user who have the requested order can retrieve it and not any logged in user
  const orders = await user.getOrders({ where: { id: orderId } });
  console.log("order ->", orders);
  if (!orders.length) {
    return next(new Error("No order found"));
  }
  const order = orders[0];
  const products = await order.getProducts();
  // console.log("products ---> ", products);

  const invoiceName = `invoice-${orderId}.pdf`;
  const invoicePath = path.join("data", "invoices", invoiceName);

  const pdfDoc = new PDFDocument();
  // this pdfDoc will be readable stream.
  pdfDoc.pipe(fs.createWriteStream(invoicePath));
  pdfDoc.pipe(res);

  pdfDoc.fontSize(26).text("Invoice", {
    underline: true,
  });
  pdfDoc.text("--------------------------");

  let totalPrice = 0;
  products.forEach((product) => {
    totalPrice += product.orderItem.quantity * product.price;
    // console.log("product --> ", product.orderItem);
    pdfDoc
      .fontSize(14)
      .text(
        `${product.title} - ${product.orderItem.quantity} x $${product.price}`
      );
  });
  pdfDoc.fontSize(26).text("--------------------------");

  pdfDoc.fontSize(14).text(`Total Price = $${totalPrice}`);
  pdfDoc.end();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${invoiceName}`);

  // fs.readFile(invoicePath, (err, data) => {
  //   if (err) {
  //     console.log(err);
  //     return next(err);
  //   }
  //   res.setHeader("Content-Type", "application/pdf");
  //   res.setHeader("Content-Disposition", `attachment; filename=${invoiceName}`);
  //   res.send(data);
  // });

  // const file = fs.createReadStream(invoicePath);
  // res.setHeader("Content-Type", "application/pdf");
  // res.setHeader("Content-Disposition", `attachment; filename=${invoiceName}`);
  // file.pipe(res);
};
