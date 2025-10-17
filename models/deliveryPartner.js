module.exports = (sequelize, DataTypes) => {
  const Partner = sequelize.define("Partner", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    // ---------------- Personal Details ----------------
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    dob: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    referralCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // ✅ Add this new field
    profilePhoto: {
      type: DataTypes.STRING, // file path or URL
      allowNull: true,
    },

    // ---------------- Address + Emergency ----------------
    address: DataTypes.STRING,
    city: DataTypes.STRING,
    state: DataTypes.STRING,
    pincode: DataTypes.STRING,
    emergencyName: DataTypes.STRING,
    emergencyMobile: DataTypes.STRING,

    // ---------------- Vehicle ----------------
    vehicleType: DataTypes.STRING,
    vehicleModel: DataTypes.STRING,
    licensePlate: DataTypes.STRING,
    rcFile: DataTypes.STRING,
    dlFile: DataTypes.STRING,

    // ---------------- Work Type ----------------
    workType: {
      type: DataTypes.ENUM("full-time", "part-time", "weekend"),
      allowNull: true,
    },
    breakStart: DataTypes.TIME,
    breakEnd: DataTypes.TIME,

    // ---------------- Payout ----------------
    bankName: DataTypes.STRING,
    accountNumber: DataTypes.STRING,
    ifsc: DataTypes.STRING,
    idProofFile: DataTypes.STRING,

    status: {
      type: DataTypes.ENUM("pending", "active", "on-duty", "inactive", "blocked"),
      allowNull: false,
      defaultValue: "active"
    },
    otp: {
      type: DataTypes.STRING(6),
      allowNull: true
    },
    otpExpiry: {
      type: DataTypes.DATE,
      allowNull: true
    },
    otpVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }

  });

  Partner.associate = (models) => {
    Partner.hasMany(models.Order, { foreignKey: "partnerId", as: "orders" });
    Partner.hasMany(models.DeliveryOrder, { foreignKey: "partnerId", as: "deliveries" });

  };

  return Partner;
};
