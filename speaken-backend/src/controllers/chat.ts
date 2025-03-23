import { Request, Response } from 'express';
import { ChatSettings } from '../types/chat';//定义聊天设置
import { AIService } from '../services/ai.service';//生成聊天响应
import { SpeechService } from '../services/speech.service';//语音服务
import multer from 'multer';//处理文件上传
import { Buffer } from 'buffer';//处理二进制数据

// 配置文件上传
const upload = multer({
  storage: multer.memoryStorage(),//将文件存储在内存而不是磁盘中
  limits: {
    fileSize: 10 * 1024 * 1024 // 限制10MB
  }
}).single('audio');//只处理单个（single）文件上传并命名为audio

export class ChatController {//封装处理聊天请求的逻辑
  private aiService: AIService;
  private speechService: SpeechService;//分别处理ai和语音相关的业务逻辑

  constructor() {//构造函数，在创建ChatController实例时调用
    this.aiService = new AIService();
    this.speechService = new SpeechService();
  }

  handleMessage = async (req: Request, res: Response) => {
    try {
      const { message, settings } = req.body;//从请求体获取message和settingss
      console.log('收到文本请求:', { message, settings });//在控制台输出收到的请求数据，相当于日志

      // 验证请求数据是否有效
      if (!message || !settings) {
        console.error('请求数据无效:', { message, settings });
        return res.status(400).json({ error: '无效的请求数据' });
      }

      // 使用AI服务aiService生成响应
      const response = await this.aiService.generateResponse(message, settings);
      console.log('AI响应:', response);

      // 根据性别选择语音角色
      const voiceRole = settings.gender === 'male' ? '5003' : '5118';

      // 使用语音服务生成语音响应
      const audioBuffer = await this.speechService.textToSpeech(
        response.message,//需要转换为语音的文本，ai服务返回的消息内容
        'chinese',
        voiceRole, // 使用根据性别选择的语音角色
        settings.voiceSpeed // 语速
      );

      // 将音频数据转换为Base64，从而可以在网络上传输的base64编码的字符串
      const audioBase64 = audioBuffer.toString('base64');

      // 返回文本和音频数据
      res.json({
        ...response, // 展开response对象的所有属性
        audioData: audioBase64 // 添加一个属性
      });
    } catch (error) { // 错误处理
      console.error('处理消息失败:', error);
      if (error instanceof Error) { // 检查error是否是JavaScript中的标准Error对象
        res.status(500).json({ error: `处理消息失败: ${error.message}` });
      } else {
        res.status(500).json({ error: '处理消息失败: 未知错误' });
      }
    }
  }

  handleVoiceMessage = async (req: Request, res: Response) => {
    upload(req, res, async (err) => { // upload会接收请求和相应对象，并在处理文件上传时会调用回调函数
      // 回调函数会接受一个err参数，async (err) => { ... }：上传完成后的回调函数
      if (err) {
        console.error('文件上传错误:', err);
        return res.status(400).json({ error: '文件上传失败' });
      }

      try {// upload中间件会将上传的文件存储在req.file对象中
        if (!req.file || !req.body.settings) {// 检查请求中是否包含必要的文件和数据
          return res.status(400).json({ error: '缺少必要的请求数据' });
        }

        // JSON.parse()：将字符串形式的settings解析为JavaScript对象，req.boay.settings是json字符串
        const settings: ChatSettings = JSON.parse(req.body.settings);// 并指定类型为ChatSettings
        console.log('收到语音请求:', { settings });

        // 调用语音识别服务，将音频文件转换成文本信息并返回
        const recognizedText = await this.speechService.recognizeSpeech(
          req.file.buffer,// 音频文件的二进制数据
          settings
        );
        console.log('语音识别结果:', recognizedText);

        // 使用AI服务生成响应，获得文本结果
        const aiResponse = await this.aiService.generateResponse(
          recognizedText,
          settings
        );
        console.log('AI响应:', aiResponse);

        // 根据性别选择语音角色
        const voiceRole = settings.gender === 'male' ? '5003' : '5118';

        // 生成语音响应
        const audioBuffer = await this.speechService.textToSpeech(
          aiResponse.message,
          // settings.dialogueLanguage,
          'chinese',
          // settings.voiceRole,
          // settings.voiceSpeed
          voiceRole, // 使用根据性别选择的语音角色
          settings.voiceSpeed
        );

        // 将音频数据转换为Base64
        const audioBase64 = audioBuffer.toString('base64');

        // 返回完整的响应数据
        res.json({
          // recognizedText,
          // aiResponse,
          // audioData: audioBase64
          recognizedText,     // 语音识别的文本
          message: aiResponse.message,  // AI 的回复文本
          audioData: audioBase64  // 语音数据
        });
      } catch (error) {
        console.error('处理语音消息失败:', error);
        if (error instanceof Error) {
          res.status(500).json({ error: `处理语音消息失败: ${error.message}` });
        } else {
          res.status(500).json({ error: '处理语音消息失败: 未知错误' });
        }
      }
    });
  }
} 