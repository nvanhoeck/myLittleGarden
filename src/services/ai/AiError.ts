export class AiError extends Error {
  public code: string;

  constructor(message: string, code = 'AI_ERROR') {
    super(message);
    this.name = 'AiError';
    this.code = code;
  }
}

export class AiNetworkError extends AiError {
  constructor(message: string) {
    super(message, 'AI_NETWORK_ERROR');
    this.name = 'AiNetworkError';
    this.code = 'AI_NETWORK_ERROR';
  }
}

export class AiTimeoutError extends AiError {
  constructor(message: string) {
    super(message, 'AI_TIMEOUT');
    this.name = 'AiTimeoutError';
    this.code = 'AI_TIMEOUT';
  }
}

export class AiInvalidResponseError extends AiError {
  constructor(message: string) {
    super(message, 'AI_INVALID_RESPONSE');
    this.name = 'AiInvalidResponseError';
    this.code = 'AI_INVALID_RESPONSE';
  }
}

export class AiServerDownError extends AiError {
  constructor(message: string) {
    super(message, 'AI_SERVER_DOWN');
    this.name = 'AiServerDownError';
    this.code = 'AI_SERVER_DOWN';
  }
}
