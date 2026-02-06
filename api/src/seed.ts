import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://pklroot:PklM0ng0Secr3t!@localhost:47293/pklclub?authSource=admin';

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    userType: { type: String, enum: ['admin', 'player', 'operator', 'sponsor'], default: 'player' },
    email: { type: String, required: true },
    firstName: { type: String },
    lastName: { type: String },
    phone: { type: String },
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
            { username: 'eman', password: 'Admin321', userType: 'admin', email: 'eman@pkl.club', firstName: 'Eman', lastName: 'Admin' },
            { username: 'gabe', password: 'Admin321', userType: 'admin', email: 'gabe@pkl.club', firstName: 'Gabe', lastName: 'Admin' },
            { username: 'tony', password: 'Admin123!', userType: 'admin', email: 'tony@pkl.club', firstName: 'Tony', lastName: 'Admin' },
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
                    userType: admin.userType,
                    email: admin.email,
                    firstName: admin.firstName,
                    lastName: admin.lastName,
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
        console.log('   Username: tony | Password: Admin123!');
        console.log('');

    } catch (error) {
        console.error('❌ Seed failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('📡 Disconnected from MongoDB');
    }
}

seed();
