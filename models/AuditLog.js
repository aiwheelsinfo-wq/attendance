const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
    default: 'System'
  },
  action: {
    type: String,
    required: true
  },
  details: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
