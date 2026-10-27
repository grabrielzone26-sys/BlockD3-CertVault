const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../src/models/User');

async function main() {
    try {
        const target = process.argv[2];
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/certificate-verification';
        console.log(`Connecting to MongoDB at: ${mongoUri}...`);
        await mongoose.connect(mongoUri);

        if (!target) {
            console.log('\n--- ALL USERS WITH 2FA ENABLED ---');
            const usersWith2FA = await User.find({
                $or: [
                    { 'twoFactor.enabled': true },
                    { 'settings.twoFactorEnabled': true }
                ]
            }).select('username email role twoFactor settings');

            if (usersWith2FA.length === 0) {
                console.log('No users found with 2FA enabled.');
                const allUsers = await User.find().select('username email role');
                console.log('\nExisting users in database:');
                console.log(allUsers);
            } else {
                console.log(JSON.stringify(usersWith2FA, null, 2));
                console.log('\nTo reset 2FA for a user, run:');
                console.log('  node scripts/reset2FA.js <email_or_username>');
            }
            await mongoose.disconnect();
            return;
        }

        console.log(`Searching for user: ${target}...`);
        const user = await User.findOne({
            $or: [
                { email: target.toLowerCase().trim() },
                { username: target.trim() }
            ]
        });

        if (!user) {
            console.error(`User "${target}" not found!`);
            await mongoose.disconnect();
            process.exit(1);
        }

        console.log(`Found user: ${user.username} (${user.email}, role: ${user.role})`);
        console.log('Current 2FA Status:', {
            twoFactorEnabled: user.twoFactor?.enabled,
            twoFactorVerified: user.twoFactor?.verified,
            settings2FA: user.settings?.twoFactorEnabled
        });

        user.twoFactor = {
            secret: null,
            enabled: false,
            verified: false,
            backupCodes: []
        };
        if (!user.settings) user.settings = {};
        user.settings.twoFactorEnabled = false;

        await user.save();
        console.log(`\nSUCCESS: 2FA has been completely reset and disabled for ${user.email}!`);
        console.log('The user can now log in normally using just their email and password.');

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error during 2FA reset:', err.message);
        process.exit(1);
    }
}

main();
