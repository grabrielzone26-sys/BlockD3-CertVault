const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

const users = [
  {
    username: 'admin',
    email: 'admin@blockd3.com',
    password: 'admin123',
    role: 'admin',
    profile: {
      fullName: 'Admin User',
      department: 'Administration',
    },
  },
  {
    username: 'student',
    email: 'student@blockd3.com',
    password: 'student123',
    role: 'student',
    profile: {
      fullName: 'Student User',
      studentId: 'S123456',
      department: 'Computer Science',
    },
  },
  {
    username: 'verifier',
    email: 'verifier@blockd3.com',
    password: 'verifier123',
    role: 'verifier',
    profile: {
      fullName: 'Verifier User',
      department: 'Verification Office',
    },
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/certificate-verification', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await User.deleteMany({});
    console.log('Deleted existing users');

    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      console.log(`Created user: ${user.email}`);
    }

    console.log('User seeding completed');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding users:', err);
    process.exit(1);
  }
}

seed();
