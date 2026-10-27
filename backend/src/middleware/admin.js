const admin = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            throw new Error('Access denied');
        }
        next();
    } catch (error) {
        res.status(403).json({
            success: false,
            error: 'Access denied. Admin privileges required.'
        });
    }
};

module.exports = admin;
