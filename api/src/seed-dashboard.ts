import * as mongoose from "mongoose";

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://pklroot:PklM0ng0Secr3t!@localhost:47293/pklclub?authSource=admin";

// Schemas
const CountrySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  flagCode: { type: String, required: true },
  isActive: { type: Boolean, default: true },
});

const RegionSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  country: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Country",
    required: true,
  },
  isActive: { type: Boolean, default: true },
});

const CitySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  region: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Region",
    required: true,
  },
  country: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Country",
    required: true,
  },
  status: { type: String, enum: ["activated", "open"], default: "open" },
  isActive: { type: Boolean, default: true },
});

const TournamentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: "City", required: true },
    operator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    location: { type: String, required: true },
    dates: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    schedule: [
      {
        day: { type: Number, required: true },
        date: { type: Date, required: true },
        events: [{ type: String }],
      },
    ],
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },
  },
  { timestamps: true },
);

async function seedDashboard() {
  console.log("🌱 Starting dashboard data seed...");
  console.log(`📡 Connecting to MongoDB...`);

  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const Country = mongoose.model("Country", CountrySchema);
    const Region = mongoose.model("Region", RegionSchema);
    const City = mongoose.model("City", CitySchema);
    const Tournament = mongoose.model("Tournament", TournamentSchema);

    // Clear existing location/tournament data
    await Tournament.deleteMany({});
    await City.deleteMany({});
    await Region.deleteMany({});
    await Country.deleteMany({});
    console.log("🗑️  Cleared existing location data");

    // Create Countries
    const countriesData = [
      { code: "US", name: "United States", flagCode: "us", isActive: true },
      { code: "CA", name: "Canada", flagCode: "ca", isActive: true },
      { code: "MX", name: "Mexico", flagCode: "mx", isActive: true },
      { code: "ES", name: "Spain", flagCode: "es", isActive: true },
    ];
    const countries = await Country.insertMany(countriesData);
    console.log(`✅ Created ${countries.length} countries`);

    const countryMap = Object.fromEntries(countries.map((c) => [c.code, c]));

    // Create Regions
    const regionsData = [
      { code: "US-CA", name: "California", country: countryMap["US"]._id },
      { code: "US-TX", name: "Texas", country: countryMap["US"]._id },
      { code: "US-FL", name: "Florida", country: countryMap["US"]._id },
      { code: "US-AZ", name: "Arizona", country: countryMap["US"]._id },
      { code: "US-NV", name: "Nevada", country: countryMap["US"]._id },
      { code: "CA-ON", name: "Ontario", country: countryMap["CA"]._id },
      {
        code: "CA-BC",
        name: "British Columbia",
        country: countryMap["CA"]._id,
      },
      { code: "MX-JAL", name: "Jalisco", country: countryMap["MX"]._id },
      {
        code: "MX-BCN",
        name: "Baja California",
        country: countryMap["MX"]._id,
      },
      { code: "MX-NLE", name: "Nuevo León", country: countryMap["MX"]._id },
      { code: "ES-MD", name: "Madrid", country: countryMap["ES"]._id },
      { code: "ES-CT", name: "Catalonia", country: countryMap["ES"]._id },
    ];
    const regions = await Region.insertMany(
      regionsData.map((r) => ({ ...r, isActive: true })),
    );
    console.log(`✅ Created ${regions.length} regions`);

    const regionMap = Object.fromEntries(regions.map((r) => [r.code, r]));

    // Create Cities
    const citiesData = [
      {
        code: "LAX",
        name: "Los Angeles",
        region: regionMap["US-CA"]._id,
        country: countryMap["US"]._id,
        status: "activated",
      },
      {
        code: "SFO",
        name: "San Francisco",
        region: regionMap["US-CA"]._id,
        country: countryMap["US"]._id,
        status: "activated",
      },
      {
        code: "SDG",
        name: "San Diego",
        region: regionMap["US-CA"]._id,
        country: countryMap["US"]._id,
        status: "open",
      },
      {
        code: "DAL",
        name: "Dallas",
        region: regionMap["US-TX"]._id,
        country: countryMap["US"]._id,
        status: "activated",
      },
      {
        code: "HOU",
        name: "Houston",
        region: regionMap["US-TX"]._id,
        country: countryMap["US"]._id,
        status: "open",
      },
      {
        code: "AUS",
        name: "Austin",
        region: regionMap["US-TX"]._id,
        country: countryMap["US"]._id,
        status: "open",
      },
      {
        code: "MIA",
        name: "Miami",
        region: regionMap["US-FL"]._id,
        country: countryMap["US"]._id,
        status: "activated",
      },
      {
        code: "ORL",
        name: "Orlando",
        region: regionMap["US-FL"]._id,
        country: countryMap["US"]._id,
        status: "open",
      },
      {
        code: "PHX",
        name: "Phoenix",
        region: regionMap["US-AZ"]._id,
        country: countryMap["US"]._id,
        status: "activated",
      },
      {
        code: "TUS",
        name: "Tucson",
        region: regionMap["US-AZ"]._id,
        country: countryMap["US"]._id,
        status: "open",
      },
      {
        code: "LAS",
        name: "Las Vegas",
        region: regionMap["US-NV"]._id,
        country: countryMap["US"]._id,
        status: "activated",
      },
      {
        code: "TOR",
        name: "Toronto",
        region: regionMap["CA-ON"]._id,
        country: countryMap["CA"]._id,
        status: "activated",
      },
      {
        code: "VAN",
        name: "Vancouver",
        region: regionMap["CA-BC"]._id,
        country: countryMap["CA"]._id,
        status: "open",
      },
      {
        code: "GDL",
        name: "Guadalajara",
        region: regionMap["MX-JAL"]._id,
        country: countryMap["MX"]._id,
        status: "activated",
      },
      {
        code: "TIJ",
        name: "Tijuana",
        region: regionMap["MX-BCN"]._id,
        country: countryMap["MX"]._id,
        status: "open",
      },
      {
        code: "MTY",
        name: "Monterrey",
        region: regionMap["MX-NLE"]._id,
        country: countryMap["MX"]._id,
        status: "open",
      },
      {
        code: "MAD",
        name: "Madrid",
        region: regionMap["ES-MD"]._id,
        country: countryMap["ES"]._id,
        status: "activated",
      },
      {
        code: "BCN",
        name: "Barcelona",
        region: regionMap["ES-CT"]._id,
        country: countryMap["ES"]._id,
        status: "open",
      },
    ];
    const cities = await City.insertMany(
      citiesData.map((c) => ({ ...c, isActive: true })),
    );
    console.log(`✅ Created ${cities.length} cities`);

    const cityMap = Object.fromEntries(cities.map((c) => [c.code, c]));

    // Create Tournaments
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    const tournamentsData = [
      {
        name: "LA Open Championship",
        city: cityMap["LAX"]._id,
        location: "LA Tennis Center",
        dates: {
          start: new Date(now.getTime() + 30 * day),
          end: new Date(now.getTime() + 32 * day),
        },
        schedule: [
          {
            day: 1,
            date: new Date(now.getTime() + 30 * day),
            events: ["Men's Singles R1", "Women's Singles R1"],
          },
          {
            day: 2,
            date: new Date(now.getTime() + 31 * day),
            events: ["Mixed Doubles", "Quarterfinals"],
          },
          {
            day: 3,
            date: new Date(now.getTime() + 32 * day),
            events: ["Semifinals", "Finals"],
          },
        ],
      },
      {
        name: "SF Bay Classic",
        city: cityMap["SFO"]._id,
        location: "Golden Gate Pickleball Club",
        dates: {
          start: new Date(now.getTime() + 45 * day),
          end: new Date(now.getTime() + 47 * day),
        },
        schedule: [
          {
            day: 1,
            date: new Date(now.getTime() + 45 * day),
            events: ["Opening Ceremony", "Round 1"],
          },
          {
            day: 2,
            date: new Date(now.getTime() + 46 * day),
            events: ["Quarterfinals", "Semifinals"],
          },
          {
            day: 3,
            date: new Date(now.getTime() + 47 * day),
            events: ["Finals", "Awards"],
          },
        ],
      },
      {
        name: "Dallas Showdown",
        city: cityMap["DAL"]._id,
        location: "Dallas Sports Complex",
        dates: {
          start: new Date(now.getTime() + 60 * day),
          end: new Date(now.getTime() + 62 * day),
        },
        schedule: [
          {
            day: 1,
            date: new Date(now.getTime() + 60 * day),
            events: ["Pool Play"],
          },
          {
            day: 2,
            date: new Date(now.getTime() + 61 * day),
            events: ["Bracket Play"],
          },
          {
            day: 3,
            date: new Date(now.getTime() + 62 * day),
            events: ["Championship Sunday"],
          },
        ],
      },
      {
        name: "Miami Masters",
        city: cityMap["MIA"]._id,
        location: "Miami Beach Courts",
        dates: {
          start: new Date(now.getTime() + 20 * day),
          end: new Date(now.getTime() + 22 * day),
        },
        schedule: [
          {
            day: 1,
            date: new Date(now.getTime() + 20 * day),
            events: ["Warm-up", "Round 1"],
          },
          {
            day: 2,
            date: new Date(now.getTime() + 21 * day),
            events: ["Round 2", "Quarterfinals"],
          },
          {
            day: 3,
            date: new Date(now.getTime() + 22 * day),
            events: ["Semifinals", "Grand Finals"],
          },
        ],
      },
      {
        name: "Phoenix Desert Classic",
        city: cityMap["PHX"]._id,
        location: "Arizona Pickleball Center",
        dates: {
          start: new Date(now.getTime() + 75 * day),
          end: new Date(now.getTime() + 77 * day),
        },
        schedule: [
          {
            day: 1,
            date: new Date(now.getTime() + 75 * day),
            events: ["Age Division"],
          },
          {
            day: 2,
            date: new Date(now.getTime() + 76 * day),
            events: ["Open Division"],
          },
          {
            day: 3,
            date: new Date(now.getTime() + 77 * day),
            events: ["Pro Finals"],
          },
        ],
      },
      {
        name: "Vegas Invitational",
        city: cityMap["LAS"]._id,
        location: "Las Vegas Convention Center",
        dates: {
          start: new Date(now.getTime() + 90 * day),
          end: new Date(now.getTime() + 93 * day),
        },
        schedule: [
          {
            day: 1,
            date: new Date(now.getTime() + 90 * day),
            events: ["Amateur Division"],
          },
          {
            day: 2,
            date: new Date(now.getTime() + 91 * day),
            events: ["Senior Division"],
          },
          {
            day: 3,
            date: new Date(now.getTime() + 92 * day),
            events: ["Pro Qualifying"],
          },
          {
            day: 4,
            date: new Date(now.getTime() + 93 * day),
            events: ["Pro Finals"],
          },
        ],
      },
      {
        name: "Toronto International",
        city: cityMap["TOR"]._id,
        location: "Toronto Sports Dome",
        dates: {
          start: new Date(now.getTime() + 50 * day),
          end: new Date(now.getTime() + 52 * day),
        },
        schedule: [
          {
            day: 1,
            date: new Date(now.getTime() + 50 * day),
            events: ["International Qualifiers"],
          },
          {
            day: 2,
            date: new Date(now.getTime() + 51 * day),
            events: ["Main Draw"],
          },
          {
            day: 3,
            date: new Date(now.getTime() + 52 * day),
            events: ["Championship Finals"],
          },
        ],
      },
      {
        name: "Guadalajara Open",
        city: cityMap["GDL"]._id,
        location: "Centro Deportivo Guadalajara",
        dates: {
          start: new Date(now.getTime() + 40 * day),
          end: new Date(now.getTime() + 42 * day),
        },
        schedule: [
          {
            day: 1,
            date: new Date(now.getTime() + 40 * day),
            events: ["Ronda Preliminar"],
          },
          {
            day: 2,
            date: new Date(now.getTime() + 41 * day),
            events: ["Cuartos y Semifinales"],
          },
          {
            day: 3,
            date: new Date(now.getTime() + 42 * day),
            events: ["Gran Final"],
          },
        ],
      },
      {
        name: "Madrid Championship",
        city: cityMap["MAD"]._id,
        location: "Club Deportivo Madrid",
        dates: {
          start: new Date(now.getTime() + 55 * day),
          end: new Date(now.getTime() + 57 * day),
        },
        schedule: [
          {
            day: 1,
            date: new Date(now.getTime() + 55 * day),
            events: ["European Qualifiers"],
          },
          {
            day: 2,
            date: new Date(now.getTime() + 56 * day),
            events: ["Main Tournament"],
          },
          {
            day: 3,
            date: new Date(now.getTime() + 57 * day),
            events: ["Finals & Closing"],
          },
        ],
      },
    ];

    const tournaments = await Tournament.insertMany(
      tournamentsData.map((t) => ({ ...t, status: "upcoming" })),
    );
    console.log(`✅ Created ${tournaments.length} tournaments`);

    const activatedCount = citiesData.filter(
      (c) => c.status === "activated",
    ).length;
    const openCount = citiesData.filter((c) => c.status === "open").length;

    console.log("\n🎉 Dashboard seed completed successfully!");
    console.log("");
    console.log("📊 Summary:");
    console.log(`   Countries: ${countries.length}`);
    console.log(`   Regions: ${regions.length}`);
    console.log(
      `   Cities: ${cities.length} (${activatedCount} activated, ${openCount} open)`,
    );
    console.log(`   Tournaments: ${tournaments.length}`);
    console.log("");
  } catch (error) {
    console.error("❌ Seed failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("📡 Disconnected from MongoDB");
  }
}

seedDashboard();
