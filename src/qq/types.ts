// QQ Webhook 事件类型
export interface QQWebhookEvent {
  id: string;
  type: string;
  timestamp: number;
  raw: {
    author: { member_openid: string; user_openid?: string };
    content: string;
    group_openid?: string;
    id: string;
    timestamp: string;
  };
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
