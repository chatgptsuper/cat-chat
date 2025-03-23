// 预设场景类型
export type PresetScene = 'shopping' | 'restaurant' | 'travel' | 'business' | 'academic' | 'ielts' | 'toefl' | 'custom';

// 预设角色类型
export type PresetRole = 'student' | 'customer' | 'tourist' | 'interviewee' | 'businessman' | 'teacher' | 'clerk' | 'guide' | 'interviewer' | 'partner' | 'custom';

export interface ChatSettings {
  dialogueLanguage:  'chinese';
  voiceRole: string;           // 语音角色设置
  voiceSpeed: number;          // 语速设置
  gender: 'male' | 'female';  // 添加性别设置
}

export interface ChatMessage { // interface 强制定义对象的结构
  content: string;             // 聊天消息内容
}

export interface ChatResponse {
  message: string;             //表示ai的回应消息
} 