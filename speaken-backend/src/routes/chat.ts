import express from 'express';
import { ChatController } from '../controllers/chat';
//从 ../controllers/chat 模块中导入 ChatController 类

const router = express.Router();
const chatController = new ChatController();

// 当发送到 /api/chat 路径的 POST 请求到达时，
// 调用 chatController.handleMessage 来处理文本消息请求。
router.post('/', chatController.handleMessage);

// 当发送到 /api/chat/voice 路径的 POST 请求到达时，
// 调用 chatController.handleVoiceMessage 来处理语音消息。
router.post('/voice', chatController.handleVoiceMessage);

export { router as chatRouter }; 