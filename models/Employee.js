const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  department: {
    type: String,
    required: true,
    enum: ['IT & Software', 'Human Resources', 'Finance', 'Marketing', 'Operations', 'Sales'],
    default: 'IT & Software'
  },
  avatar: {
    type: String,
    default: '/img/default-avatar.svg'
  },
  role: {
    type: String,
    required: true,
    enum: ['Admin', 'HR', 'Manager', 'Employee'],
    default: 'Employee'
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  joinedDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Employee', EmployeeSchema);
