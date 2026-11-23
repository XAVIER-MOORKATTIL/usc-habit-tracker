require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch(err => console.error('MongoDB Connection Error:', err));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  bigGoal: { type: String, default: '' },
  habits: [{
    text: String,
    completed: { type: Boolean, default: false },
    streak: { type: Number, default: 0 }
  }],
  beliefs: [{
    limiting: String,
    empowering: String,
    createdAt: { type: Date, default: Date.now }
  }]
});

const User = mongoose.model('User', userSchema);

// Login or Auto-Register User
app.post('/api/login', async (req, res) => {
  try {
    const username = req.body.username.trim().toLowerCase();
    if (!username) return res.status(400).json({ error: 'Username required' });
    let user = await User.findOne({ username });
    if (!user) {
      user = await User.create({ username, bigGoal: '', habits: [], beliefs: [] });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Big Goal
app.post('/api/goal', async (req, res) => {
  const { username, bigGoal } = req.body;
  const user = await User.findOneAndUpdate({ username }, { bigGoal }, { new: true });
  res.json(user);
});

// Add Habit (Max 3)
app.post('/api/habits', async (req, res) => {
  const { username, text } = req.body;
  const user = await User.findOne({ username });
  if (user.habits.length >= 3) return res.status(400).json({ error: 'Max 3 habits allowed' });
  user.habits.push({ text, completed: false, streak: 0 });
  await user.save();
  res.json(user);
});

// Toggle Habit & Update Streak
app.post('/api/habits/toggle', async (req, res) => {
  const { username, habitId } = req.body;
  const user = await User.findOne({ username });
  const habit = user.habits.id(habitId);
  habit.completed = !habit.completed;
  habit.streak = habit.completed ? habit.streak + 1 : Math.max(0, habit.streak - 1);
  await user.save();
  res.json(user);
});

// Delete Habit
app.delete('/api/habits/:username/:habitId', async (req, res) => {
  const { username, habitId } = req.params;
  const user = await User.findOne({ username });
  user.habits = user.habits.filter(h => h._id.toString() !== habitId);
  await user.save();
  res.json(user);
});

// Transform Limiting Belief
app.post('/api/belief', async (req, res) => {
  const { username, limiting } = req.body;
  const reframes = [
    `I am capable of mastering this step by step, and every challenge builds my resilience.`,
    `My past does not dictate my potential—I choose Creator Mode right now.`,
    `Obstacles are simply feedback; I have everything inside me to figure this out.`,
    `I release doubt and step into unstoppable, consistent action today.`
  ];
  const empowering = reframes[Math.floor(Math.random() * reframes.length)];
  const user = await User.findOne({ username });
  user.beliefs.unshift({ limiting, empowering });
  await user.save();
  res.json(user);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));