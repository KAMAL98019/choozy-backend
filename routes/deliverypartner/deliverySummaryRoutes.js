const express = require("express");
const router = express.Router();
const deliverySummaryController = require("../../controllers/deliverypartner/deliverySummaryController");

router.get("/delivery/summary/:orderId", deliverySummaryController.getDeliverySummary);

module.exports = router;
