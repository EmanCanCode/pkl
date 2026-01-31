import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://pklroot:PklM0ng0Secr3t!@localhost:47293/pklclub?authSource=admin';

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    email: { type: String },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

async function seed() {
    console.log('🌱 Starting database seed...');
    console.log(`📡 Connecting to MongoDB...`);

    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const User = mongoose.model('User', UserSchema);

        const admins = [
            { username: 'eman', password: 'Admin321', role: 'admin', email: 'eman@pkl.club' },
            { username: 'gabe', password: 'Admin321', role: 'admin', email: 'gabe@pkl.club' },
        ];

        for (const admin of admins) {
            const existingUser = await User.findOne({ username: admin.username });

            if (existingUser) {
                console.log(`⏭️  Admin user '${admin.username}' already exists, skipping...`);
            } else {
                const hashedPassword = await bcrypt.hash(admin.password, 10);
                await User.create({
                    username: admin.username,
                    password: hashedPassword,
                    role: admin.role,
                    email: admin.email,
                    isActive: true,
                });
                console.log(`✅ Created admin user: ${admin.username}`);
            }
        }

        console.log('🎉 Seed completed successfully!');
        console.log('');
        console.log('👤 Admin Credentials:');
        console.log('   Username: eman | Password: Admin321');
        console.log('   Username: gabe | Password: Admin321');
        console.log('');

    } catch (error) {
        console.error('❌ Seed failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('📡 Disconnected from MongoDB');
    }
}

seed();
