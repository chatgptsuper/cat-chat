import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { chatRouter } from './routes/chat';

// 加载环境变量，会读取项目根目录下的.env文件，并将文件中的键值对加载到process.env对象中，例如port=5000会被加载为process.env.PORT
dotenv.config();

const app = express();//创建express实例
const port = Number(process.env.PORT) || 5000;

// 中间件
// app.use(cors());// 允许跨域，让前端可以访问后端
// app.use(express.json());// 解析json格式的请求体


// //实现内网穿透部分
// app.use(cors({
//   // origin: 'https://927a-112-81-181-148.ngrok-free.app', 
//   origin: '*',
//   methods: ['GET', 'POST', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: false
// }));

// app.use(express.json({ limit: '50mb' }));

// // 路由
// app.use('/api/chat', chatRouter);

// // 健康检查
// app.get('/health', (req, res) => {
//   res.json({ status: 'ok' });
// });

// // 启动服务器
// app.listen(port, '0.0.0.0', () => {
//   console.log(`Server is running on http://0.0.0.0:${port}`);
// });



app.use(cors({
  origin: 'http://localhost:5173', // 允许前端开发服务器访问
  credentials: true// 允许跨域请求携带cookies和http认证等身份验证信息
}));

app.use(express.json({ limit: '50mb' }));// 解析json格式的数据请求体，增加限制以处理音频数据

// 路由，所有发往/api/chat的请求都会交由chatRouter来处理
app.use('/api/chat', chatRouter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 启动服务器
app.listen(port, 'localhost', () => {
  console.log(`Server is running on http://localhost:${port}`);
}); 