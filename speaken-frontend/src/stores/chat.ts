import { defineStore } from 'pinia'

export const useChatStore = defineStore('chat', {
  state: () => ({
    currentCat: 'black' as 'black' | 'white',
    messages: [] as Array<{
      type: 'user' | 'cat'
      content: string
      timestamp: number
    }>,
    isRecording: false
  }),
  
  actions: {
    switchCat() {
      console.log('Store: Switching cat from', this.currentCat)
      this.currentCat = this.currentCat === 'black' ? 'white' : 'black'
      console.log('Store: Switched to', this.currentCat)
    },
    
    addMessage(type: 'user' | 'cat', content: string) {
      console.log('Store: Adding message', { type, content })
      this.messages.push({
        type,
        content,
        timestamp: Date.now()
      })
      // 保留最近的10条消息
      if (this.messages.length > 10) {
        this.messages.shift()
      }
    },
    
    updateLastMessage(content: string) {
      if (this.messages.length > 0) {
        const lastMessage = this.messages[this.messages.length - 1]
        lastMessage.content = content
      }
    },
    
    setRecording(status: boolean) {
      console.log('Store: Setting recording status to', status)
      this.isRecording = status
    }
  }
}) 