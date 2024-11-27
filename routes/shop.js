const express = require("express");
const { body } = require("express-validator");

const shopController = require("../controllers/shop");
const isAuth = require("../middlewares/is-auth");

const router = express.Router();

router.get("/", shopController.getProduct);

router.get("/products/:productId", shopController.getProductDetail);

router.get("/add-product", isAuth, shopController.getAddProduct);

router.post(
  "/add-product",
  [
    body("title").isString().isLength({ min: 3 }).trim(),
    body("price").isFloat().trim(),
    body("description").isLength({ min: 5, max: 400 }).trim(),
  ],
  isAuth,
  shopController.postAddProduct
);

router.get("/cart", isAuth, shopController.getCart);

router.post("/cart", isAuth, shopController.postCart);

router.post("/cart-delete-item", isAuth, shopController.postCartDeleteProduct);

router.get("/checkout", isAuth, shopController.getCheckout);

router.get("/checkout/success", isAuth, shopController.getCheckoutSuccess);

router.get("/checkout/cancel", isAuth, shopController.getCheckout);

router.get("/orders", isAuth, shopController.getOrders);

router.get("/orders/:orderId", isAuth, shopController.getInvoice);

module.exports = router;
