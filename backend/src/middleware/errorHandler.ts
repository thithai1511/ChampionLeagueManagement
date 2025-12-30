import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError";

/**
 * Check if error is an Azure SQL Database firewall error
 */
function isAzureFirewallError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  
  const err = error as Record<string, unknown>;
  
  // Check for ELOGIN code (Azure SQL authentication/firewall error)
  if (err.code === 'ELOGIN') {
    return true;
  }
  
  // Check error message for firewall-related keywords
  const message = String(err.message || '').toLowerCase();
  if (message.includes('firewall') || 
      message.includes('not allowed to access') ||
      message.includes('sp_set_firewall_rule')) {
    return true;
  }
  
  // Check originalError if present
  if (err.originalError && typeof err.originalError === 'object') {
    const origErr = err.originalError as Record<string, unknown>;
    if (origErr.code === 'ELOGIN') {
      return true;
    }
    const origMessage = String(origErr.message || '').toLowerCase();
    if (origMessage.includes('firewall') || 
        origMessage.includes('not allowed to access')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if error is a database connection error
 */
function isDatabaseConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  
  const err = error as Record<string, unknown>;
  
  // Check for connection error codes
  if (err.code === 'ETIMEOUT' || 
      err.code === 'ECONNRESET' || 
      err.code === 'ELOGIN' ||
      err.code === 'ESOCKET') {
    return true;
  }
  
  // Check error message
  const message = String(err.message || '').toLowerCase();
  if (message.includes('connection') || 
      message.includes('connect') ||
      message.includes('timeout') ||
      message.includes('database')) {
    return true;
  }
  
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: err.message,
      details: err.details ?? null,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation Error",
      details: err.flatten(),
    });
    return;
  }

  // Check for Azure SQL firewall error
  if (isAzureFirewallError(err)) {
    // eslint-disable-next-line no-console
    console.error("Azure SQL Database firewall error:", err);
    res.status(503).json({
      error: "Không thể kết nối đến cơ sở dữ liệu. Vui lòng kiểm tra cấu hình firewall của Azure SQL Database.",
      details: {
        type: "database_firewall_error",
        message: "IP address không được phép truy cập server. Vui lòng thêm IP vào Azure SQL firewall rules."
      },
    });
    return;
  }

  // Check for general database connection errors
  if (isDatabaseConnectionError(err)) {
    // eslint-disable-next-line no-console
    console.error("Database connection error:", err);
    res.status(503).json({
      error: "Không thể kết nối đến cơ sở dữ liệu. Vui lòng thử lại sau.",
      details: {
        type: "database_connection_error"
      },
    });
    return;
  }

  // Handle standard Error objects - return their message to frontend
  if (err instanceof Error) {
    // eslint-disable-next-line no-console
    console.error("Error:", err);
    // Use 400 for validation/business logic errors, 500 for unexpected errors
    const status = err.message.includes('Không thể') || 
                   err.message.includes('không hợp lệ') || 
                   err.message.includes('Thiếu') ||
                   err.message.includes('Yêu cầu') 
                   ? 400 : 500;
    res.status(status).json({
      error: err.message || "Lỗi máy chủ nội bộ",
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error("Unexpected error:", err);
  res.status(500).json({
    error: "Lỗi máy chủ nội bộ",
  });
}
