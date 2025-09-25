require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { sequelize } = require("./models");


const app = express();

// ✅ Allow all origins (CORS)
app.use(
  cors({
    origin: "*", // Allow all origins
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // Allow all HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allow headers
  })
);

app.use(express.json());

app.use("/uploads", express.static("uploads"));

// ✅ Routes
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/auth", require("./routes/auth.routes"));
app.use('/api/carts', require('./routes/cart.routes'));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use('/api/restaurants', require('./routes/restaurant.routes'));
app.use('/api/food-items', require('./routes/fooditem.routes'));
app.use("/api", require("./routes/upload.routes"));
app.use('/api/categories', require('./routes/category.routes'));
app.use('/api/cuisines', require('./routes/cuisine.routes'));
app.use("/api/delivery", require("./routes/deliveryPartner.routes"));
app.use("/api", require("./routes/order.routes"));
app.use("/api/subscriptions", require("./routes/subscription.routes"));
app.use('/api', require('./routes/offer.routes'));
app.use('/api',require('./routes/address.routes') );
app.use("/api/notifications",require ('./routes/notification.routes'));
app.use("/api/partner", require ('./routes/partner.routes'));
app.use('/api/reviews/customer-to-restaurant', require('./routes/reviewCustomerToRestaurantRoutes'));
app.use('/api/reviews/customer-to-delivery', require('./routes/reviewCustomerToDeliveryRoutes'));
app.use('/api/reviews/delivery-to-customer', require('./routes/reviewDeliveryToCustomerRoutes'));
app.use('/api/reviews/restaurant-to-delivery', require('./routes/reviewRestaurantToDeliveryRoutes'));
app.use("/api",require('./routes/deliverySummaryRoutes') );





// ✅ Swagger setup
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = JSON.parse(
  fs.readFileSync(path.join(__dirname, "swagger.json"), "utf8")
);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, { explorer: true })
);

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");
  } catch (e) {
    console.error("❌ DB connection failed", e);
  }
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  console.log(`📘 Swagger UI: http://localhost:${PORT}/api-docs`);
});
