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
  });

  return Partner;
};
