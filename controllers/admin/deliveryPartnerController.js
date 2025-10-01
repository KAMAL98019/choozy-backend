const { Partner, Order, PartnerAttendance } = require('../../models');
const { Op } = require('sequelize');
const sequelize = require('../../models').sequelize;

/**
 * Get all delivery partners with filters and pagination
 */
exports.getAllPartners = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      vehicleType,
      search
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Filter by vehicle type
    if (vehicleType) {
      whereClause.vehicleType = vehicleType;
    }

    // Search by name, email, or mobile
    if (search) {
      whereClause[Op.or] = [
        { fullName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { mobile: { [Op.like]: `%${search}%` } },
        { id: { [Op.like]: `%${search}%` } }
      ];
    }

    // Fetch partners
    const { count, rows: partners } = await Partner.findAndCountAll({
      where: whereClause,
      attributes: [
        'id',
        'fullName',
        'email',
        'mobile',
        'vehicleType',
        'status',
        'createdAt'
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate rating for each partner (from orders)
    const partnersWithRating = await Promise.all(
      partners.map(async (partner) => {
        const orders = await Order.findAll({
          where: { partnerId: partner.id },
          attributes: ['id']
        });

        // For now, return N/A if no rating system
        // You can add rating calculation from reviews here
        const rating = 'N/A';

        return {
          id: partner.id,
          fullName: partner.fullName,
          email: partner.email,
          mobile: partner.mobile,
          vehicleType: partner.vehicleType,
          status: partner.status,
          registrationDate: partner.createdAt,
          rating: rating
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Delivery partners fetched successfully',
      data: {
        partners: partnersWithRating,
        pagination: {
          totalPartners: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching delivery partners:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery partners',
      error: error.message
    });
  }
};

/**
 * Get single delivery partner details
 */
exports.getPartnerById = async (req, res) => {
  try {
    const { id } = req.params;

    const partner = await Partner.findByPk(id, {
      attributes: [
        'id',
        'fullName',
        'mobile',
        'email',
        'dob',
        'gender',
        'address',
        'city',
        'state',
        'pincode',
        'emergencyName',
        'emergencyMobile',
        'vehicleType',
        'vehicleModel',
        'licensePlate',
        'rcFile',
        'dlFile',
        'workType',
        'breakStart',
        'breakEnd',
        'bankName',
        'accountNumber',
        'ifsc',
        'idProofFile',
        'status',
        'createdAt'
      ]
    });

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Delivery partner not found'
      });
    }

    // Get total deliveries
    const totalDeliveries = await Order.count({
      where: { 
        partnerId: id,
        status: 'DELIVERED'
      }
    });

    // Get average delivery time (mock data for now)
    const avgDeliveryTime = '25 min';

    // Get cancellation rate (mock data)
    const cancellationRate = '2%';

    // Get customer complaints (mock data)
    const customerComplaints = 5;

    // Get total earnings to date
    const totalEarnings = await Order.sum('deliveryFee', {
      where: {
        partnerId: id,
        status: 'DELIVERED'
      }
    }) || 0;

    // Get attendance data
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const attendanceRecords = await PartnerAttendance.findAll({
      where: {
        partnerId: id,
        attendanceTime: {
          [Op.gte]: new Date(currentYear, currentMonth, 1),
          [Op.lt]: new Date(currentYear, currentMonth + 1, 1)
        }
      },
      order: [['attendanceTime', 'ASC']]
    });

    const daysPresent = attendanceRecords.filter(a => a.status === 'ONLINE').length;
    const daysAbsent = attendanceRecords.filter(a => a.status === 'OFFLINE').length;

    res.status(200).json({
      success: true,
      message: 'Delivery partner details fetched successfully',
      data: {
        personalInfo: {
          id: partner.id,
          fullName: partner.fullName,
          mobile: partner.mobile,
          email: partner.email,
          dob: partner.dob,
          gender: partner.gender,
          address: `${partner.address}, ${partner.city}, ${partner.state} - ${partner.pincode}`,
          emergencyContact: {
            name: partner.emergencyName,
            mobile: partner.emergencyMobile
          },
          status: partner.status,
          joinedDate: partner.createdAt
        },
        vehicleInfo: {
          vehicleType: partner.vehicleType,
          vehicleModel: partner.vehicleModel,
          licensePlate: partner.licensePlate,
          rcStatus: partner.rcFile ? 'Verified' : 'Pending',
          dlStatus: partner.dlFile ? 'Verified' : 'Pending'
        },
        performanceActivity: {
          totalDeliveries,
          avgDeliveryTime,
          cancellationRate,
          customerComplaints
        },
        payoutBankDetails: {
          bankName: partner.bankName,
          accountNumber: partner.accountNumber,
          ifsc: partner.ifsc,
          totalEarningsToDate: totalEarnings,
          idProofStatus: partner.idProofFile ? 'Verified' : 'Pending'
        },
        workTypeAttendance: {
          workType: partner.workType,
          breakTime: partner.breakStart && partner.breakEnd 
            ? `${partner.breakStart} - ${partner.breakEnd}` 
            : 'Not set',
          daysPresent,
          daysAbsent
        },
        uploadedDocuments: {
          aadharCard: partner.idProofFile ? 'Verified' : 'Pending',
          panCard: 'Pending',
          drivingLicense: partner.dlFile ? 'Verified' : 'Pending',
          vehicleRC: partner.rcFile ? 'Verified' : 'Pending',
          policeVerification: 'Pending'
        }
      }
    });
  } catch (error) {
    console.error('Error fetching partner details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch partner details',
      error: error.message
    });
  }
};

/**
 * Get delivery partner statistics
 */
exports.getPartnerStats = async (req, res) => {
  try {
    const totalPartners = await Partner.count();
    const activePartners = await Partner.count({ where: { status: 'active' } });
    const onDutyPartners = await Partner.count({ where: { status: 'on-duty' } });
    const pendingApproval = await Partner.count({ where: { status: 'pending' } });
    const inactivePartners = await Partner.count({ where: { status: 'inactive' } });

    res.status(200).json({
      success: true,
      message: 'Partner statistics fetched successfully',
      data: {
        totalPartners,
        activePartners,
        onDutyPartners,
        pendingApproval,
        inactivePartners
      }
    });
  } catch (error) {
    console.error('Error fetching partner stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch partner statistics',
      error: error.message
    });
  }
};

/**
 * Update delivery partner status
 */
exports.updatePartnerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'active', 'on-duty', 'inactive', 'blocked'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: pending, active, on-duty, inactive, blocked'
      });
    }

    const partner = await Partner.findByPk(id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Delivery partner not found'
      });
    }

    partner.status = status;
    await partner.save();

    let message = 'Partner status updated successfully';
    if (status === 'active') {
      message = 'Partner approved and activated successfully';
    } else if (status === 'blocked') {
      message = 'Partner blocked successfully';
    } else if (status === 'inactive') {
      message = 'Partner deactivated successfully';
    }

    res.status(200).json({
      success: true,
      message,
      data: {
        id: partner.id,
        fullName: partner.fullName,
        status: partner.status
      }
    });
  } catch (error) {
    console.error('Error updating partner status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update partner status',
      error: error.message
    });
  }
};

/**
 * Get unique vehicle types (for filter dropdown)
 */
exports.getVehicleTypes = async (req, res) => {
  try {
    const vehicles = await Partner.findAll({
      attributes: [
        [sequelize.fn('DISTINCT', sequelize.col('vehicleType')), 'vehicleType']
      ],
      raw: true
    });

    const vehicleList = vehicles.map(v => v.vehicleType).filter(Boolean);

    res.status(200).json({
      success: true,
      message: 'Vehicle types fetched successfully',
      data: vehicleList
    });
  } catch (error) {
    console.error('Error fetching vehicle types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicle types',
      error: error.message
    });
  }
};