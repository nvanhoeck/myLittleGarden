export class AiError extends Error {
  public code: string;

  constructor(message: string, code = 'AI_ERROR') {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'AiError';
    this.code = code;
  }
}

export class AiNetworkError extends AiError {
  constructor(message: string) {
    super(message, 'AI_NETWORK_ERROR');
    this.name = 'AiNetworkError';
  }
}

export class AiTimeoutError extends AiError {
  constructor(message: string) {
    super(message, 'AI_TIMEOUT');
    this.name = 'AiTimeoutError';
  }
}

export class AiInvalidResponseError extends AiError {
  constructor(message: string) {
    super(message, 'AI_INVALID_RESPONSE');
    this.name = 'AiInvalidResponseError';
  }
}

export class AiServerDownError extends AiError {
  constructor(message: string) {
    super(message, 'AI_SERVER_DOWN');
    this.name = 'AiServerDownError';
  }
}