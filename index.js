const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const bcrypt = require('bcrypt');
const UserModel = require("./models/User");
require('dotenv').config(); // Load environment variables

const app = express();
const PORT = 3001;
const uri = process.env.MONGODB_URI;

app.use(express.json());

app.use(cors()); // ⚠️ Allows ALL origins — only use in dev


app.use(morgan('dev'));

// Connect to MongoDB
mongoose.connect(uri,)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Failed to connect to MongoDB', err));

// Signup Route
app.post("/usersignup", async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        await UserModel.create({ username, email, password: hash });
        res.send('success');
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).send("Signup failed");
    }
});

// Login Route
app.post('/userlogin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await UserModel.findOne({ email });
        if (user && await bcrypt.compare(password, user.password)) {
            res.status(200).send(user._id);
        } else {
            res.status(401).json({ message: 'Invalid email or password.' });
        }
    } catch (error) {
        console.error('Login failed:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// Record Expense
app.post('/recordexpense', async (req, res) => {
    const { userId, type, date, description, amount } = req.body;
    try {
        const user = await UserModel.findById(userId);
        if (user) {
            user.expenses.push({ type, date, description, amount });
            await user.save();
            res.status(200).json({ message: 'Expense recorded successfully' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error recording expense:', error);
        res.status(500).json({ message: 'Failed to record expense' });
    }
});

// Get Expenses
app.get('/expenses', async (req, res) => {
    const { userId, type, month, year } = req.query;
    try {
        const user = await UserModel.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        let filteredExpenses = user.expenses;

        if (type) {
            filteredExpenses = filteredExpenses.filter(exp => exp.type === type);
        }
 
        if (month && year) {
            const m = parseInt(month), y = parseInt(year);
            filteredExpenses = filteredExpenses.filter(exp => {
                const d = new Date(exp.date);
                return d.getMonth() + 1 === m && d.getFullYear() === y;
            });
        } else if (year) {
            const y = parseInt(year);
            filteredExpenses = filteredExpenses.filter(exp => {
                return new Date(exp.date).getFullYear() === y;
            });
        }

        res.json(filteredExpenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ message: 'Failed to fetch expenses' });
    }
});

// Update Expense
app.put('/expenses/:id', async (req, res) => {
    const { id } = req.params;
    const { amount, description, type, date } = req.body;

    try {
        const user = await UserModel.findOne({ "expenses._id": id });
        if (!user) return res.status(404).json({ message: 'Expense not found' });

        const expense = user.expenses.id(id);
        if (expense) {
            expense.amount = amount;
            expense.description = description;
            expense.type = type;
            expense.date = date;
            await user.save();
            res.json(expense);
        } else {
            res.status(404).json({ message: 'Expense not found' });
        }
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ message: 'Failed to update expense' });
    }
});

// Delete Expense
app.delete('/expenses/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const user = await UserModel.findOne({ "expenses._id": id });
        if (!user) return res.status(404).json({ message: 'User or Expense not found' });

        const expenseIndex = user.expenses.findIndex(exp => exp._id.toString() === id);
        if (expenseIndex > -1) {
            user.expenses.splice(expenseIndex, 1);
            await user.save();
            res.json({ message: 'Expense deleted successfully' });
        } else {
            res.status(404).json({ message: 'Expense not found' });
        }
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ message: 'Failed to delete expense' });
    }
});

// Get User Profile
app.get('/profile/:userId', async (req, res) => {
    try {
        const user = await UserModel.findById(req.params.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Failed to fetch user profile' });
    }
});

// Logout
app.post('/logout', (req, res) => {
    res.status(200).json({ message: 'Logged out successfully' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`);
});
