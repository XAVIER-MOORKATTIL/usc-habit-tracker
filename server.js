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
  witnessReps: { type: Number, default: 0 },
  habits: [{
    text: String,
    completed: { type: Boolean, default: false },
    streak: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  }],
  beliefs: [{
    limiting: String,
    empowering: String,
    createdAt: { type: Date, default: Date.now }
  }]
});

const User = mongoose.model('User', userSchema);

// Micro-Evolution v1.2 Health & Version Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    version: 'v1.2',
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Login or Auto-Register User
app.post('/api/login', async (req, res) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    if (!username) return res.status(400).json({ error: 'Username required' });
    let user = await User.findOne({ username });
    if (!user) {
      user = await User.create({ username, bigGoal: '', witnessReps: 0, habits: [], beliefs: [] });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Big Goal
app.post('/api/goal', async (req, res) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const bigGoal = (req.body.bigGoal || '').trim();
    if (!username) return res.status(400).json({ error: 'Username required' });
    const user = await User.findOneAndUpdate({ username }, { bigGoal }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Habit (Max 3, Blank-Protected)
app.post('/api/habits', async (req, res) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const text = (req.body.text || '').trim();
    if (!username || !text) return res.status(400).json({ error: 'Habit text cannot be blank' });

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.habits.length >= 3) return res.status(400).json({ error: 'Max 3 habits allowed' });

    user.habits.push({ text, completed: false, streak: 0, createdAt: new Date() });
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Habit & Update Streak
app.post('/api/habits/toggle', async (req, res) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const { habitId } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const habit = user.habits.id(habitId);
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    habit.completed = !habit.completed;
    habit.streak = habit.completed ? habit.streak + 1 : Math.max(0, habit.streak - 1);
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Habit
app.delete('/api/habits/:username/:habitId', async (req, res) => {
  try {
    const username = (req.params.username || '').trim().toLowerCase();
    const { habitId } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.habits = user.habits.filter(h => h._id.toString() !== habitId);
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Transform Limiting Belief (Blank-Protected)
app.post('/api/belief', async (req, res) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const limiting = (req.body.limiting || '').trim();
    if (!username || !limiting) return res.status(400).json({ error: 'Limiting belief cannot be blank' });

    const reframes = [
      `I am capable of mastering this step by step, and every challenge builds my resilience.`,
      `My past does not dictate my potential—I choose Creator Mode right now.`,
      `Obstacles are simply feedback; I have everything inside me to figure this out.`,
      `I release doubt and step into unstoppable, consistent action today.`
    ];
    const empowering = reframes[Math.floor(Math.random() * reframes.length)];
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.beliefs.unshift({ limiting, empowering, createdAt: new Date() });
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync Witness Reps (Ready for v1.3)
app.post('/api/witness', async (req, res) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const user = await User.findOneAndUpdate(
      { username },
      { $inc: { witnessReps: 1 } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));