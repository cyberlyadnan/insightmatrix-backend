import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import xssClean from "xss-clean";
import hpp from "hpp";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from './config/env';
import { swaggerSpec } from './docs/swagger';
import routes from './routes/index';
import { apiLimiter } from './middleware/rateLimit.middleware';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true
  })
);
app.use(apiLimiter);
app.use(compression());
app.use(xssClean());
app.use(hpp());
app.use(morgan("combined"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(env.API_PREFIX, routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;

