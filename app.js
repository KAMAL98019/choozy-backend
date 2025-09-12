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

// ✅ Routes
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/auth", require("./routes/auth.routes"));
app.use('/api/cart', require('./routes/cart.routes'));
app.use('/api/checkout', require('./routes/checkout.routes'));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use('/api/restaurants', require('./routes/restaurant.routes'));
app.use('/api/food-items', require('./routes/fooditem.routes'));
app.use("/api", require("./routes/upload.routes"));
app.use('/api/categories', require('./routes/category.routes'));
app.use('/api/cuisines', require('./routes/cuisine.routes'));


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
