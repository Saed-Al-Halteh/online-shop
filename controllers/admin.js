const Product = require("../models/product");
const { validationResult } = require("express-validator/check");
const { deleteFile } = require("../util/file");

const ITEMS_PER_PAGE = 2;

exports.getAddProduct = (req, res, next) => {
  return res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: [],
  });
};

exports.postAddProduct = async (req, res, next) => {
  const { title, price, description } = req.body;
  const image = req.file;

  console.log("image --> ", image);
  if (!image) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title,
        price,
        description,
      },
      errorMessage: "Attached File is not an image",
      validationErrors: [],
    });
  }

  const imageUrl = image.path;

  try {
    const { user } = req;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).render("admin/edit-product", {
        pageTitle: "Add Product",
        path: "/admin/add-product",
        editing: false,
        hasError: true,
        product: {
          title,
          price,
          description,
        },
        errorMessage: errors.array()[0].msg,
        validationErrors: errors.array(),
      });
    }
    // throw new Error("oops");
    await user.createProduct({
      title,
      imageUrl,
      price,
      description,
    });

    res.redirect("/");
  } catch (err) {
    // console.log(err);
    // res.redirect("/500");
    const error = new Error(err);
    error.httpStatusCode = 500;
    next(error);
  }
};

exports.getEditProduct = async (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/");
  }

  const prodId = req.params.productId;
  const { user } = req;

  //getProducts returns an array
  let product;
  try {
    const products = await user.getProducts({ where: { id: prodId } });
    product = products[0];
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    next(error);
  }
  if (!product) {
    return res.redirect("/");
  }
  return res.render("admin/edit-product", {
    pageTitle: "Edit Product",
    path: "/admin/edit-product",
    editing: editMode,
    product: product,
    hasError: true,
    errorMessage: null,
    validationErrors: [],
  });
};

exports.postEditProduct = async (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: false,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        id: prodId,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  // const product = await Product.findByPk(prodId);
  const { user } = req;
  try {
    const products = await user.getProducts({ where: { id: prodId } });
    const product = products[0];

    product.title = updatedTitle;
    product.price = updatedPrice;
    if (image) {
      //delete old image first.
      deleteFile(product.imageUrl);
      // set the path to the new imageUrl
      product.imageUrl = image.path;
    }
    product.description = updatedDesc;

    await product.save();
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    next(error);
  }

  res.redirect("/admin/products");
};

exports.getProducts = async (req, res, next) => {
  // const products = await Product.findAll();
  const { user } = req;
  const page = +req.query.page || 1;

  const userProducts = await user.getProducts();
  const productsTotalCount = userProducts.length;

  let products;
  try {
    products = await user.getProducts({
      limit: ITEMS_PER_PAGE,
      offset: (page - 1) * ITEMS_PER_PAGE,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    next(error);
  }

  res.render("admin/products", {
    prods: products,
    pageTitle: "Admin Products",
    path: "/admin/products",
    currentPage: page,
    hasNextPage: ITEMS_PER_PAGE * page < productsTotalCount,
    hasPreviousPage: page > 1,
    nextPage: page + 1,
    previousPage: page - 1,
    lastPage: Math.ceil(productsTotalCount / ITEMS_PER_PAGE),
  });
};

exports.postDeleteProduct = async (req, res, next) => {
  const prodId = req.body.productId;
  const { user } = req;

  try {
    const products = await Product.findAll({
      where: { id: prodId, userId: user.id },
    });
    const product = products[0];
    if (product) {
      deleteFile(product.imageUrl);

      // await Product.destroy({ where: { id: prodId, userId: user.id } });
      await product.destroy();
    }
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    next(error);
  }

  res.redirect("/admin/products");
};

exports.deleteProduct = async (req, res, next) => {
  const { productId } = req.params;
  const { user } = req;

  try {
    const products = await Product.findAll({
      where: { id: productId, userId: user.id },
    });
    const product = products[0];
    if (product) {
      deleteFile(product.imageUrl);

      // await Product.destroy({ where: { id: prodId, userId: user.id } });
      await product.destroy();
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Deleting Product Failed!" });
  }
  res.status(200).json({ message: "Success!" });
};
