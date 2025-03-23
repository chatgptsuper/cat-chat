import OpenAI from 'openai'; // 引入openaiSDK与deepseek api进行交互
import { ChatSettings } from '../types/chat';
import dotenv from 'dotenv';

// 确保加载环境变量
dotenv.config();

// 添加对话历史接口
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class AIService {
  private openai: OpenAI; // 声明openai变量
  //conversationHistory表示用于保存对话历史记录
  private conversationHistory: Map<string, Message[]> = new Map();
  // 表示map的键是string类型，值value是messager

  constructor() {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY 环境变量未设置'); // 抛出错误并终止程序执行
    }

    console.log('初始化 AI 服务:', {
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      apiKeyExists: !!process.env.DEEPSEEK_API_KEY // !!强制转化为布尔值，存在且有值就会被强制转化
    });

    this.openai = new OpenAI({ // 构造函数中实例化openai类，并赋值给之前声明的openai变量
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
    });
  }

  // 根据chatSettings生成系统提示词
  // 接受参数名为settings，类型为ChatSettings，返回值类型为string
  private generateSystemPrompt(settings: ChatSettings): string {
    
    const voiceRole = settings.voiceRole;
    // 根据设置的对话语言生成相应的提示词
    if (settings.dialogueLanguage === 'chinese') {
      return `记住，你是一只会说话的猫咪，你非常可爱，非常喜欢和主人互动。
        无论在什么情况下，你都应当展现出一只猫咪应有的特点。并且用中文回答。你的回答不应该包含旁白，所有的回复都应该是和主人的对话内容`;
    } 
    else {
      return `记住，你是一只会说话的猫咪，你非常可爱，非常喜欢和主人互动。
        无论在什么情况下，你都应当展现出一只猫咪应有的特点。并且用中文回答。你的回答不应该包含旁白，所有的回复都应该是和主人的对话内容`;
    }
  }

  private getConversationId(settings: ChatSettings): string { // 生成唯一的conversationid 用于标识对话
    return `${settings.voiceRole}_${settings.voiceSpeed}`;
  }

  // 管理对话历史记录，最终返回的是conversationID
  private getOrCreateConversation(settings: ChatSettings): Message[] {
    const conversationId = this.getConversationId(settings);
    if (!this.conversationHistory.has(conversationId)) { // 检查是否已经存在该对话历史记录
      // 当对话历史记录不存在时，系统会创建一条由 system 角色发送的消息，这条消息用于初始化对话
      const systemMessage: Message = {
        role: 'system',
        content: this.generateSystemPrompt(settings)
      };
      this.conversationHistory.set(conversationId, [systemMessage]); // 将新创建的对话历史保存到其中
    }
    return this.conversationHistory.get(conversationId)!; // !表示返回结果不能为null或undefined
  }//并且最终返回的是conversationID

  // 生成ai的回复
  async generateResponse(message: string, settings: ChatSettings): Promise<{ message: string; translation?: string }> {
    try {
      console.log('开始生成响应:', { message, settings }); //这里的message是字符串类型的参数，表示用户输入的信息

      // // 是否开启实时翻译
      // let needsTranslation = settings.realTimeTranslation;

      // 获取当前对话的消息历史
      const messages = this.getOrCreateConversation(settings);

      // 添加用户的新消息
      messages.push({
        role: 'user',
        content: message
      });

      // 生成主要响应
      console.log('调用 deepseek API 生成主要响应，消息历史:', messages);

      const primaryResponse = await this.openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 1.3, 
        max_tokens: 1000  // 限制回复长度
      });

      const primaryMessage = primaryResponse.choices[0].message.content || '';
      console.log('获得主要响应:', primaryMessage);

      // 将AI的响应添加到历史记录
      messages.push({
        role: 'assistant',
        content: primaryMessage
      });

      // 更新对话历史
      this.conversationHistory.set(this.getConversationId(settings), messages);

      return {
        message: primaryMessage,
      };
    } catch (error) {
      console.error('AI服务错误:', error);
      if (error instanceof Error) {
        throw new Error(`AI服务错误: ${error.message}`);
      } else {
        throw new Error('AI服务未知错误');
      }
    }
  }
} 