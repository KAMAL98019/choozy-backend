require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { sequelize } = require("./models");
const admin = require("./config/firebase");



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
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api", require("./routes/uploadRoutes"));


// ✅ Routes

// Customer
app.use("/api/users", require("./routes/customer/userRoutes"));
app.use('/api',require('./routes/customer/addressRoutes') );
app.use('/api/cart', require('./routes/customer/cartRoutes'));
app.use('/api/customer',require('./routes/customer/customerBookingRoutes') );
app.use('/api',require('./routes/customer/offerRoutes') );
app.use('/api/reviews/customer-to-restaurant', require('./routes/customer/reviewCustomerToRestaurantRoutes'));
app.use('/api/reviews/customer-to-delivery', require('./routes/customer/reviewCustomerToDeliveryRoutes'));

// Restaurant
app.use('/api/restaurants', require('./routes/restaurant/restaurantRoutes'));
app.use('/api/food-items', require('./routes/restaurant/foodItemRoutes'));
app.use('/api',require('./routes/restaurant/restaurantOrderRoutes')  );
app.use('/api',require('./routes/restaurant/restaurantBookingRoutes') );
app.use('/api',require('./routes/restaurant/offerRoutes') );
app.use('/api',require('./routes/restaurant/restaurantStatusRoutes') );
app.use("/api/subscriptions", require("./routes/restaurant/subscriptionRoutes"));
app.use('/api/reviews/restaurant-to-delivery', require('./routes/restaurant/reviewRestaurantToDeliveryRoutes'));

// Deliverypartner
app.use("/api/delivery", require("./routes/deliverypartner/deliveryPartnerRoutes"));
app.use("/api", require("./routes/deliverypartner/deliveryOrderRoutes"));
app.use("/api/partner", require ('./routes/deliverypartner/deliveryPartnerAttendanceRoutes'));
app.use('/api/reviews/delivery-to-customer', require('./routes/deliverypartner/reviewDeliveryToCustomerRoutes'));
app.use("/api",require('./routes/deliverypartner/deliverySummaryRoutes') );

// Admin
app.use('/api/admin',require('./routes/admin/adminRoutes') );
app.use('/api/admin', require('./routes/admin/userRoutes'));
app.use('/api/admin', require('./routes/admin/restaurantRoutes'));
app.use('/api/admin', require('./routes/admin/deliveryPartnerRoutes'));
app.use('/api/admin', require('./routes/admin/orderRoutes'));
app.use('/api/admin', require('./routes/admin/bookingRoutes'));
app.use('/api/admin', require('./routes/admin/offerRoutes'));
app.use('/api/admin/categories', require('./routes/admin/categoryRoutes'));
app.use('/api/cuisines', require('./routes/admin/cuisineRoutes'));


app.use("/api/notifications",require ('./routes/notificationRoutes'));


// ✅ Optional test route
app.get("/api/firebase-test", async (req, res) => {
  try {
    const users = await admin.auth().listUsers(1);
    res.json({ success: true, message: "Firebase connected successfully", users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});






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

app.listen(PORT,"0.0.0.0", async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");
  } catch (e) {
    console.error("❌ DB connection failed", e);
  }
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  console.log(`📘 Swagger UI: http://localhost:${PORT}/api-docs`);
 });

 