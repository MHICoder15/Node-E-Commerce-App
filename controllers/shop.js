const Product = require("../models/product");
const Order = require("../models/order");
const dotenv = require("dotenv");
dotenv.config();
const { validationResult } = require("express-validator");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const ITEMS_PER_PAGE = process.env.ITEMS_PER_PAGE;
const STRIPE_PUBLIC_KEY = process.env.STRIPE_PUBLIC_KEY;
const STRIPE_PRIVATE_KEY = process.env.STRIPE_PRIVATE_KEY;
const stripe = require("stripe")(STRIPE_PRIVATE_KEY);

exports.getProduct = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;
  Product.find()
    .countDocuments()
    .then((numProducts) => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
        errorMessage: req.flash("error"),
        totalPages: Math.ceil(totalItems / ITEMS_PER_PAGE),
        currentPage: page,
        nextPage: page + 1,
        previousPage: page - 1,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log("🚀 ~ Find Product", error);
      return next(error);
    });
};

exports.getProductDetail = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log("🚀 ~ Find Product By ID", error);
      return next(error);
    });
};

exports.getAddProduct = (req, res, next) => {
  res.render("shop/add-product", {
    pageTitle: "Add Product",
    path: "/add-product",
    hasError: false,
    product: {
      title: null,
      imageUrl: null,
      price: null,
      description: null,
    },
    errorMessage: req.flash("error"),
    validationErrors: [],
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;

  if (!image) {
    return res.status(422).render("add-product", {
      pageTitle: "Add Product",
      path: "/add-product",
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
      },
      errorMessage: "Attached file is not an image.",
      validationErrors: [],
    });
  }

  const imageUrl = image.path;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("shop/add-product", {
      pageTitle: "Add Product",
      path: "/add-product",
      hasError: true,
      product: {
        title: title,
        imageUrl: imageUrl,
        price: price,
        description: description,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array().map((e) => e.path),
    });
  }

  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user,
  });
  product
    .save()
    .then((result) => {
      console.log("Created Product");
      res.redirect("/");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log("🚀 ~ Add Product", error);
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      const products = user.cart.items;
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log("🚀 ~ Find Cart Items", error);
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log("🚀 ~ Find Product By ID", error);
      return next(error);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log("🚀 ~ Remove From Cart", error);
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  let products;
  let total;
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      products = user.cart.items;
      total = 0;
      products.forEach((p) => {
        total += p.quantity * p.productId.price;
      });
      return stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: products.map((p) => {
          return {
            quantity: p.quantity,
            price_data: {
              currency: "usd",
              unit_amount: p.productId.price * 100,
              product_data: {
                name: p.productId.title,
                description: p.productId.description,
              },
            },
          };
        }),
        success_url:
          req.protocol + "://" + req.get("host") + "/checkout/success",
        cancel_url: req.protocol + "://" + req.get("host") + "/checkout/cancel",
      });
    })
    .then((session) => {
      res.render("shop/checkout", {
        path: "/checkout",
        pageTitle: "Checkout",
        products: products,
        totalSum: total,
        sessionId: session.id,
        stripePublicKey: STRIPE_PUBLIC_KEY,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log("🚀 ~ Find Cart Items", error);
      return next(error);
    });
};

exports.getCheckoutSuccess = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          name: req.user.name,
          email: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      return order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log("🚀 ~ Save Order", error);
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log("🚀 ~ Find Order", error);
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        const error = new Error("No Order Found.");
        return next(error);
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        const error = new Error("Unauthorized.");
        return next(error);
      }
      const invoiceName = "invoice-" + orderId + ".pdf";
      console.log("🚀 ~ .then ~ invoiceName:", invoiceName);
      const invoicePath = path.join("data", "invoices", invoiceName);

      // Use For PDF Kit Package
      const pdfDoc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'inline; filename="' + invoiceName + '"'
      );
      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(30).text("Invoice", { underline: true });
      pdfDoc.fontSize(20).text("--------------------");
      let totalPrice = 0;
      order.products.forEach((prod) => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc
          .fontSize(15)
          .text(
            prod.product.title +
              " - " +
              prod.quantity +
              " x " +
              "$" +
              prod.product.price
          );
      });
      pdfDoc.fontSize(20).text("--------------------");
      pdfDoc.fontSize(20).text("Total Price: $" + totalPrice);
      pdfDoc.end();
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
