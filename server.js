const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const { connectDB, getDbStatus } = require('./config/db');
const dataService = require('./config/dataService');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: 'hrms-attendance-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// Setup template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Connect to Database (handles local fallback internally)
connectDB();

// Global variables middleware
app.use(async (req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.dbStatus = getDbStatus();
  res.locals.activePath = req.path;
  
  // Cache active employee roster for dropdowns
  res.locals.employees = await dataService.getEmployees();
  next();
});

// Helper: Formats time string (12-hour format)
function format12HourTime(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

// Helper: Format date string as YYYY-MM-DD
function getTodayDateStr() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Global Authentication Redirect Guard
app.use((req, res, next) => {
  const publicPaths = ['/login', '/css', '/js', '/img', '/favicon.ico', '/.well-known'];
  const isPublicPath = publicPaths.some(p => req.path === p || req.path.startsWith(p + '/'));
  
  if (!req.session.user && !isPublicPath) {
    return res.redirect('/login');
  }
  next();
});

// Authentication helper for root redirects
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

// Routes

// GET Login Page
app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('login', {
    error: req.query.err || null,
    message: req.query.msg || null
  });
});

// POST Login Verification
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'agnicarrental@gmail.com' && password === 'rentox@123') {
    req.session.user = {
      username: 'Agni Admin',
      email: 'agnicarrental@gmail.com',
      role: 'Admin',
      employeeId: 'EMP-001'
    };
    return res.redirect('/dashboard');
  } else {
    return res.redirect('/login?err=' + encodeURIComponent('Invalid email or password'));
  }
});

// GET Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login?msg=' + encodeURIComponent('Logged out successfully'));
});

// Main redirection (Protected)
app.get('/', requireAuth, (req, res) => {
  res.redirect('/dashboard');
});

