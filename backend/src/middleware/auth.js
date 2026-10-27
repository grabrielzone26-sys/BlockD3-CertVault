const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            throw new Error('No token provided');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findOne({
            _id: decoded._id,
            'tokens.token': token,
            isActive: true
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Add user and token to request object
        req.token = token;
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Please authenticate'
        });
    }
};

module.exports = auth;
