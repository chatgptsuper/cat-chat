declare module 'baidu-aip-sdk' {
  export const speech: {
    new (appId: string | number, apiKey: string, secretKey: string): {
      recognize(
        buffer: Buffer,
        format: string,
        rate: number,
        options?: {
          dev_pid?: number;
          [key: string]: any;
        }
      ): Promise<{
        err_no: number;
        err_msg: string;
        sn: string;
        result: string[];
      }>;
    };
  };
} 