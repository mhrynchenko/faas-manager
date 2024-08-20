import express from 'express';
import { FunctionManager } from './core';

const app = express();
const manager = new FunctionManager();

app.use(express.json());

app.post('/messages', (req, res) => {
    const { message, name } = req.body;
    manager.handleMessage(name, message);
    res.sendStatus(204);
});

app.get('/statistics', (req, res) => {
    const stats = manager.getStatistics();
    res.json(stats);
});

const PORT = 8005;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
