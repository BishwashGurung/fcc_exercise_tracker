const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const connectToMongoDB = require("./db/connectToMongoDB");

const User = require("./models/user");
const Exercise = require("./models/exercise");

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// endpoints for the given tasks

// POST /api/users
app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (error) {
    console.log(`Error in creating new user:`, error.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// GET /api/users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    console.log(`Error in getting users:`, error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/users/:_id/exercises
app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;

    const user = await User.findById(_id);
    if (!user) return res.status(400).send("User not found");

    const exercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date(),
    });
    await exercise.save();

    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id,
    });
  } catch (error) {
    console.log(`Error in saving exercise:`, error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/users/:_id/logs
app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);
    if (!user) return res.status(400).send("User not found");

    let dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    const query = {
      userId: user._id,
      ...(Object.keys(dateFilter).length && { date: dateFilter }), // Apply date filter only if it has keys
    };

    const exercises = await Exercise.find(query).limit(parseInt(limit) || 0); // limit(0) means no limit

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map((ex) => ({
        description: ex.description,
        duration: ex.duration,
        date: ex.date.toDateString(),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, async () => {
  await connectToMongoDB();
  console.log("Your app is listening on port " + listener.address().port);
});
