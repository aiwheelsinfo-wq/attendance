const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');

// Check if mongoose is connected
function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

// In-Memory Database Fallbacks
let memoryEmployees = [
  { employeeId: "EMP-001", name: "Amit Sharma", email: "amit.sharma@company.com", department: "IT & Software", role: "Admin", status: "Active", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amit", joinedDate: new Date() },
  { employeeId: "EMP-002", name: "Priya Patel", email: "priya.patel@company.com", department: "Human Resources", role: "HR", status: "Active", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya", joinedDate: new Date() },
  { employeeId: "EMP-003", name: "Rohan Mehta", email: "rohan.mehta@company.com", department: "IT & Software", role: "Manager", status: "Active", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan", joinedDate: new Date() },
  { employeeId: "EMP-004", name: "Sneha Reddy", email: "sneha.reddy@company.com", department: "Marketing", role: "Employee", status: "Active", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha", joinedDate: new Date() },
  { employeeId: "EMP-005", name: "Vikram Singh", email: "vikram.singh@company.com", department: "Finance", role: "Manager", status: "Active", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram", joinedDate: new Date() },
  { employeeId: "EMP-006", name: "Neha Gupta", email: "neha.gupta@company.com", department: "Operations", role: "Employee", status: "Active", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Neha", joinedDate: new Date() },
  { employeeId: "EMP-007", name: "Arjun Verma", email: "arjun.verma@company.com", department: "Sales", role: "Employee", status: "Active", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun", joinedDate: new Date() },
  { employeeId: "EMP-008", name: "Kiran Rao", email: "kiran.rao@company.com", department: "IT & Software", role: "Employee", status: "Active", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kiran", joinedDate: new Date() },
  { employeeId: "EMP-009", name: "Anjali Desai", email: "anjali.desai@company.com", department: "Marketing", role: "Employee", status: "Active", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anjali", joinedDate: new Date() },
  { employeeId: "EMP-010", name: "Suresh Nair", email: "suresh.nair@company.com", department: "Finance", role: "Employee", status: "Inactive", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Suresh", joinedDate: new Date() }
];

let memoryAttendance = [];
let memoryAuditLogs = [
  { _id: 'log_seed', user: 'System (Demo)', action: 'Data Seeding', details: 'Initialized memory database with 10 employees and 30-day logs', timestamp: new Date() },
  { _id: 'log_init', user: 'HR Admin', action: 'Bulk Upload', details: 'Configured avatar services and department nodes', timestamp: new Date() }
];

// Helper to format date as YYYY-MM-DD
function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Generate in-memory history of attendance for testing
(function preseedMemoryAttendance() {
  const today = new Date();
  const activeEmps = memoryEmployees.filter(e => e.status === 'Active');
  
  for (let i = 30; i >= 0; i--) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() - i);
    const dayOfWeek = currentDate.getDay();
    const dateStr = formatDate(currentDate);

    // Skip weekends mostly
    if ((dayOfWeek === 0 || dayOfWeek === 6) && Math.random() > 0.15) {
      continue;
    }

    activeEmps.forEach((emp, index) => {
      const rand = Math.random();
      let status = 'Present';
      if (rand > 0.85 && rand <= 0.93) {
        status = 'Absent';
      } else if (rand > 0.93) {
        status = 'Leave';
      }

      let checkIn = '';
      let checkOut = '';
      let lateStatus = 'N/A';
      let overtime = 0;
      let workingHours = 0;
      let location = 'Office';
      let notes = '';

      if (status === 'Present') {
        const isLate = Math.random() < 0.20;
        
        // Random checkin
        if (isLate) {
          const min = Math.floor(Math.random() * 50) + 5;
          checkIn = `09:${String(min).padStart(2, '0')} AM`;
          lateStatus = 'Late';
          notes = 'Delayed due to traffic';
        } else {
          const min = Math.floor(Math.random() * 30) + 30;
          checkIn = `08:${String(min).padStart(2, '0')} AM`;
          lateStatus = 'On-Time';
        }

        // Random checkout
        const hr = Math.floor(Math.random() * 2) + 5; // 5 or 6 PM
        const min = Math.floor(Math.random() * 60);
        checkOut = `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')} PM`;
        
        // Working hours calculation
        const inHrs = checkIn.includes('09:') ? 9 + parseInt(checkIn.substring(3,5))/60 : 8 + parseInt(checkIn.substring(3,5))/60;
        const outHrs = 12 + parseInt(checkOut.substring(0,2)) + parseInt(checkOut.substring(3,5))/60;
        workingHours = parseFloat((outHrs - inHrs).toFixed(2));

        if (workingHours > 9) {
          overtime = parseFloat((workingHours - 9).toFixed(2));
        }
        location = Math.random() < 0.85 ? 'Office' : 'Work From Home';
      } else if (status === 'Leave') {
        notes = Math.random() < 0.5 ? 'Casual Leave' : 'Sick Leave';
      }

      memoryAttendance.push({
        _id: `mem_att_${dateStr}_${emp.employeeId}`,
        employeeId: emp.employeeId,
        date: dateStr,
        checkIn,
        checkOut,
        status,
        lateStatus,
        overtime,
        workingHours,
        location,
        notes,
        isApproved: true,
        approvedBy: 'Auto-System',
        createdAt: currentDate,
        updatedAt: currentDate
      });
    });
  }
  console.log(`Pre-seeded ${memoryAttendance.length} attendance records in memory fallback.`);
})();

// Data Operations

// EMPLOYEES CRUD
async function getEmployees() {
  if (isDbConnected()) {
    try {
      return await Employee.find({});
    } catch (e) {
      console.error("Mongoose employee query failed, falling back to memory:", e.message);
    }
  }
  return memoryEmployees;
}

async function getEmployeeById(employeeId) {
  if (isDbConnected()) {
    try {
      return await Employee.findOne({ employeeId });
    } catch (e) {
      console.error("Mongoose employee query failed:", e.message);
    }
  }
  return memoryEmployees.find(e => e.employeeId === employeeId);
}

async function createEmployee(data) {
  if (isDbConnected()) {
    const newEmp = new Employee(data);
    return await newEmp.save();
  }
  
  // Verify unique
  if (memoryEmployees.find(e => e.employeeId === data.employeeId)) {
    throw new Error('Employee ID already exists');
  }

  const newEmp = { ...data, joinedDate: new Date(), avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}` };
  memoryEmployees.push(newEmp);
  return newEmp;
}

// ATTENDANCE CRUD
async function getAttendance(filters = {}) {
  let records = [];

  if (isDbConnected()) {
    try {
      // Aggregate attendance with employee details
      const query = {};
      if (filters.date) query.date = filters.date;
      if (filters.status) query.status = filters.status;
      if (filters.employeeId) query.employeeId = filters.employeeId;

      let result = await Attendance.find(query).lean();

      // Get all employees for mapping
      const employees = await Employee.find({}).lean();
      const empMap = employees.reduce((acc, emp) => {
        acc[emp.employeeId] = emp;
        return acc;
      }, {});

      // Merge employee info
      records = result.map(record => ({
        ...record,
        employee: empMap[record.employeeId] || { 
          name: record.employeeName || 'Ex-Employee', 
          department: record.employeeDept || 'Unknown', 
          avatar: record.employeeAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=deleted' 
        }
      }));

      // Apply department & search filter
      if (filters.department) {
        records = records.filter(r => r.employee.department === filters.department);
      }
      if (filters.search) {
        const searchL = filters.search.toLowerCase();
        records = records.filter(r => 
          r.employeeId.toLowerCase().includes(searchL) || 
          r.employee.name.toLowerCase().includes(searchL)
        );
      }
      return records;
    } catch (e) {
      console.error("Mongoose attendance query failed, falling back to memory:", e.message);
    }
  }

  // Memory filtering logic
  records = memoryAttendance.map(record => {
    const emp = memoryEmployees.find(e => e.employeeId === record.employeeId) || { 
      name: record.employeeName || 'Ex-Employee', 
      department: record.employeeDept || 'Unknown', 
      avatar: record.employeeAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=deleted' 
    };
    return { ...record, employee: emp };
  });

  if (filters.date) {
    records = records.filter(r => r.date === filters.date);
  }
  if (filters.status) {
    records = records.filter(r => r.status === filters.status);
  }
  if (filters.employeeId) {
    records = records.filter(r => r.employeeId === filters.employeeId);
  }
  if (filters.department) {
    records = records.filter(r => r.employee.department === filters.department);
  }
  if (filters.search) {
    const s = filters.search.toLowerCase();
    records = records.filter(r => 
      r.employeeId.toLowerCase().includes(s) || 
      r.employee.name.toLowerCase().includes(s)
    );
  }

  // Sort by date desc, then employeeId asc
  return records.sort((a,b) => b.date.localeCompare(a.date) || a.employeeId.localeCompare(b.employeeId));
}

async function getAttendanceRecord(employeeId, date) {
  if (isDbConnected()) {
    try {
      return await Attendance.findOne({ employeeId, date });
    } catch (e) {
      console.error(e);
    }
  }
  return memoryAttendance.find(a => a.employeeId === employeeId && a.date === date);
}

async function saveAttendance(record) {
  let emp;
  if (isDbConnected()) {
    try {
      emp = await Employee.findOne({ employeeId: record.employeeId });
    } catch (e) {}
  }
  if (!emp) {
    emp = memoryEmployees.find(e => e.employeeId === record.employeeId);
  }

  const enrichedRecord = {
    ...record,
    employeeName: emp ? emp.name : (record.employeeName || 'Ex-Employee'),
    employeeDept: emp ? emp.department : (record.employeeDept || 'Unknown'),
    employeeAvatar: emp ? emp.avatar : (record.employeeAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=deleted')
  };

  if (isDbConnected()) {
    try {
      const query = { employeeId: record.employeeId, date: record.date };
      const options = { new: true, upsert: true };
      return await Attendance.findOneAndUpdate(query, enrichedRecord, options);
    } catch (e) {
      console.error("Mongoose save attendance failed, using memory:", e.message);
    }
  }

  const existingIdx = memoryAttendance.findIndex(a => a.employeeId === record.employeeId && a.date === record.date);
  const updatedRecord = { 
    ...enrichedRecord, 
    _id: existingIdx >= 0 ? memoryAttendance[existingIdx]._id : `mem_att_${record.date}_${record.employeeId}`,
    createdAt: existingIdx >= 0 ? memoryAttendance[existingIdx].createdAt : new Date(),
    updatedAt: new Date()
  };

  if (existingIdx >= 0) {
    memoryAttendance[existingIdx] = updatedRecord;
  } else {
    memoryAttendance.push(updatedRecord);
  }
  return updatedRecord;
}

async function approveAttendance(id, approvedBy = 'Admin') {
  if (isDbConnected() && !id.startsWith('mem_')) {
    try {
      return await Attendance.findByIdAndUpdate(id, { isApproved: true, approvedBy }, { new: true });
    } catch (e) {
      console.error(e);
    }
  }

  const idx = memoryAttendance.findIndex(a => a._id === id);
  if (idx >= 0) {
    memoryAttendance[idx].isApproved = true;
    memoryAttendance[idx].approvedBy = approvedBy;
    return memoryAttendance[idx];
  }
  return null;
}

async function deleteAttendance(id) {
  if (isDbConnected() && !id.startsWith('mem_')) {
    try {
      return await Attendance.findByIdAndDelete(id);
    } catch (e) {
      console.error(e);
    }
  }

  const idx = memoryAttendance.findIndex(a => a._id === id);
  if (idx >= 0) {
    const deleted = memoryAttendance.splice(idx, 1);
    return deleted[0];
  }
  return null;
}

// AUDIT LOGS
async function getAuditLogs() {
  if (isDbConnected()) {
    try {
      return await AuditLog.find({}).sort({ timestamp: -1 }).limit(100);
    } catch (e) {
      console.error(e);
    }
  }
  return [...memoryAuditLogs].sort((a,b) => b.timestamp - a.timestamp);
}

async function createAuditLog(user, action, details) {
  if (isDbConnected()) {
    try {
      const log = new AuditLog({ user, action, details });
      return await log.save();
    } catch (e) {
      console.error(e);
    }
  }

  const newLog = {
    _id: `mem_log_${Date.now()}_${Math.random()}`,
    user,
    action,
    details,
    timestamp: new Date()
  };
  memoryAuditLogs.push(newLog);
  return newLog;
}

// BULK UPLOAD CSV/EXCEL RECORDS
async function bulkUploadAttendance(records, user = 'Admin') {
  let count = 0;
  for (const r of records) {
    await saveAttendance({
      employeeId: r.employeeId,
      date: r.date,
      checkIn: r.checkIn || '',
      checkOut: r.checkOut || '',
      status: r.status || 'Present',
      lateStatus: r.lateStatus || 'On-Time',
      overtime: Number(r.overtime) || 0,
      workingHours: Number(r.workingHours) || 0,
      location: r.location || 'Office',
      notes: r.notes || '',
      isApproved: r.isApproved !== undefined ? r.isApproved : true,
      approvedBy: user
    });
    count++;
  }
  await createAuditLog(user, 'Bulk Upload', `Imported ${count} attendance records via file parser.`);
  return count;
}

async function deleteEmployee(employeeId) {
  if (isDbConnected()) {
    try {
      const deletedEmp = await Employee.findOneAndDelete({ employeeId });
      return deletedEmp;
    } catch (e) {
      console.error(e);
    }
  }

  const idx = memoryEmployees.findIndex(e => e.employeeId === employeeId);
  if (idx >= 0) {
    const deleted = memoryEmployees.splice(idx, 1);
    return deleted[0];
  }
  return null;
}

module.exports = {
  isDbConnected,
  getEmployees,
  getEmployeeById,
  createEmployee,
  deleteEmployee,
  getAttendance,
  getAttendanceRecord,
  saveAttendance,
  approveAttendance,
  deleteAttendance,
  getAuditLogs,
  createAuditLog,
  bulkUploadAttendance
};
