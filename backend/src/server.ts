import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { env, isDev } from './config/env';
import routes from './routes';
import { notFoundHandler, errorHandler } from './middleware/error';

const app = express();
app.set('trust proxy', 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || env.corsOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'));
      }
    },
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// uploaded incident images
app.use(
  '/uploads',
  express.static(path.resolve(process.cwd(), env.upload.dir), { maxAge: '7d' })
);

app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(
    `SmartFlow AI API running on http://localhost:${env.port} (${isDev ? 'development' : 'production'})`
  );
});
