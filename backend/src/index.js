const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');

// Import routes
const authRoutes = require('./routes/auth');
const certificateRoutes = require('./routes/certificates');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const verifierRoutes = require('./routes/verifier');
const blockchainRoutes = require('./routes/blockchain');
const batchRoutes = require('./routes/batch');
const twoFactorRoutes = require('./routes/2fa');
const utilsRoutes = require('./routes/utils');
const submissionRoutes = require('./routes/submissions');
const fabricToIcpBridgeService = require('./services/fabricToIcpBridgeService');

const app = express();

// Middleware
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.includes('*') ||
                          allowedOrigins.indexOf(origin) !== -1 ||
                          origin.startsWith('http://localhost') ||
                          origin.startsWith('http://127.0.0.1') ||
                          origin.includes('trycloudflare.com') ||
                          process.env.NODE_ENV !== 'production';
        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition', 'Content-Type'],
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/verifier', verifierRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/batch', batchRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/utils', utilsRoutes);
app.use('/api/submissions', submissionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/certificate-verification', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Connected to MongoDB');
})
.catch(err => console.error('MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    fabricToIcpBridgeService.start().catch((error) => {
        console.error('Fabric to ICP bridge failed to start:', error.message);
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    // Close server & exit process
    process.exit(1);
});

process.on('SIGINT', async () => {
    await fabricToIcpBridgeService.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await fabricToIcpBridgeService.stop();
    process.exit(0);
});