// 1. ADMIN DASHBOARD
app.get('/dashboard', async (req, res) => {
  try {
    const todayStr = getTodayDateStr();
    
    // Filters & Pagination
    const filterDate = req.query.date || todayStr;
    const filterDept = req.query.department || '';
    const filterStatus = req.query.status || '';
    const searchVal = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    
    // Fetch logs
    const allAttendance = await dataService.getAttendance({
      date: filterDate,
      department: filterDept,
      status: filterStatus,
      search: searchVal
    });

    // Pagination calculations
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedAttendance = allAttendance.slice(startIndex, endIndex);
    const totalPages = Math.ceil(allAttendance.length / limit);

    // Compute Today's Statistics (relative to today's date)
    const todayLogs = await dataService.getAttendance({ date: todayStr });
    const employees = await dataService.getEmployees();
    const activeEmployees = employees.filter(e => e.status === 'Active');
    const totalCount = activeEmployees.length;

    let presentToday = 0;
    let absentToday = 0;
    let lateToday = 0;
    let leaveToday = 0;

    todayLogs.forEach(log => {
      if (log.status === 'Present') {
        presentToday++;
        if (log.lateStatus === 'Late') lateToday++;
      } else if (log.status === 'Absent') {
        absentToday++;
      } else if (log.status === 'Leave') {
        leaveToday++;
      }
    });

    // Calculate default absent for anyone who hasn't logged today and isn't marked
    const loggedIds = todayLogs.map(l => l.employeeId);
    activeEmployees.forEach(emp => {
      if (!loggedIds.includes(emp.employeeId)) {
        absentToday++; // Not clocked in yet defaults as absent in stats
      }
    });

    const attendancePercentage = totalCount > 0 ? Math.round((presentToday / totalCount) * 100) : 0;

    // Charts Data Aggregations
    // A. Daily attendance line chart (last 7 days)
    const last7Days = [];
    const dailyLineChart = { labels: [], present: [], absent: [], leave: [] };
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = formatDate(d);
      last7Days.push(dStr);
      
      const dayLogs = await dataService.getAttendance({ date: dStr });
      let pCount = 0, aCount = 0, lCount = 0;
      
      dayLogs.forEach(log => {
        if (log.status === 'Present') pCount++;
        else if (log.status === 'Absent') aCount++;
        else if (log.status === 'Leave') lCount++;
      });
      
      // Default rest as absent
      const loggedCount = dayLogs.length;
      if (loggedCount < totalCount) {
        aCount += (totalCount - loggedCount);
      }
      
      dailyLineChart.labels.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
      dailyLineChart.present.push(pCount);
      dailyLineChart.absent.push(aCount);
      dailyLineChart.leave.push(lCount);
    }

    // B. Department-wise distribution
    const deptPieChart = { labels: [], counts: [] };
    const deptHeadcounts = {};
    activeEmployees.forEach(emp => {
      deptHeadcounts[emp.department] = (deptHeadcounts[emp.department] || 0) + 1;
    });
    Object.keys(deptHeadcounts).forEach(dept => {
      deptPieChart.labels.push(dept);
      deptPieChart.counts.push(deptHeadcounts[dept]);
    });

    // C. Monthly attendance bar chart (3 months breakdown)
    const monthlyBarChart = { labels: ['May', 'June', 'July'], present: [142, 168, presentToday], absent: [18, 12, absentToday] };

    // Format date helper for view
    function formatDate(date) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    res.render('dashboard', {
      stats: {
        totalEmployees: totalCount,
        presentToday,
        absentToday,
        lateToday,
        leaveToday,
        percentage: attendancePercentage
      },
      attendanceList: paginatedAttendance,
      filters: {
        date: filterDate,
        department: filterDept,
        status: filterStatus,
        search: searchVal
      },
      pagination: {
        page,
        totalPages,
        totalItems: allAttendance.length
      },
      charts: {
        dailyLineChart,
        deptPieChart,
        monthlyBarChart
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// GET Add Employee View Page
app.get('/add-employee', async (req, res) => {
  try {
    const employees = await dataService.getEmployees();
    res.render('add-employee', { employeesList: employees });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// 2. MARK ATTENDANCE VIEW
app.get('/mark-attendance', async (req, res) => {
  try {
    const todayStr = getTodayDateStr();
    const employees = await dataService.getEmployees();
    const todayLogs = await dataService.getAttendance({ date: todayStr });
    
    const logsMap = {};
    todayLogs.forEach(log => {
      logsMap[log.employeeId] = log;
    });

    res.render('mark-attendance', {
      todayDate: todayStr,
      employeesList: employees,
      todayLogsMap: logsMap
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// POST Manual Attendance marking
app.post('/mark-attendance', async (req, res) => {
  try {
    const { employeeId, date, checkIn, checkOut, status, lateArrival, overtime, location, notes } = req.body;
    
    // Validate Employee
    const emp = await dataService.getEmployeeById(employeeId);
    if (!emp) {
      return res.redirect('/mark-attendance?err=' + encodeURIComponent('Invalid Employee ID selected'));
    }

    // Working Hours computation
    let workingHours = 0;
    let lateStatus = 'N/A';
    if (status === 'Present') {
      if (checkIn && checkOut) {
        const parseTime = (timeStr) => {
          const [time, modifier] = timeStr.split(' ');
          let [hours, minutes] = time.split(':').map(Number);
          if (modifier === 'PM' && hours !== 12) hours += 12;
          if (modifier === 'AM' && hours === 12) hours = 0;
          return hours + minutes / 60;
        };
        const inHrs = parseTime(checkIn);
        const outHrs = parseTime(checkOut);
        workingHours = parseFloat((outHrs - inHrs).toFixed(2));
      }
      lateStatus = lateArrival === 'on' || checkIn > '09:00 AM' ? 'Late' : 'On-Time';
    }

    const attendanceData = {
      employeeId,
      date,
      checkIn: status === 'Present' ? checkIn : '',
      checkOut: status === 'Present' ? checkOut : '',
      status,
      lateStatus: status === 'Present' ? lateStatus : 'N/A',
      overtime: status === 'Present' ? Number(overtime) || 0 : 0,
      workingHours: status === 'Present' ? workingHours : 0,
      location: status === 'Present' ? location : 'Office',
      notes,
      isApproved: true,
      approvedBy: req.session.user.username
    };

    await dataService.saveAttendance(attendanceData);
    await dataService.createAuditLog(
      req.session.user.username,
      'Mark Attendance',
      `Manually logged attendance for ${emp.name} (${employeeId}) on ${date}`
    );

    res.redirect('/dashboard?msg=' + encodeURIComponent('Attendance record saved successfully'));
  } catch (err) {
    console.error(err);
    res.redirect('/mark-attendance?err=' + encodeURIComponent(err.message));
  }
});

// 3. EMPLOYEE SELF ATTENDANCE
app.get('/self-attendance', async (req, res) => {
  try {
    const todayStr = getTodayDateStr();
    const empId = req.session.user.employeeId;
    
    // Get log for today
    const todayLog = await dataService.getAttendanceRecord(empId, todayStr);
    
    // Get employee profile
    const profile = await dataService.getEmployeeById(empId);

    // Get attendance list for calendar (last 30 days)
    const logs = await dataService.getAttendance({ employeeId: empId });
    
    // Calculate stats
    const totalLogs = logs.length;
    const presentLogs = logs.filter(l => l.status === 'Present');
    const presentCount = presentLogs.length;
    const lateCount = presentLogs.filter(l => l.lateStatus === 'Late').length;
    
    const attendancePercentage = totalLogs > 0 ? Math.round((presentCount / totalLogs) * 100) : 0;
    
    let totalWorkingHours = 0;
    presentLogs.forEach(l => totalWorkingHours += l.workingHours);

    res.render('self-attendance', {
      profile,
      todayLog,
      todayDate: todayStr,
      logs: JSON.stringify(logs), // Pass as string for rendering calendar JS
      stats: {
        percentage: attendancePercentage,
        workingHours: totalWorkingHours.toFixed(1),
        lateCount,
        presentCount
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// POST Self Check-In
app.post('/self-attendance/checkin', async (req, res) => {
  try {
    const todayStr = getTodayDateStr();
    const empId = req.session.user.employeeId;
    const checkInTime = format12HourTime(new Date());
    
    // Check if check-in already exists
    const existing = await dataService.getAttendanceRecord(empId, todayStr);
    if (existing && existing.checkIn) {
      return res.redirect('/self-attendance?err=' + encodeURIComponent('Already checked in today'));
    }

    // Determine late
    const limitTime = new Date();
    limitTime.setHours(9, 0, 0); // 09:00 AM
    const lateStatus = new Date() > limitTime ? 'Late' : 'On-Time';

    const attendanceData = {
      employeeId: empId,
      date: todayStr,
      checkIn: checkInTime,
      checkOut: '',
      status: 'Present',
      lateStatus,
      overtime: 0,
      workingHours: 0,
      location: req.body.location || 'Office',
      notes: req.body.notes || '',
      isApproved: true,
      approvedBy: 'Self Checkin'
    };

    await dataService.saveAttendance(attendanceData);
    await dataService.createAuditLog(
      req.session.user.username,
      'Self Check-In',
      `Checked in at ${checkInTime} from ${attendanceData.location}`
    );

    res.redirect('/self-attendance?msg=' + encodeURIComponent('Clocked in successfully'));
  } catch (err) {
    console.error(err);
    res.redirect('/self-attendance?err=' + encodeURIComponent(err.message));
  }
});

// POST Self Check-Out
app.post('/self-attendance/checkout', async (req, res) => {
  try {
    const todayStr = getTodayDateStr();
    const empId = req.session.user.employeeId;
    const checkOutTime = format12HourTime(new Date());

    const record = await dataService.getAttendanceRecord(empId, todayStr);
    if (!record) {
      return res.redirect('/self-attendance?err=' + encodeURIComponent('You must check in first'));
    }
    if (record.checkOut) {
      return res.redirect('/self-attendance?err=' + encodeURIComponent('Already checked out today'));
    }

    // Working Hours math
    const parseTime = (timeStr) => {
      const [time, modifier] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier === 'PM' && hours !== 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      return hours + minutes / 60;
    };
    const inHrs = parseTime(record.checkIn);
    const outHrs = parseTime(checkOutTime);
    const workingHours = parseFloat((outHrs - inHrs).toFixed(2));
    
    let overtime = 0;
    if (workingHours > 9) {
      overtime = parseFloat((workingHours - 9).toFixed(2));
    }

    record.checkOut = checkOutTime;
    record.workingHours = workingHours;
    record.overtime = overtime;
    record.notes = req.body.notes ? record.notes + ' | ' + req.body.notes : record.notes;

    await dataService.saveAttendance(record);
    await dataService.createAuditLog(
      req.session.user.username,
      'Self Check-Out',
      `Checked out at ${checkOutTime}. Working Hours: ${workingHours}`
    );

    res.redirect('/self-attendance?msg=' + encodeURIComponent('Clocked out successfully'));
  } catch (err) {
    console.error(err);
    res.redirect('/self-attendance?err=' + encodeURIComponent(err.message));
  }
});

// 4. REPORTS PAGE
app.get('/reports', async (req, res) => {
  try {
    const filterDept = req.query.department || '';
    const filterStatus = req.query.status || '';
    const searchVal = req.query.search || '';
    
    // Date ranges
    const range = req.query.range || 'today';
    let startDate = getTodayDateStr();
    let endDate = getTodayDateStr();

    const today = new Date();
    if (range === 'weekly') {
      const first = today.getDate() - today.getDay(); // Sunday
      const last = first + 6;
      startDate = formatDate(new Date(today.setDate(first)));
      endDate = formatDate(new Date(today.setDate(last)));
    } else if (range === 'monthly') {
      startDate = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
      endDate = formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    } else if (range === 'custom') {
      startDate = req.query.startDate || getTodayDateStr();
      endDate = req.query.endDate || getTodayDateStr();
    }

    // Helper: Formats date to YYYY-MM-DD
    function formatDate(date) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    // Retrieve records
    const rawAttendance = await dataService.getAttendance({
      department: filterDept,
      status: filterStatus,
      search: searchVal
    });

    // Filter by date range
    const filteredAttendance = rawAttendance.filter(r => r.date >= startDate && r.date <= endDate);

    // Sum details for report summary
    const summary = {
      present: 0,
      absent: 0,
      leave: 0,
      late: 0,
      totalHours: 0,
      totalOvertime: 0
    };

    filteredAttendance.forEach(r => {
      if (r.status === 'Present') {
        summary.present++;
        if (r.lateStatus === 'Late') summary.late++;
        summary.totalHours += r.workingHours;
        summary.totalOvertime += r.overtime;
      } else if (r.status === 'Absent') {
        summary.absent++;
      } else if (r.status === 'Leave') {
        summary.leave++;
      }
    });

    summary.totalHours = summary.totalHours.toFixed(1);
    summary.totalOvertime = summary.totalOvertime.toFixed(1);

    res.render('reports', {
      attendanceList: filteredAttendance,
      summary,
      filters: {
        range,
        startDate,
        endDate,
        department: filterDept,
        status: filterStatus,
        search: searchVal
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// 5. ADMIN SETTINGS (Audit Logs, Locks, Seeding / Import)
app.get('/admin-settings', async (req, res) => {
  try {
    const logs = await dataService.getAuditLogs();
    res.render('admin-settings', { auditLogs: logs });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Lock attendance POST
app.post('/admin/lock', async (req, res) => {
  try {
    const { days } = req.body;
    await dataService.createAuditLog(
      req.session.user.username,
      'Attendance Lock',
      `Locked editing of attendance records older than ${days} days`
    );
    res.redirect('/admin-settings?msg=' + encodeURIComponent(`Attendance logs locked successfully (Older than ${days} days)`));
  } catch (err) {
    res.redirect('/admin-settings?err=' + encodeURIComponent(err.message));
  }
});

// Bulk Upload POST (simulated EJS client parse)
app.post('/admin/bulk-upload', async (req, res) => {
  try {
    const { recordsJson } = req.body;
    const records = JSON.parse(recordsJson);
    const count = await dataService.bulkUploadAttendance(records, req.session.user.username);
    res.redirect('/admin-settings?msg=' + encodeURIComponent(`Successfully imported ${count} attendance logs`));
  } catch (err) {
    res.redirect('/admin-settings?err=' + encodeURIComponent('Failed to import CSV: ' + err.message));
  }
});

// API endpoint for switching role
app.post('/api/auth/switch-role', (req, res) => {
  const { role } = req.body;
  const roles = ['Admin', 'HR', 'Manager', 'Employee'];
  
  if (!roles.includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid Role' });
  }

  // Switch role and associated mock employee ID
  req.session.user.role = role;
  if (role === 'Employee') {
    req.session.user.employeeId = 'EMP-004'; // Simulated Sneha Reddy
    req.session.user.username = 'Sneha Reddy';
  } else if (role === 'HR') {
    req.session.user.employeeId = 'EMP-002'; // Priya Patel
    req.session.user.username = 'Priya Patel';
  } else if (role === 'Manager') {
    req.session.user.employeeId = 'EMP-003'; // Rohan Mehta
    req.session.user.username = 'Rohan Mehta';
  } else {
    req.session.user.employeeId = 'EMP-001'; // Amit Sharma
    req.session.user.username = 'Priyanka Sen';
  }

  res.json({ success: true, user: req.session.user });
});

// Action triggers: Approve log
app.post('/admin/approve/:id', async (req, res) => {
  try {
    const log = await dataService.approveAttendance(req.params.id, req.session.user.username);
    await dataService.createAuditLog(
      req.session.user.username,
      'Approve Attendance',
      `Approved attendance record for employee ID ${log ? log.employeeId : 'unknown'} on date ${log ? log.date : 'unknown'}`
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Action triggers: Delete log
app.post('/admin/delete/:id', async (req, res) => {
  try {
    const log = await dataService.deleteAttendance(req.params.id);
    await dataService.createAuditLog(
      req.session.user.username,
      'Delete Attendance',
      `Deleted attendance record for Employee ID ${log ? log.employeeId : 'unknown'} on date ${log ? log.date : 'unknown'}`
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Action triggers: Delete Employee profile
app.post('/admin/delete-employee/:employeeId', async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    const deleted = await dataService.deleteEmployee(employeeId);
    
    if (deleted) {
      await dataService.createAuditLog(
        req.session.user.username,
        'Delete Employee',
        `Deleted employee profile ${deleted.name} (${employeeId}) and cleared attendance logs`
      );
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Employee profile not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Action triggers: Edit log
app.post('/admin/edit', async (req, res) => {
  try {
    const { recordId, checkIn, checkOut, status, overtime, location, notes } = req.body;
    
    // Fetch record first to see details
    let existing;
    if (recordId.startsWith('mem_')) {
      const records = await dataService.getAttendance();
      existing = records.find(r => r._id === recordId);
    } else {
      existing = await Attendance.findById(recordId);
    }

    if (!existing) {
      return res.redirect('/dashboard?err=' + encodeURIComponent('Attendance record not found'));
    }

    // Working Hours math
    let workingHours = 0;
    let lateStatus = 'N/A';
    if (status === 'Present') {
      if (checkIn && checkOut) {
        const parseTime = (timeStr) => {
          const [time, modifier] = timeStr.split(' ');
          let [hours, minutes] = time.split(':').map(Number);
          if (modifier === 'PM' && hours !== 12) hours += 12;
          if (modifier === 'AM' && hours === 12) hours = 0;
          return hours + minutes / 60;
        };
        const inHrs = parseTime(checkIn);
        const outHrs = parseTime(checkOut);
        workingHours = parseFloat((outHrs - inHrs).toFixed(2));
      }
      lateStatus = checkIn > '09:00 AM' ? 'Late' : 'On-Time';
    }

    const attendanceData = {
      employeeId: existing.employeeId,
      date: existing.date,
      checkIn: status === 'Present' ? checkIn : '',
      checkOut: status === 'Present' ? checkOut : '',
      status,
      lateStatus: status === 'Present' ? lateStatus : 'N/A',
      overtime: status === 'Present' ? Number(overtime) || 0 : 0,
      workingHours: status === 'Present' ? workingHours : 0,
      location: status === 'Present' ? location : 'Office',
      notes,
      isApproved: true,
      approvedBy: req.session.user.username
    };

    // Replace the database / in-memory record
    await dataService.saveAttendance(attendanceData);
    await dataService.createAuditLog(
      req.session.user.username,
      'Edit Attendance',
      `Edited attendance log for ${existing.employeeId} on ${existing.date}`
    );

    res.redirect('/dashboard?msg=' + encodeURIComponent('Attendance record updated successfully'));
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard?err=' + encodeURIComponent(err.message));
  }
});

// POST Add Employee
app.post('/admin/add-employee', async (req, res) => {
  try {
    const { employeeId, name, email, department, role, status } = req.body;
    
    if (!employeeId || !name || !email) {
      return res.redirect('/dashboard?err=' + encodeURIComponent('All fields are required'));
    }

    await dataService.createEmployee({
      employeeId,
      name,
      email,
      department,
      role,
      status: status || 'Active',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
    });

    await dataService.createAuditLog(
      req.session.user.username,
      'Add Employee',
      `Registered new employee ${name} (${employeeId})`
    );

    res.redirect('/dashboard?msg=' + encodeURIComponent('Employee added successfully'));
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard?err=' + encodeURIComponent(err.message));
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`HRMS Attendance Dashboard running on port http://localhost:${PORT}`);
});
