export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details: any;

  constructor(message: string, statusCode = 400, details: any = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}