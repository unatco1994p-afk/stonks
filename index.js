import express from 'express';
import cors from 'cors';
import routes from './routes/main.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.use('/', routes);

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});