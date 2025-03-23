<template>
  <div class="chat-container">
    <!-- 猫咪模型容器 -->
    <div class="cat-container">
      <Live2DModel :modelType="chatStore.currentCat" ref="live2dModel" />
      <div class="control-buttons">
        <el-button class="switch-cat-btn" @click="switchCat">
          切换性别
        </el-button>
        <el-slider
          v-model="volume"
          :min="0"
          :max="10"
          :step="1"
          class="control-slider"
          @change="handleVolumeChange"
          :format-tooltip="(val) => `音量: ${val}`"
        >
          <template #prefix>
            <el-icon><i class="el-icon-volume-up" /></el-icon>
          </template>
        </el-slider>
        <el-slider
          v-model="speed"
          :min="1"
          :max="9"
          :step="1"
          class="control-slider"
          @change="handleSpeedChange"
          :format-tooltip="(val) => `语速: ${val}`"
        >
          <template #prefix>
            <el-icon><Timer /></el-icon>
          </template>
        </el-slider>
      </div>
    </div>

    <!-- 聊天区域 -->
    <div class="chat-area">
      <!-- 消息显示区域 -->
      <div class="messages-container">
        <div v-if="chatStore.messages.length === 0" class="empty-message">
          暂无消息，开始聊天吧！
        </div>
        <template v-else>
          <div v-for="msg in chatStore.messages" :key="msg.timestamp" 
               :class="['message', msg.type === 'user' ? 'user-message' : 'cat-message']">
            <div class="message-content">{{ msg.content }}</div>
            <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
          </div>
          <!-- 显示正在输入状态 -->
          <div v-if="isAITyping" class="message cat-message typing">
            <div class="message-content">{{ currentTypingText }}</div>
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </template>
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <el-input
          v-model="inputMessage"
          placeholder="说点什么吧..."
          @keyup.enter="sendMessage"
        >
          <template #append>
            <el-button @click="sendMessage">
              <el-icon><ChatDotRound /></el-icon>
            </el-button>
          </template>
        </el-input>
        
        <!-- 语音输入按钮 -->
        <el-button
          class="voice-btn"
          :class="{ recording: isRecording }"
          @mousedown="startRecording"
          @mouseup="stopRecording"
        >
          <el-icon><Microphone /></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ChatDotRound, Microphone, Timer } from '@element-plus/icons-vue'
import { useChatStore } from '../stores/chat'
import Live2DModel from '../components/Live2DModel.vue'

const chatStore = useChatStore()
const inputMessage = ref('')
const isRecording = ref(false)
const live2dModel = ref()
const audioPlayer = ref<HTMLAudioElement | null>(null)
const volume = ref(5) // 默认音量为5
const speed = ref(5)  // 默认语速为5
const isAITyping = ref(false)
const currentTypingText = ref('')
const typingSpeed = 50 // 打字速度（毫秒/字符）

// 创建音频播放器
onMounted(() => {
  console.log('Current cat:', chatStore.currentCat)
  audioPlayer.value = new Audio()
})

// 切换猫咪
const switchCat = () => {
  chatStore.switchCat()
}

// 播放语音
const playAudio = async (audioData: string) => {
  if (!audioPlayer.value) return
  
  try {
    console.log('准备播放音频数据:', audioData.substring(0, 100)) // 只打印前100个字符
    
    // 如果是 Base64 格式的音频数据
    if (typeof audioData === 'string') {
      if (audioData.startsWith('data:audio')) {
        console.log('播放 Base64 音频')
        audioPlayer.value.src = audioData
      } else {
        // 尝试将字符串转换为 Base64
        console.log('转换并播放 Base64 音频')
        audioPlayer.value.src = `data:audio/mp3;base64,${audioData}`
      }
    } else {
      // 如果是二进制数据，需要转换
      console.log('播放二进制音频')
      const blob = new Blob([audioData], { type: 'audio/mp3' })
      audioPlayer.value.src = URL.createObjectURL(blob)
    }
    
    // 播放完成后释放资源
    audioPlayer.value.onended = () => {
      console.log('音频播放完成')
      if (audioPlayer.value?.src && audioPlayer.value.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioPlayer.value.src)
      }
    }
    
    // 播放音频
    console.log('开始播放音频')
    await audioPlayer.value.play()
  } catch (error) {
    console.error('音频播放失败:', error)
    ElMessage.error('音频播放失败')
  }
}

