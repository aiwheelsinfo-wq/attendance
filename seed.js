const mongoose = require('mongoose');
const Employee = require('./models/Employee');
const Attendance = require('./models/Attendance');
const AuditLog = require('./models/AuditLog');
const { connectDB } = require('./config/db');

const employeesData = [
  { employeeId: "EMP-001", name: "Amit Sharma", email: "amit.sharma@company.com", department: "IT & Software", role: "Admin", status: "Active", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amit" },
  { employeeId: "EMP-002", name: "Priya Patel", email: "priya.patel@company.com", department: "Human Resources", role: "HR", status: "Active", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya" },
  { employeeId: "EMP-003", name: "Rohan Mehta", email: "rohan.mehta@company.com", department: "IT & Software", role: "Manager", status: "Active", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan" },
  { employeeId: "EMP-004", name: "Sneha Reddy", email: "sneha.reddy@company.com", department: "Marketing", role: "Employee", status: "Active", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha" },
  { employeeId: "EMP-005", name: "Vikram Singh", email: "vikram.singh@company.com", department: "Finance", role: "Manager", status: "Active", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram" },
  { employeeId: "EMP-006", name: "Neha Gupta", email: "neha.gupta@company.com", department: "Operations", role: "Employee", status: "Active", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Neha" },
  { employeeId: "EMP-007", name: "Arjun Verma", email: "arjun.verma@company.com", department: "Sales", role: "Employee", status: "Active", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun" },
  { employeeId: "EMP-008", name: "Kiran Rao", email: "kiran.rao@company.com", department: "IT & Software", role: "Employee", status: "Active", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kiran" },
  { employeeId: "EMP-009", name: "Anjali Desai", email: "anjali.desai@company.com", department: "Marketing", role: "Employee", status: "Active", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anjali" },
  { employeeId: "EMP-010", name: "Suresh Nair", email: "suresh.nair@company.com", department: "Finance", role: "Employee", status: "Inactive", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Suresh" }
];

// Helper to format date as YYYY-MM-DD
function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Helper to generate time strings
function generateCheckIn(isLate) {
  if (isLate) {
    // 09:05 AM to 10:15 AM
    const min = Math.floor(Math.random() * 70) + 5; // 5 to 75 mins past 9
    const hr = min >= 60 ? 10 : 9;
    const mn = min >= 60 ? min - 60 : min;
    return `${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')} AM`;
  } else {
    // 08:15 AM to 08:59 AM
    const min = Math.floor(Math.random() * 45) + 15;
    return `08:${String(min).padStart(2, '0')} AM`;
  }
}

function generateCheckOut() {
  // 05:00 PM to 07:30 PM
  const hr = Math.floor(Math.random() * 3) + 5; // 5, 6, 7
  const min = Math.floor(Math.random() * 60);
  return `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')} PM`;
}

// Helper to calculate working hours from check-in and check-out strings
function calculateHours(checkInStr, checkOutStr) {
  if (!checkInStr || !checkOutStr) return 0;
  
  const parseTime = (timeStr) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours + minutes / 60;
  };

  const inHrs = parseTime(checkInStr);
  const outHrs = parseTime(checkOutStr);
  return parseFloat((outHrs - inHrs).toFixed(2));
}

async function seed() {
  await connectDB();
  
  console.log('Clearing existing database collections...');
  await Employee.deleteMany({});
  await Attendance.deleteMany({});
  await AuditLog.deleteMany({});

  console.log('Seeding employees...');
  const seededEmployees = await Employee.insertMany(employeesData);
  console.log(`Successfully seeded ${seededEmployees.length} employees.`);

  console.log('Seeding attendance history for the past 30 days...');
  const attendanceRecords = [];
  const today = new Date();
  
  // Active employees for attendance records
  const activeEmployees = seededEmployees.filter(emp => emp.status === 'Active');

  for (let i = 30; i >= 0; i--) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() - i);
    
    const dayOfWeek = currentDate.getDay();
    const dateStr = formatDate(currentDate);

    // Skip weekends mostly, occasionally seeding weekend logs (10% chance)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend && Math.random() > 0.15) {
      continue; 
    }

    activeEmployees.forEach(emp => {
      // Random attendance status distribution
      // 82% Present, 10% Absent, 8% Leave
      const rand = Math.random();
      let status = 'Present';
      if (rand > 0.82 && rand <= 0.92) {
        status = 'Absent';
      } else if (rand > 0.92) {
        status = 'Leave';
      }

      // If weekend and present, it's special overtime
      if (isWeekend && status === 'Present') {
        status = 'Present';
      }

      let checkIn = '';
      let checkOut = '';
      let lateStatus = 'N/A';
      let overtime = 0;
      let workingHours = 0;
      let location = 'Office';
      let notes = '';

      if (status === 'Present') {
        const isLate = Math.random() < 0.20; // 20% chance of being late
        checkIn = generateCheckIn(isLate);
        checkOut = generateCheckOut();
        lateStatus = isLate ? 'Late' : 'On-Time';
        workingHours = calculateHours(checkIn, checkOut);
        
        // Overtime is any work over 9 hours, or checkout after 6 PM
        if (workingHours > 9) {
          overtime = parseFloat((workingHours - 9).toFixed(2));
        }

        location = Math.random() < 0.85 ? 'Office' : (Math.random() < 0.5 ? 'Work From Home' : 'Client Location');
        if (isLate) {
          notes = Math.random() < 0.5 ? 'Traffic congestion' : 'Personal delay';
        }
      } else if (status === 'Leave') {
        notes = Math.random() < 0.5 ? 'Casual Leave' : 'Sick Leave';
      }

      attendanceRecords.push({
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
        approvedBy: 'Auto-System'
      });
    });
  }

  console.log(`Inserting ${attendanceRecords.length} attendance records...`);
  await Attendance.insertMany(attendanceRecords);
  console.log('Attendance logs seeded successfully.');

  console.log('Seeding initial audit logs...');
  await AuditLog.insertMany([
    { user: 'Admin (System)', action: 'Database Seeding', details: 'Initialized 10 employees and 30-day historical logs' },
    { user: 'HR Manager', action: 'Bulk Upload', details: 'Approved import of employee credentials and avatars' }
  ]);
  console.log('Audit logs seeded.');

  console.log('Seeding complete. Closing database connection.');
  await mongoose.connection.close();
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
