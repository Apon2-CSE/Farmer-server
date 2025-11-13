// 🌾 KrishiLink Server
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = 3000;

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.ncssljo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.use(cors());
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5177",
      "https://krishi-db-apon212.netlify.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

let cropsCollection;

// MongoDB Connect + Start Server
client
  .connect()
  .then(() => {
    const database = client.db("krishi-db");
    cropsCollection = database.collection("crops");

    console.log("MongoDB connected successfully!");
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => console.error("Failed to connect to MongoDB", err));

// ------------------- CROPS ROUTES -------------------

// Get all crops
app.get("/crops", async (req, res) => {
  try {
    const crops = await cropsCollection.find({}).toArray();
    res.json(crops);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch crops" });
  }
});

// Get latest crops (for home page)
app.get("/latest-crops", async (req, res) => {
  try {
    const latestCrops = await cropsCollection
      .find({})
      .sort({ _id: -1 })
      .limit(6)
      .toArray();
    res.json(latestCrops);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch latest crops" });
  }
});

// Add new crop
app.post("/crops", async (req, res) => {
  try {
    const crop = req.body;
    const result = await cropsCollection.insertOne(crop);
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add crop" });
  }
});

// Submit an interest in a crop
app.post("/crops/:id/interest", async (req, res) => {
  const { id } = req.params;
  const interest = { ...req.body, _id: new ObjectId(), status: "pending" };

  try {
    const crop = await cropsCollection.findOne({ _id: new ObjectId(id) });
    if (!crop) return res.status(404).json({ error: "Crop not found" });

    if (interest.quantity > crop.quantity) {
      return res
        .status(400)
        .json({ error: "Requested quantity exceeds available stock." });
    }

    await cropsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $push: { interests: interest } }
    );
    res.json(interest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit interest" });
  }
});

// Update interest status (Accept / Reject)
app.put("/crops/:id/interest", async (req, res) => {
  const { id } = req.params;
  const { interestId, status } = req.body;

  try {
    const crop = await cropsCollection.findOne({ _id: new ObjectId(id) });
    if (!crop) return res.status(404).json({ error: "Crop not found" });

    const selectedInterest = crop.interests.find(
      (i) => String(i._id) === interestId
    );
    if (!selectedInterest)
      return res.status(404).json({ error: "Interest not found" });

    const updatedInterests = crop.interests.map((i) =>
      String(i._id) === interestId ? { ...i, status } : i
    );

    let updateOps = { interests: updatedInterests };
    if (status === "accepted" && crop.quantity > 0) {
      const reduceBy = Number(selectedInterest.quantity) || 1;
      const newQuantity = crop.quantity - reduceBy;
      updateOps.quantity = newQuantity >= 0 ? newQuantity : 0;
    }

    await cropsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateOps }
    );

    const updatedInterest = updatedInterests.find(
      (i) => String(i._id) === interestId
    );
    res.json(updatedInterest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update interest" });
  }
});

// Get all interests sent by a specific user
app.get("/my-interests", async (req, res) => {
  try {
    const userEmail = req.query.userEmail;
    if (!userEmail)
      return res.status(400).json({ error: "userEmail is required" });

    const cropsWithInterests = await cropsCollection
      .find({ "interests.userEmail": userEmail })
      .toArray();

    const result = cropsWithInterests.map((crop) => ({
      _id: crop._id,
      name: crop.name,
      owner: crop.owner,
      interests: crop.interests.filter((i) => i.userEmail === userEmail),
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user interests" });
  }
});

// Update crop (Edit)
app.put("/crops/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  try {
    const result = await cropsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updatedData },
      { returnDocument: "after" }
    );
    res.json(result.value);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update crop" });
  }
});

// Delete crop
app.delete("/crops/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await cropsCollection.deleteOne({ _id: new ObjectId(id) });
    res.json({ message: "Crop deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete crop" });
  }
});