// 格式化时间的函数
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// 打字机效果函数
const typewriterEffect = async (text: string) => {
  currentTypingText.value = ''
  const chars = text.split('')
  
  for (let char of chars) {
    currentTypingText.value += char
    await new Promise(resolve => setTimeout(resolve, typingSpeed))
  }
  return currentTypingText.value
}

// 处理 AI 回复
const handleAIResponse = async (data: any) => {
  console.log('收到 AI 回复数据:', JSON.stringify(data, null, 2))
  
  try {
    // 添加文本回复到聊天框
    let replyText = ''
    if (data.reply) {
      replyText = data.reply
    } else if (data.text) {
      replyText = data.text
    } else if (data.response) {
      replyText = data.response
    } else if (data.message) {
      replyText = data.message
    } else if (typeof data === 'string') {
      replyText = data
    } else if (data.data?.text) {
      replyText = data.data.text
    } else if (data.data?.message) {
      replyText = data.data.message
    }

    if (replyText) {
      // 关闭输入状态提示
      isAITyping.value = false
      
      // 开始播放音频（如果有）
      let audioPromise: Promise<void> | null = null
      if (data.audio) {
        audioPromise = playAudio(data.audio)
      } else if (data.audioData) {
        audioPromise = playAudio(data.audioData)
      } else if (data.speech) {
        audioPromise = playAudio(data.speech)
      } else if (data.data?.audio) {
        audioPromise = playAudio(data.data.audio)
      } else if (data.data?.audioData) {
        audioPromise = playAudio(data.data.audioData)
      }
      
      // 播放说话动作
      if (live2dModel.value) {
        console.log('播放说话动作')
        live2dModel.value.playMotion('talk')
      }

      // 添加空消息并开始打字机效果
      chatStore.addMessage('cat', '')
      let currentText = ''
      
      // 逐字显示文本
      for (const char of replyText) {
        currentText += char
        chatStore.updateLastMessage(currentText)
        await new Promise(resolve => setTimeout(resolve, typingSpeed))
      }
      
      // 等待音频播放完成（如果有）
      if (audioPromise) {
        await audioPromise
      }
    }
  } finally {
    // 确保状态被重置
    isAITyping.value = false
    currentTypingText.value = ''
  }
}

// 处理音量变化
const handleVolumeChange = (value: number) => {
  console.log('音量调整为:', value)
  if (audioPlayer.value) {
    audioPlayer.value.volume = value / 10 // 将0-10的值转换为0-1
  }
}

// 处理语速变化
const handleSpeedChange = (value: number) => {
  console.log('语速调整为:', value)
}

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim()) return
  
  // 添加用户消息
  chatStore.addMessage('user', inputMessage.value)
  
  // 显示 AI 正在输入状态
  isAITyping.value = true
  
  try {
    console.log('发送文本消息:', inputMessage.value)
    
    // 发送文本消息到对应的路由
    const response = await fetch('http://localhost:5000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: inputMessage.value,
        settings: {
          temperature: 0.7,
          model: 'deepseek-chat',
          dialogueLanguage: 'chinese',
          gender: chatStore.currentCat === 'black' ? 'male' : 'female',
          voiceSpeed: speed.value,
          voice: {
            enable: true,
            speed: speed.value,
            volume: volume.value,
            pitch: 5,
            voice: chatStore.currentCat === 'black' ? '5003' : '5118'
          }
        }
      }),
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('收到后端响应:', JSON.stringify(data, null, 2))
    
    if (data.error) {
      throw new Error(data.error)
    }
    
    // 处理 AI 回复
    await handleAIResponse(data)
    
  } catch (error) {
    console.error('发送消息失败:', error)
    ElMessage.error(`发送消息失败: ${error.message}`)
    // 出错时也要关闭输入状态
    isAITyping.value = false
  }
  
  inputMessage.value = ''
}

