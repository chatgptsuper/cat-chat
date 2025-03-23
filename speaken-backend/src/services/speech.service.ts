import * as AipSdk from 'baidu-aip-sdk' // SDK from baidu
import { ChatSettings } from '../types/chat'
import ffmpeg from 'fluent-ffmpeg' //音频处理的库
import { Readable } from 'stream'
import { promisify } from 'util'
import { exec } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec) // 将exec方法转换为promise形式

export class SpeechService {
  private asrClient: any // 语音识别客户端
  private ttsClient: any // 语音合成客户端

  constructor() { 
    // 设置语音识别的APPID/AK/SK
    const ASR_APP_ID = process.env.BAIDU_APP_ID
    const ASR_API_KEY = process.env.BAIDU_API_KEY
    const ASR_SECRET_KEY = process.env.BAIDU_SECRET_KEY

    // 设置语音合成的APPID/AK/SK
    const TTS_APP_ID = process.env.BAIDU_TTS_APP_ID
    const TTS_API_KEY = process.env.BAIDU_TTS_API_KEY
    const TTS_SECRET_KEY = process.env.BAIDU_TTS_SECRET_KEY

    if (!ASR_APP_ID || !ASR_API_KEY || !ASR_SECRET_KEY) {
      throw new Error('百度语音识别API配置缺失')
    }

    if (!TTS_APP_ID || !TTS_API_KEY || !TTS_SECRET_KEY) {
      throw new Error('百度语音合成API配置缺失')
    }

    console.log('初始化语音服务:', {
      asrAppIdExists: !!ASR_APP_ID, // 将密钥等转换为布尔类型，检测是否存在
      asrApiKeyExists: !!ASR_API_KEY,
      asrSecretKeyExists: !!ASR_SECRET_KEY,
      ttsAppIdExists: !!TTS_APP_ID,
      ttsApiKeyExists: !!TTS_API_KEY,
      ttsSecretKeyExists: !!TTS_SECRET_KEY
    })

    // 创建语音识别客户端
    this.asrClient = new AipSdk.speech(ASR_APP_ID, ASR_API_KEY, ASR_SECRET_KEY)
    
    // 创建语音合成客户端
    this.ttsClient = new AipSdk.speech(TTS_APP_ID, TTS_API_KEY, TTS_SECRET_KEY)
  }

  // 语音合成方法，调用百度语音合成 API，将文本转换成语音
  async textToSpeech(text: string, language: string, voiceRole: string = '5003', voiceSpeed: number = 5): Promise<Buffer> {
    try {
      console.log('开始语音合成:', { text, language, voiceRole, voiceSpeed });

      // 设置语音合成参数
      const options = {
        spd: voiceSpeed, // 语速，取值0-9，使用传入的语速值
        pit: 5, // 音调，取值0-9，默认为5中语调
        vol: 5, // 音量，取值0-15，默认为5中音量
        per: voiceRole, // 使用传入的语音角色
        cuid: 'speaken_' + Date.now(), // 用户唯一标识，每次调用都会生成一个新的
        aue: 3, // 音频格式，3为mp3格式(默认)； 4为pcm-16k；5为pcm-8k；6为wav（内容同pcm-16k）
        tex: encodeURIComponent(text) // 对文本进行 URL 编码，以便可以安全地通过网络请求传递
      };

      console.log('语音合成参数:', options);

      // 调用百度语音合成API
      const result = await this.ttsClient.text2audio(text, options);

      if (result.data) {
        console.log('语音合成成功，数据大小:', result.data.length);
        return result.data;
      } else {
        console.error('语音合成失败:', result);
        throw new Error(`语音合成失败: ${JSON.stringify(result)}`); //JSON.stringify(result)会将result对象转成字符串格式
      }
    } catch (error) {
      console.error('语音合成错误:', error);
      throw error;
    }
  }

  // 将webm格式音频转换为pcm格式
  private async convertWebmToPcm(audioBuffer: Buffer): Promise<Buffer> {
    try {
      // 创建临时文件
      const tempDir = os.tmpdir()
      const inputPath = path.join(tempDir, `input-${Date.now()}.webm`)// 存储临时输入文件的路径
      const outputPath = path.join(tempDir, `output-${Date.now()}.pcm`)//存储临时输出文件的路径

      // 写入输入文件，fs.promises 是fs模块的基于Promise的版本
      await fs.promises.writeFile(inputPath, audioBuffer)

      // 执行 FFmpeg 命令，进行音频格式转换
      const command = `ffmpeg -i ${inputPath} -f s16le -acodec pcm_s16le -ar 16000 -ac 1 ${outputPath}`
      
      console.log('执行音频转换命令:', command)
      await execAsync(command) // 会执行系统命令（FFmpeg）并返回结果

      // 读取输出文件
      const pcmBuffer = await fs.promises.readFile(outputPath)

      // 清理临时文件
      await fs.promises.unlink(inputPath)
      await fs.promises.unlink(outputPath)

      return pcmBuffer // return转换后的音频数据
    } catch (error) {
      console.error('音频转换失败:', error)
      throw new Error('音频格式转换失败')
    }
  }

  async recognizeSpeech(audioBuffer: Buffer, settings: ChatSettings): Promise<string> {
    try {
      // 根据对话语言选择合适的语音识别模型
      let dev_pid: number
      switch (settings.dialogueLanguage) {
        case 'chinese':
          dev_pid = 1537 // 普通话模型
          break
        default:
          dev_pid = 1537 // 默认使用普通话模型
      }

      console.log('准备语音识别:', {
        bufferSize: audioBuffer.length,
        dev_pid,
        language: settings.dialogueLanguage
      })

      // 转换音频格式为 PCM
      const pcmBuffer = await this.convertWebmToPcm(audioBuffer)
      console.log('音频转换完成, PCM大小:', pcmBuffer.length)

      // 调用百度语音识别API
      const result = await this.asrClient.recognize(pcmBuffer, 'pcm', 16000, { dev_pid })
      console.log('语音识别结果:', result)

      if (result.err_no !== 0) {
        throw new Error(`语音识别失败: ${result.err_msg}`)
      }

      return result.result[0]
    } catch (error) {
      console.error('语音识别错误:', error)
      throw error
    }
  }
} 