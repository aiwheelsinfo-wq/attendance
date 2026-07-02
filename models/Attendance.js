const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    ref: 'Employee'
  },
  date: {
    type: String, // format YYYY-MM-DD
    required: true
  },
  checkIn: {
    type: String, // format "09:15 AM" or ""
    default: ''
  },
  checkOut: {
    type: String, // format "06:05 PM" or ""
    default: ''
  },
  status: {
    type: String,
    required: true,
    enum: ['Present', 'Absent', 'Leave'],
    default: 'Present'
  },
  lateStatus: {
    type: String,
    enum: ['Late', 'On-Time', 'N/A'],
    default: 'On-Time'
  },
  overtime: {
    type: Number, // in hours
    default: 0
  },
  workingHours: {
    type: Number, // in hours
    default: 0
  },
  location: {
    type: String, // GPS coordinates or "Office" / "Home"
    default: 'Office'
  },
  notes: {
    type: String,
    default: ''
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  approvedBy: {
    type: String,
    default: 'System'
  },
  employeeName: {
    type: String,
    default: ''
  },
  employeeDept: {
    type: String,
    default: ''
  },
  employeeAvatar: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Compound index to ensure one attendance record per employee per day
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
