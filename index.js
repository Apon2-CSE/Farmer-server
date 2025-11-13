// 🌾 KrishiLink Server
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// ✅ Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5177", // তোমার বর্তমান frontend port
      "https://krishi-db-apon212.netlify.app", // deployed frontend
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);
app.use(express.json());

// ✅ MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.ncssljo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // ✅ Connect Database
    await client.connect();

    const db = client.db("krishi-db");
    const cropsCollection = db.collection("crops");

    console.log("🌱 MongoDB Connected Successfully");

    // ✅ Default Route
    app.get("/", (req, res) => {
      res.send("🌾 KrishiLink API is running successfully!");
    });

    // ✅ Get All Crops
    app.get("/crops", async (req, res) => {
      try {
        const crops = await cropsCollection.find().toArray();
        res.status(200).json(crops);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch crops" });
      }
    });

    // ✅ Add Crop (POST)
    app.post("/crops", async (req, res) => {
      try {
        const crop = req.body;

        if (!crop.name || !crop.type || !crop.pricePerUnit) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        const result = await cropsCollection.insertOne(crop);
        res.status(201).json({
          success: true,
          message: "Crop added successfully!",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error adding crop:", error);
        res.status(500).json({ error: "Failed to add crop" });
      }
    });

    // ✅ Get Crop by ID
    app.get("/crops/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const crop = await cropsCollection.findOne({ _id: new ObjectId(id) });

        if (!crop) {
          return res.status(404).json({ error: "Crop not found" });
        }

        res.status(200).json(crop);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch crop" });
      }
    });

    // ✅ Delete Crop by ID
    app.delete("/crops/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await cropsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: "Crop not found" });
        }

        res
          .status(200)
          .json({ success: true, message: "Crop deleted successfully" });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete crop" });
      }
    });

    // ✅ Update Crop
    app.put("/crops/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedData = req.body;

        const result = await cropsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).json({ error: "No crop updated" });
        }

        res
          .status(200)
          .json({ success: true, message: "Crop updated successfully" });
      } catch (error) {
        res.status(500).json({ error: "Failed to update crop" });
      }
    });

    // ✅ Ping database
    await client.db("admin").command({ ping: 1 });
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
  }
}
run().catch(console.dir);

// ✅ Start Server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
