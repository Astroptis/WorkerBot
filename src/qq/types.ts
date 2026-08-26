// QQ Webhook 事件类型
export interface QQWebhookEvent {
  op: number;
  t: string;
  type?: string;
  id: string;
  d: {
    id: string;
    content: string;
    timestamp: string;
    author: {
      id: string;
      username?: string;
      user_openid?: string;
      member_openid?: string;
    };
    message_type?: number;
    msg_id?: string;
    group_openid?: string;
  };
  raw?: any;
}

// 消息内容
export interface QQMessageContent {
  content: string;
  msg_type: number;
  msg_id?: string;
}

// 发送消息响应
export interface QQSendMessageResponse {
  code: number;
  message: string;
  data: {
    message_id: string;
  };
}

// access_token 响应
export interface QQTokenResponse {
  code: number;
  message: string;
  data: {
    access_token: string;
    expires_in: number;
  };
}

// 消息发送参数
export interface SendMessageParams {
  receiver: { id: string; type: number };
  content: string;
  msg_type: number;
  msg_id?: string;
}