// 开始录音
const startRecording = () => {
  console.log('开始录音...')
  isRecording.value = true
  chatStore.setRecording(true)
  
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      const mediaRecorder = new MediaRecorder(stream)
      const audioChunks: BlobPart[] = []
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data)
      }
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
        
        try {
          const formData = new FormData()
          formData.append('audio', audioBlob)
          formData.append('settings', JSON.stringify({
            temperature: 0.7,
            model: 'deepseek-chat',
            dialogueLanguage: 'chinese',
            gender: chatStore.currentCat === 'black' ? 'male' : 'female',
            voiceSpeed: speed.value,
            voice: {
              enable: true,
              speed: speed.value,
              volume: volume.value,
              pitch: 5,
              voice: chatStore.currentCat === 'black' ? '5003' : '5118'
            }
          }))
          
          const response = await fetch('http://localhost:5000/api/chat/voice', {
            method: 'POST',
            body: formData,
            credentials: 'include'
          })
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const data = await response.json()
          console.log('收到语音消息响应:', data)
          
          if (data.error) {
            throw new Error(data.error)
          }
          
          // 添加用户的语音识别文本到聊天框
          if (data.recognizedText) {
            console.log('添加用户语音识别文本:', data.recognizedText)
            chatStore.addMessage('user', data.recognizedText)
          }
          
          // 处理 AI 回复
          await handleAIResponse(data)
          
        } catch (error) {
          console.error('发送语音消息失败:', error)
          ElMessage.error(`发送语音消息失败: ${error.message}`)
        }
      }
      
      // 保存 mediaRecorder 实例以便停止录音
      ;(window as any).mediaRecorder = mediaRecorder
      mediaRecorder.start()
      
    })
    .catch(error => {
      console.error('无法访问麦克风:', error)
      ElMessage.error('无法访问麦克风')
      isRecording.value = false
      chatStore.setRecording(false)
    })
}

// 停止录音
const stopRecording = async () => {
  console.log('停止录音...')
  isRecording.value = false
  chatStore.setRecording(false)
  
  const mediaRecorder = (window as any).mediaRecorder
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
    mediaRecorder.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop())
  }
}
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100vh;
  padding: 20px;
  background: #16b5ff99;
}

.cat-container {
  width: 600px;
  position: relative;
  background: rgb(219, 219, 219);
  border-radius: 8px;
  overflow: hidden;
  margin-right: 20px;
  min-height: 400px;
}

.control-buttons {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px;
  border-radius: 8px;
}

.switch-cat-btn {
  position: static; 
}

.control-slider {
  width: 120px;
  margin-left: 10px;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 800px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: rgb(219, 219, 219);
  border-radius: 8px;
  margin-bottom: 20px;
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

.empty-message {
  text-align: center;
  color: #999;
  padding: 20px;
}

.message {
  margin: 10px 0;
  padding: 10px 15px;
  border-radius: 8px;
  max-width: 80%;
  word-break: break-word;
  position: relative;
}

.user-message {
  background: #95ec69;
  align-self: flex-end;
  margin-left: auto;
  border-radius: 15px 15px 0 15px;
}

.cat-message {
  background: #ffffff;
  align-self: flex-start;
  border-radius: 15px 15px 15px 0;
  border: 1px solid #e0e0e0;
}

.input-area {
  display: flex;
  gap: 10px;
}

.voice-btn {
  padding: 0 20px;
}

.voice-btn.recording {
  background: #ff4d4f;
  color: white;
}

.message-content {
  margin-bottom: 4px;
}

.message-time {
  font-size: 12px;
  color: #999;
  text-align: right;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 8px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #999;
  animation: typing 1s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(2) { animation-delay: 0.4s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.6s; }

@keyframes typing {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.typing {
  opacity: 0.7;
}
</style> 